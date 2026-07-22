const D=require('./data.js');
const E=require('./engine.js');
if(Object.keys(D.MATERIAL_SCENARIOS).length!==10) throw new Error('Expected 10 nanomaterials.');
if(Object.keys(D.COUNTRY_DOMAINS).length!==10) throw new Error('Expected 10 country domains.');
const settings={start_year:2020,end_year:2030,initial_input_kg_y:200,annual_growth_pct:3,closed_loop_recycling_pct:25,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
for(const [code,country] of Object.entries(D.COUNTRY_DOMAINS)){
 const region=D.REGION_DATA.find(r=>r.domain_id===country.national_domain_id);
 if(!region) throw Error(`Missing national domain ${code}`);
 const env={river_flow_m3_s:region.river_flow_m3_s_default,soil_area_ha:region.area_km2*100,soil_depth_m:.2,soil_bulk_density_kg_m3:1300,soil_residence_time_y:10,water_to_sediment_pct:20,sediment_area_km2:Math.max(region.area_km2*.001,.1),sediment_depth_m:.05,sediment_bulk_density_kg_m3:1300,sediment_residence_time_y:10,air_mixing_height_m:1000,air_turnovers_y:365};
 const sludge=D.COUNTRY_SLUDGE_PRESETS[code];
 for(const material of Object.keys(D.MATERIAL_SCENARIOS)){
  const sc=D.MATERIAL_SCENARIOS[material];
  const eol=sc.eol.map(r=>({...r,...D.COUNTRY_WASTE_PRESETS[code]}));
  const st=E.runStaticMFA({total:1000,products:sc.products,eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,region,env});
  if(Math.abs(st.mass_balance_residual)>1e-6)throw Error(`${code}/${material} static residual ${st.mass_balance_residual}`);
  for(const k of ['air_pec_ng_m3','surface_water_pec_ug_L','soil_pec_ug_kg','active_sediment_pec_ug_kg'])if(!Number.isFinite(st.pec[k]))throw Error(`${code}/${material} static PEC ${k}`);
  const trajectory=E.buildTrajectory(settings);
  const dy=E.runDynamicMFA({trajectory,products:sc.products,eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,lifetimes:D.LIFETIME_DEFAULTS[material],region,env,dynamicSettings:settings});
  const maxRes=Math.max(...dy.annual.map(r=>Math.abs(r.mass_balance_residual_kg)));
  if(maxRes>1e-5)throw Error(`${code}/${material} dynamic residual ${maxRes}`);
 }
 console.log(code,country.country_name,'OK');
}
console.log('All country-domain, material, mass-balance and PEC tests passed.');
