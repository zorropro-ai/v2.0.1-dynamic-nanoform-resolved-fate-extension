'use strict';
const assert=require('assert');
const D=require('./data.js');
const E=require('./engine.js');
const N=require('./nanoform.js');
const F=require('./dynamic_fate.js');

const material='nano-TiO2';
const region=D.REGION_DATA.find(r=>r.domain_id==='KR-national');
const environment={river_flow_m3_s:1000,soil_area_ha:100000,soil_depth_m:0.2,soil_bulk_density_kg_m3:1300,sediment_area_km2:100,sediment_depth_m:0.05,sediment_bulk_density_kg_m3:1300,air_mixing_height_m:500,air_turnovers_y:365,water_to_sediment_pct:20,soil_residence_time_y:10,sediment_residence_time_y:20};
const base={products:D.MATERIAL_SCENARIOS[material].products,eol:D.MATERIAL_SCENARIOS[material].eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge:D.SLUDGE_DEFAULT,region,env:environment};
const dynamicSettings={start_year:2024,end_year:2028,initial_input_kg_y:1000,annual_growth_pct:3,closed_loop_recycling_pct:50,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0};
const trajectory=E.buildTrajectory(dynamicSettings);
const dynamicResult=E.runDynamicMFA({...base,trajectory,lifetimes:D.LIFETIME_DEFAULTS[material],dynamicSettings});
const nfCfg=N.defaultState();nfCfg.enabled=true;
const nfDynamic=N.compute(dynamicResult,{releaseForms:D.RELEASE_FORM_DEFAULTS[material],environment,region,material},nfCfg);
const context={environment,region,baseYear:2024,material};

// Exact linear solver must be independent of the legacy substep input.
const exact1=F.defaultState();exact1.enabled=true;exact1.numerical_solver='exact_linear';exact1.substeps_per_year=1;
const exact365=F.defaultState();exact365.enabled=true;exact365.numerical_solver='exact_linear';exact365.substeps_per_year=365;
const out1=F.compute(dynamicResult,nfDynamic,context,exact1);
const out365=F.compute(dynamicResult,nfDynamic,context,exact365);
assert(Math.abs(out1.final_stock_kg-out365.final_stock_kg)<1e-10);
assert(Math.abs(out1.final_concentrations.total.water-out365.final_concentrations.total.water)<1e-12);
assert(Math.abs(out1.mass_balance_closure_pct-100)<1e-8);

// Fine legacy integration should approach the exact solution.
const legacy=F.defaultState();legacy.enabled=true;legacy.numerical_solver='legacy_substep';legacy.substeps_per_year=365;
const outLegacy=F.compute(dynamicResult,nfDynamic,context,legacy);
const stockRel=Math.abs(outLegacy.final_stock_kg-out1.final_stock_kg)/out1.final_stock_kg;
const waterRel=Math.abs(outLegacy.final_concentrations.total.water-out1.final_concentrations.total.water)/Math.max(out1.final_concentrations.total.water,1e-30);
assert(stockRel<0.002,stockRel);
assert(waterRel<0.01,waterRel);

// Optional legacy refinement audit reports the doubled-substep comparison.
const auditCfg=F.defaultState();auditCfg.enabled=true;auditCfg.numerical_solver='legacy_substep';auditCfg.substeps_per_year=12;auditCfg.legacy_refinement_audit=true;
const audited=F.compute(dynamicResult,nfDynamic,context,auditCfg);
assert(audited.numerical_diagnostics.legacy_refinement);
assert.strictEqual(audited.numerical_diagnostics.legacy_refinement.refined_substeps,24);

// Matrix-bound dissolution in water is separately addressable.
const zeroRates=Object.fromEntries(Object.keys(F.defaultState().rates).map(k=>[k,0]));
zeroRates.water_matrix_dissolution_y=1;
const stocks={air:Object.fromEntries(F.FORMS.map(f=>[f,0])),water:Object.fromEntries(F.FORMS.map(f=>[f,f==='matrix_bound'?10:0])),soil:Object.fromEntries(F.FORMS.map(f=>[f,0])),sediment:Object.fromEntries(F.FORMS.map(f=>[f,0]))};
const emissions={air:Object.fromEntries(F.FORMS.map(f=>[f,0])),water:Object.fromEntries(F.FORMS.map(f=>[f,0])),soil:Object.fromEntries(F.FORMS.map(f=>[f,0])),sediment:Object.fromEntries(F.FORMS.map(f=>[f,0]))};
const step=F.exactLinearStep(stocks,emissions,zeroRates,1,1e-12);
assert(step.stocks.water.matrix_bound<10);
assert(step.stocks.water.dissolved>0);
assert(Math.abs(step.stocks.water.matrix_bound+step.stocks.water.dissolved-10)<1e-9);

// Static outputs separate annual steady-state sinks from spin-up cumulative sinks.
const staticResult=E.runStaticMFA({...base,total:1000});
const nfStatic=N.compute(staticResult,{releaseForms:D.RELEASE_FORM_DEFAULTS[material],environment,region,material},nfCfg);
const staticCfg=F.defaultState();staticCfg.enabled=true;staticCfg.max_static_years=350;staticCfg.convergence_tolerance=1e-6;
const staticOut=F.compute(staticResult,nfStatic,{...context,baseYear:2026},staticCfg);
assert(staticOut.steady_state_annual_external_sinks_kg);
assert(staticOut.spinup_cumulative_external_sinks_kg);
assert(Object.values(staticOut.spinup_cumulative_external_sinks_kg).reduce((a,b)=>a+b,0)>Object.values(staticOut.steady_state_annual_external_sinks_kg).reduce((a,b)=>a+b,0));

// Robust quoted CSV, units, source notes, and tracking basis.
const csv='year,compartment,form,mass,unit,tracking_basis,material,country_code,domain_id,source_note\n2024,water,free_particle,1000,g/y,constituent_element_equivalent,"nano-TiO2",KR,KR-national,"source, with comma"\n2025,surface water,dissolved,2000000,mg/y,constituent_element_equivalent,"nano-TiO2",KR,KR-national,"second source"';
const parsed=F.parseExternalCsvDetailed(csv,exact1);
assert.deepStrictEqual(parsed.errors,[]);
assert.strictEqual(parsed.rows.length,2);
assert(Math.abs(parsed.rows[0].mass_kg_y-1)<1e-12);
assert(Math.abs(parsed.rows[1].mass_kg_y-2)<1e-12);
assert.strictEqual(parsed.rows[0].source_note,'source, with comma');


// v2.0 scenario states without new fields load with compatible v2.0.1 defaults.
const oldState=F.defaultState();delete oldState.numerical_solver;delete oldState.solver_tolerance;delete oldState.tracking_basis;delete oldState.legacy_refinement_audit;delete oldState.rates.water_matrix_dissolution_y;
F.loadState(oldState);const migrated=F.getState();
assert.strictEqual(migrated.numerical_solver,'exact_linear');
assert.strictEqual(migrated.tracking_basis,'constituent_element_equivalent');
assert(Number.isFinite(migrated.rates.water_matrix_dissolution_y));

// Tracking basis is explicit in the output.
exact1.tracking_basis='constituent_element_equivalent';
const tracked=F.compute(dynamicResult,nfDynamic,context,exact1);
assert.strictEqual(tracked.tracking_basis,'constituent_element_equivalent');
assert(/Constituent-element/.test(tracked.tracking_basis_label));

console.log(JSON.stringify({
  exact_substep_independence_kg:Math.abs(out1.final_stock_kg-out365.final_stock_kg),
  legacy365_stock_relative_difference:stockRel,
  legacy365_water_PEC_relative_difference:waterRel,
  exact_closure_pct:out1.mass_balance_closure_pct,
  static_converged:staticOut.converged,
  static_iterations:staticOut.iterations_years,
  csv_rows:parsed.rows.length,
  status:'passed'
},null,2));
