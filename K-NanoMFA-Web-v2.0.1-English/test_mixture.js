'use strict';
const D=require('./data.js');
const E=require('./engine.js');
const region=D.REGION_DATA.find(r=>r.country_code==='KR'&&r.domain_level==='national');
const env={river_flow_m3_s:region.river_flow_m3_s_default,soil_area_ha:region.area_km2*100,soil_depth_m:.2,soil_bulk_density_kg_m3:1300,soil_residence_time_y:10,water_to_sediment_pct:20,sediment_area_km2:Math.max(.1,region.area_km2*.001),sediment_depth_m:.05,sediment_bulk_density_kg_m3:1300,sediment_residence_time_y:10,air_mixing_height_m:1000,air_turnovers_y:365};
const sludge=D.COUNTRY_SLUDGE_PRESETS.KR;
function args(material){return {products:D.MATERIAL_SCENARIOS[material].products,eol:D.MATERIAL_SCENARIOS[material].eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,lifetimes:D.LIFETIME_DEFAULTS[material],region,env};}
const ag=E.runStaticMFA({...args('AgNP'),total:100});
const tio=E.runStaticMFA({...args('nano-TiO2'),total:200});
if(Math.abs(ag.mass_balance_closure_pct-100)>1e-7||Math.abs(tio.mass_balance_closure_pct-100)>1e-7)throw new Error('Static component closure failed.');
const totalWater=ag.pec.surface_water_pec_ug_L+tio.pec.surface_water_pec_ug_L;
const hi=ag.pec.surface_water_pec_ug_L/0.01+tio.pec.surface_water_pec_ug_L/0.1;
if(!(totalWater>0&&hi>0))throw new Error('Co-occurrence or HI failed.');
const form={products:[{product_category:'Ag–TiO2 coating',allocation_pct:100,use_air_pct:.2,use_direct_water_pct:1,use_wwtp_pct:10,use_soil_pct:.1}],eol:[{product_category:'Ag–TiO2 coating',incineration_pct:30,landfill_pct:20,recycling_pct:45,reuse_pct:5,biological_treatment_pct:0}],lifetimes:[{product_category:'Ag–TiO2 coating',mean_lifetime_y:8,weibull_shape:2.5,use_release_duration_y:8}]};
const f1=E.runStaticMFA({...args('AgNP'),...form,total:30});
const f2=E.runStaticMFA({...args('nano-TiO2'),...form,total:70});
if(Math.abs(f1.mass_balance_closure_pct-100)>1e-7||Math.abs(f2.mass_balance_closure_pct-100)>1e-7)throw new Error('Formulation closure failed.');
const ds={start_year:2024,end_year:2030,closed_loop_recycling_pct:50,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
const tr1=E.buildTrajectory({start_year:2024,end_year:2030,initial_input_kg_y:100,annual_growth_pct:3});
const tr2=E.buildTrajectory({start_year:2024,end_year:2030,initial_input_kg_y:200,annual_growth_pct:1});
const d1=E.runDynamicMFA({...args('AgNP'),trajectory:tr1,dynamicSettings:ds});
const d2=E.runDynamicMFA({...args('nano-TiO2'),trajectory:tr2,dynamicSettings:ds});
if(Math.abs(d1.final.mass_balance_closure_pct-100)>1e-6||Math.abs(d2.final.mass_balance_closure_pct-100)>1e-6)throw new Error('Dynamic component closure failed.');
const rng=E.mulberry32(42),profile={market_input:.2,country_domain:.1,environment_capacity:.2,product_allocation:.2,use_release:.3,eol_routes:.2,treatment_factors:.25,lifetimes:.2,circularity:.2};
const samples=[];
for(let i=0;i<100;i++){
 const geo=E.sampleRegionAndEnvironment(region,env,rng,profile.country_domain,profile.environment_capacity);
 const a=E.sampleScenario({...args('AgNP'),rng,rsd:.2,uncertaintyProfile:profile});
 const t=E.sampleScenario({...args('nano-TiO2'),rng,rsd:.2,uncertaintyProfile:profile});
 const ra=E.runStaticMFA({...args('AgNP'),...a,...geo,total:100*E.lognormalMultiplier(rng,.2)});
 const rt=E.runStaticMFA({...args('nano-TiO2'),...t,...geo,total:200*E.lognormalMultiplier(rng,.2)});
 const pnecAg=.01*E.lognormalMultiplier(rng,.3),pnecTi=.1*E.lognormalMultiplier(rng,.3);
 samples.push(ra.pec.surface_water_pec_ug_L/pnecAg+rt.pec.surface_water_pec_ug_L/pnecTi);
}
const s=E.summarizeSamples(samples);if(!(s.P5<=s.P50&&s.P50<=s.P95))throw new Error('Joint uncertainty quantiles failed.');
console.log('Multi-material deterministic, formulation, dynamic, and joint uncertainty tests passed.',{totalWater,hi,P50:s.P50});
