'use strict';
const D=require('./data.js');
const E=require('./engine.js');
const clone=E.deepClone;
const region=D.REGION_DATA.find(r=>r.domain_id==='KR-national');
const env={river_flow_m3_s:500,soil_area_ha:100000,soil_depth_m:.2,soil_bulk_density_kg_m3:1300,soil_residence_time_y:10,water_to_sediment_pct:0,sediment_area_km2:100,sediment_depth_m:.05,sediment_bulk_density_kg_m3:1300,sediment_residence_time_y:10,air_mixing_height_m:1000,air_turnovers_y:365};
const sludge=clone(D.COUNTRY_SLUDGE_PRESETS.KR);
function base(material='nano-TiO2'){
  return {products:clone(D.MATERIAL_SCENARIOS[material].products),eol:clone(D.MATERIAL_SCENARIOS[material].eol),factors:clone(D.PROCESS_FACTOR_LIBRARY[material]),lifetimes:clone(D.LIFETIME_DEFAULTS[material]),sludge,region,env};
}
function close(a,b,tol=1e-9){return Math.abs(a-b)<=tol;}

// Regression 1: negative growth must reduce, not flatten, the trajectory.
const decline=E.buildTrajectory({start_year:2024,end_year:2027,initial_input_kg_y:100,annual_growth_pct:-10});
const expected=[100,90,81,72.9];
decline.forEach((r,i)=>{if(!close(r.primary_input_kg_y,expected[i],1e-10))throw new Error(`Negative-growth regression failed at ${r.year}: ${r.primary_input_kg_y}`);});
let threw=false;try{E.buildTrajectory({start_year:2024,end_year:2025,initial_input_kg_y:100,annual_growth_pct:-101});}catch(_){threw=true;}if(!threw)throw new Error('Growth below −100% was not rejected.');

// Regression 2: opening landfill stock is an opening balance, not unexplained new mass.
{
  const a=base();
  const trajectory=E.buildTrajectory({start_year:2024,end_year:2026,initial_input_kg_y:100,annual_growth_pct:0});
  const dynamicSettings={start_year:2024,end_year:2026,initial_input_kg_y:100,annual_growth_pct:0,closed_loop_recycling_pct:30,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:50,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
  const r=E.runDynamicMFA({...a,trajectory,dynamicSettings});
  if(!close(r.final.mass_balance_closure_pct,100,1e-7))throw new Error(`Opening-stock closure failed: ${r.final.mass_balance_closure_pct}`);
  if(!close(r.final.cumulative_accounted_input_kg,r.final.cumulative_primary_input_kg+50,1e-9))throw new Error('Opening stock was not included in accounted input.');
}

// Regression 3: a 100% reuse route must not lose matured reuse mass.
{
  const a=base();
  a.products=[{product_category:'Reusable product',allocation_pct:100,use_air_pct:0,use_direct_water_pct:0,use_wwtp_pct:0,use_soil_pct:0}];
  a.eol=[{product_category:'Reusable product',incineration_pct:0,landfill_pct:0,recycling_pct:0,reuse_pct:100,biological_treatment_pct:0}];
  a.lifetimes=[{product_category:'Reusable product',mean_lifetime_y:.2,weibull_shape:3,use_release_duration_y:1}];
  a.factors.reuse={extended_use_stock:100,air:0,surface_water:0,soil:0,WWTP:0};
  const trajectory=E.buildTrajectory({start_year:2024,end_year:2028,initial_input_kg_y:100,annual_growth_pct:0});
  const dynamicSettings={start_year:2024,end_year:2028,initial_input_kg_y:100,annual_growth_pct:0,closed_loop_recycling_pct:0,recycling_delay_y:1,reuse_delay_y:1,initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
  const r=E.runDynamicMFA({...a,trajectory,dynamicSettings});
  if(!close(r.final.mass_balance_closure_pct,100,1e-7))throw new Error(`100% reuse closure failed: ${r.final.mass_balance_closure_pct}`);
  if(!(r.final.reuse_stock_kg>0))throw new Error('Matured 100% reuse mass was not returned to reuse stock.');
}

// Regression 4: invalid imported percentages cannot bypass range validation.
{
  const a=base();
  a.products[0].allocation_pct=-10;
  a.products[1].allocation_pct+=10;
  const errors=E.validateInputs(a.products,a.eol,a.factors,a.sludge);
  if(!errors.some(e=>e.includes('allocation_pct')))throw new Error('Negative percentage was not rejected.');
}

// Regression 5: non-consecutive dynamic trajectories are rejected.
{
  const a=base();
  const trajectory=[{year:2024,primary_input_kg_y:100},{year:2026,primary_input_kg_y:100}];
  const ds={start_year:2024,end_year:2026,closed_loop_recycling_pct:0,recycling_delay_y:1,reuse_delay_y:1,initial_landfill_stock_kg:0};
  let ok=false;try{E.runDynamicMFA({...a,trajectory,dynamicSettings:ds});}catch(e){ok=e.message.includes('consecutive');}
  if(!ok)throw new Error('Non-consecutive trajectory was not rejected.');
}

console.log('v1.2.1 regression tests passed.');
