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
const nfCfg=N.defaultState();nfCfg.enabled=true;
const fateCfg=F.defaultState();fateCfg.enabled=true;fateCfg.max_static_years=300;fateCfg.convergence_tolerance=1e-6;

const staticResult=E.runStaticMFA({...base,total:1000});
const nfStatic=N.compute(staticResult,{releaseForms:D.RELEASE_FORM_DEFAULTS[material],environment,region,material},nfCfg);
const fateStatic=F.compute(staticResult,nfStatic,{environment,region,baseYear:2026,material},fateCfg);
assert(fateStatic);
assert(Math.abs(fateStatic.mass_balance_closure_pct-100)<1e-8,fateStatic.mass_balance_closure_pct);
assert(fateStatic.final_stock_kg>=0);
assert(fateStatic.final_concentrations.rows.length===F.COMPARTMENTS.length*F.FORMS.length);
assert(Object.keys(fateStatic.final_stocks_kg).length===4);

const dynamicSettings={start_year:2024,end_year:2032,initial_input_kg_y:1000,annual_growth_pct:3,closed_loop_recycling_pct:50,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0};
const trajectory=E.buildTrajectory(dynamicSettings);
const dynamicResult=E.runDynamicMFA({...base,trajectory,lifetimes:D.LIFETIME_DEFAULTS[material],dynamicSettings});
const nfDynamic=N.compute(dynamicResult,{releaseForms:D.RELEASE_FORM_DEFAULTS[material],environment,region,material},nfCfg);
const fateDynamic=F.compute(dynamicResult,nfDynamic,{environment,region,baseYear:2024,material},fateCfg);
assert(fateDynamic);
assert(fateDynamic.annual.length===trajectory.length);
assert(Math.abs(fateDynamic.mass_balance_closure_pct-100)<1e-8,fateDynamic.mass_balance_closure_pct);
for(const row of fateDynamic.annual)assert(Math.abs(row.mass_balance_closure_pct-100)<1e-8,row.mass_balance_closure_pct);

// Storm pulses are internal transfers and preserve total mass.
const stormCfg=F.defaultState();stormCfg.enabled=true;stormCfg.storm.enabled=true;stormCfg.storm.event_years='2026';stormCfg.storm.soil_to_water_pct=10;stormCfg.storm.soil_to_sediment_pct=5;stormCfg.storm.sediment_to_water_pct=3;
const fateStorm=F.compute(dynamicResult,nfDynamic,{environment,region,baseYear:2024,material},stormCfg);
assert(Math.abs(fateStorm.mass_balance_closure_pct-100)<1e-8);
assert(Object.keys(fateStorm.cumulative_process_fluxes_kg).some(k=>k.startsWith('storm_')));

// External coupling CSV parses and can replace the internal release inventory.
const csv='year,compartment,form,mass_kg_y\n2024,water,free_particle,10\n2024,soil,matrix_bound,5\n2025,water,dissolved,4';
const rows=F.parseExternalCsv(csv);assert(rows.length===3);
const externalCfg=F.defaultState();externalCfg.enabled=true;externalCfg.external_coupling.enabled=true;externalCfg.external_coupling.rows=rows;
const fateExternal=F.compute(dynamicResult,null,{environment,region,baseYear:2024,material},externalCfg);
assert(fateExternal.annual.length===2);
assert(Math.abs(fateExternal.mass_balance_closure_pct-100)<1e-8);

// Correlated uncertainty returns finite quantiles while retaining closure.
const uncCfg=F.defaultState();uncCfg.enabled=true;uncCfg.uncertainty.enabled=true;uncCfg.uncertainty.iterations=20;uncCfg.uncertainty.cv=0.2;uncCfg.max_static_years=100;
const unc=F.runUncertainty(dynamicResult,nfDynamic,{environment,region,baseYear:2024,material},uncCfg);
assert(unc.iterations===20);
assert(Number.isFinite(unc.summary.water.P50));
assert(Math.abs(unc.summary.closure.P50-100)<1e-7);

const disabled=F.defaultState();assert.strictEqual(F.compute(staticResult,nfStatic,{environment,region},disabled),null);
const invalid=F.defaultState();invalid.enabled=true;assert(F.validate(invalid,{enabled:false}).errors.length>0);

console.log(JSON.stringify({
  static_closure_pct:fateStatic.mass_balance_closure_pct,
  static_converged:fateStatic.converged,
  static_iterations:fateStatic.iterations_years,
  dynamic_closure_pct:fateDynamic.mass_balance_closure_pct,
  dynamic_years:fateDynamic.annual.length,
  final_stock_kg:fateDynamic.final_stock_kg,
  external_rows:rows.length,
  uncertainty_iterations:unc.iterations,
  status:'passed'
},null,2));
