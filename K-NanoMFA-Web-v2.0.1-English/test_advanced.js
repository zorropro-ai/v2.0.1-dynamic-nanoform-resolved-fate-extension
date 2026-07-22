const D=require('./data.js');
const E=require('./engine.js');
const material='AgNP',country='KR';
const sc=D.MATERIAL_SCENARIOS[material];
const region=D.REGION_DATA.find(r=>r.domain_id===D.COUNTRY_DOMAINS[country].national_domain_id);
const env={river_flow_m3_s:region.river_flow_m3_s_default,soil_area_ha:region.area_km2*100,soil_depth_m:.2,soil_bulk_density_kg_m3:1300,soil_residence_time_y:10,water_to_sediment_pct:20,sediment_area_km2:Math.max(region.area_km2*.001,.1),sediment_depth_m:.05,sediment_bulk_density_kg_m3:1300,sediment_residence_time_y:10,air_mixing_height_m:1000,air_turnovers_y:365};
const eol=sc.eol.map(r=>({...r,...D.COUNTRY_WASTE_PRESETS[country]}));
const sludge=D.COUNTRY_SLUDGE_PRESETS[country];
const settings={start_year:2020,end_year:2024,initial_input_kg_y:200,annual_growth_pct:3,closed_loop_recycling_pct:25,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
const rec=E.reconcileBalance([
 {name:'input',role:'inflow',model_value:100,model_cv:.1,observed_value:105,observed_cv:.05},
 {name:'out1',role:'outflow',model_value:60,model_cv:.2,observed_value:58,observed_cv:.1},
 {name:'stock',role:'stock_change',model_value:35,model_cv:.2,observed_value:40,observed_cv:.1}
]);
if(Math.abs(rec.balance_residual)>1e-8)throw Error('Reconciliation did not close.');
if(rec.rows.some(r=>r.reconciled_value<0))throw Error('Negative reconciled flow.');
const targets=[2020,2021,2022,2023,2024].map((year,i)=>({year,target_stock_kg:150*(i+1)}));
const sd=E.solveStockDrivenTrajectory({targetTrajectory:targets,products:sc.products,eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,lifetimes:D.LIFETIME_DEFAULTS[material],region,env,dynamicSettings:settings,maxIterations:18});
if(sd.trajectory.length!==targets.length)throw Error('Stock-driven trajectory length mismatch.');
if(Math.max(...sd.result.annual.map(r=>Math.abs(r.mass_balance_residual_kg)))>1e-4)throw Error('Stock-driven mass balance failed.');

const mc=E.runStockDrivenMonteCarlo({iterations:2,seed:7,rsd:.1,lifetimeRsd:.1,uncertaintyProfile:null,targetTrajectory:targets,metrics:['primary_input_kg_y','pec.surface_water_pec_ug_L'],baseArgs:{products:sc.products,eol,factors:D.PROCESS_FACTOR_LIBRARY[material],sludge,lifetimes:D.LIFETIME_DEFAULTS[material],region,env,dynamicSettings:settings,trajectory:E.buildTrajectory(settings)}});
if(mc.years.length!==targets.length||mc.metrics.primary_input_kg_y.length!==targets.length)throw Error('Stock-driven Monte Carlo failed.');

const rates={water_residence_time_days:30,substeps_per_year:12,air_advective_y:120,air_to_water_y:20,air_to_soil_y:30,air_transformation_y:.1,water_advective_y:12,water_to_sediment_y:8,water_to_soil_y:.2,water_transformation_y:.2,soil_to_water_y:.03,soil_to_sediment_y:.02,soil_to_air_y:.005,soil_burial_y:.03,soil_transformation_y:.05,sediment_to_water_y:.12,sediment_burial_y:.08,sediment_transformation_y:.03};
const fate=E.runMultimediaFateStatic({emissions:{air:1,water:2,soil:3,sediment:0},region,env,fate:rates,maxYears:1000});
if(!Object.values(fate.concentrations).every(Number.isFinite))throw Error('Static fate PEC invalid.');
if(Math.abs(fate.steady_state_balance_residual_kg_y)>0.05)throw Error(`Static fate balance residual too high ${fate.steady_state_balance_residual_kg_y}`);
const dynFate=E.runMultimediaFateDynamic({annualEmissions:[2020,2021,2022].map(year=>({year,air:1,water:2,soil:3,sediment:0})),region,env,fate:rates});
if(Math.max(...dynFate.annual.map(r=>Math.abs(r.cumulative_mass_balance_residual_kg)))>1e-8)throw Error('Dynamic fate mass balance failed.');
const stats=E.validationStatistics([{observed:1,predicted:1.1,cv:.2},{observed:2,predicted:1.8,cv:.2}]);
if(stats.n!==2||!Number.isFinite(stats.rmse))throw Error('Validation statistics failed.');
console.log('Advanced reconciliation, stock-driven MFA, multimedia fate, and validation tests passed.');
