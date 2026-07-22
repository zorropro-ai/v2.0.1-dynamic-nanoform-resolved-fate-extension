'use strict';
const assert=require('assert');
const D=require('./data.js');
const E=require('./engine.js');
const N=require('./nanoform.js');

const material='nano-TiO2';
const region=D.REGION_DATA.find(r=>r.domain_id==='KR-national');
const env={river_flow_m3_s:1000,soil_area_ha:100000,soil_depth_m:0.2,soil_bulk_density_kg_m3:1300,sediment_area_km2:100,sediment_depth_m:0.05,sediment_bulk_density_kg_m3:1300,air_mixing_height_m:500,air_turnovers_y:365,water_to_sediment_pct:20,soil_residence_time_y:10,sediment_residence_time_y:20};
const sludge=D.SLUDGE_DEFAULT;
const base={products:D.MATERIAL_SCENARIOS[material].products,eol:D.MATERIAL_SCENARIOS[material].eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,region,env};
const releaseForms=D.RELEASE_FORM_DEFAULTS[material];
const cfg=N.defaultState();cfg.enabled=true;

const staticResult=E.runStaticMFA({...base,total:1000});
const staticOut=N.compute(staticResult,{releaseForms,environment:env,region,material},cfg);
assert(staticOut);
assert(Math.abs(staticOut.state_balance_closure_pct-100)<1e-8,staticOut.state_balance_closure_pct);
assert(Math.abs(staticOut.total_state_mass_kg-staticResult.terminal_total)<1e-8);
for(const medium of ['air','surface_water','soil']){
  const stateMass=Object.values(staticOut.environmental.by_medium[medium]).reduce((a,b)=>a+b,0);
  assert(Math.abs(stateMass-staticOut.environmental.releases[medium])<1e-8);
}
assert(staticOut.pec.rows.length===4*N.STATE_KEYS.length);

const dynamicSettings={start_year:2024,end_year:2032,initial_input_kg_y:1000,annual_growth_pct:3,closed_loop_recycling_pct:50,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0};
const trajectory=E.buildTrajectory(dynamicSettings);
const dynamicResult=E.runDynamicMFA({...base,trajectory,lifetimes:D.LIFETIME_DEFAULTS[material],dynamicSettings});
const dynamicOut=N.compute(dynamicResult,{releaseForms,environment:env,region,material},cfg);
assert(dynamicOut);
assert(Math.abs(dynamicOut.state_balance_closure_pct-100)<1e-7,dynamicOut.state_balance_closure_pct);
assert(Math.abs(dynamicOut.total_state_mass_kg-dynamicResult.final.cumulative_accounted_input_kg)<1e-6);
assert(dynamicOut.annual.length===trajectory.length);

const disabled=N.defaultState();
assert.strictEqual(N.compute(staticResult,{releaseForms,environment:env,region,material},disabled),null);
const invalid=N.defaultState();invalid.enabled=true;invalid.product_state_pct.matrix_bound=70;
assert(N.validate(invalid).errors.length>0);

console.log(JSON.stringify({
  static_closure_pct:staticOut.state_balance_closure_pct,
  dynamic_closure_pct:dynamicOut.state_balance_closure_pct,
  static_state_mass_kg:staticOut.total_state_mass_kg,
  dynamic_state_mass_kg:dynamicOut.total_state_mass_kg,
  state_count:N.STATE_KEYS.length,
  status:'passed'
},null,2));
