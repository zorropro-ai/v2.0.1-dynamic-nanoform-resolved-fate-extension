const assert=require('assert');
const D=require('./data.js');
const E=require('./engine.js');
const PI=require('./product_inventory.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);

const material='nano-TiO2';
const products=clone(D.MATERIAL_SCENARIOS[material].products);
const rows=products.map((p,i)=>PI.defaultRow(p,0));
rows.forEach(r=>{r.primary_quantity=0;r.market_growth_pct_y=0;r.content_change_pct_y=0;r.nano_enabled_change_pct_y=0;});
rows[0]={...rows[0],input_basis:'product_mass',primary_quantity:100000,enm_content_wt_pct:2,nano_enabled_pct:15,quantity_cv:0.1,content_cv:0.2,nano_enabled_cv:0.3};
rows[1]={...rows[1],input_basis:'unit_sales',primary_quantity:10000,conversion_factor:0.5,enm_content_wt_pct:1,nano_enabled_pct:20};
rows[2]={...rows[2],input_basis:'area_loading',primary_quantity:2000,conversion_factor:5,nano_enabled_pct:50};
rows[3]={...rows[3],input_basis:'volume_concentration',primary_quantity:1000,conversion_factor:2,nano_enabled_pct:25};
rows[4]={...rows[4],input_basis:'direct_enm',primary_quantity:7};
PI.loadState({input_mode:'product_inventory',rows},products,0);

const prep=PI.prepareStatic(products);
close(prep.by_product[products[0].product_category],300);
close(prep.by_product[products[1].product_category],10);
close(prep.by_product[products[2].product_category],5);
close(prep.by_product[products[3].product_category],0.5);
close(prep.by_product[products[4].product_category],7);
close(prep.total_kg_y,322.5);
close(prep.products.reduce((s,p)=>s+p.allocation_pct,0),100);
assert.deepStrictEqual(PI.validate(products),[]);

// Product-specific temporal changes are propagated independently.
const state=PI.getState();
state.rows[0].market_growth_pct_y=10;
state.rows[0].content_change_pct_y=5;
state.rows[0].nano_enabled_change_pct_y=2;
PI.loadState(state,products,0);
const tr=PI.buildTrajectory(products,2024,2026);
close(tr[0].product_inputs_kg_y[products[0].product_category],300);
close(tr[1].product_inputs_kg_y[products[0].product_category],300*1.10*1.05*1.02);
close(tr[2].product_inputs_kg_y[products[0].product_category],300*Math.pow(1.10*1.05*1.02,2));
tr.forEach(r=>close(r.primary_input_kg_y,Object.values(r.product_inputs_kg_y).reduce((a,b)=>a+b,0)));

const region=clone(D.REGION_DATA.find(r=>r.country_code==='KR'&&r.domain_level==='national'));
const env={river_flow_m3_s:100,soil_area_ha:100000,soil_depth_m:0.2,soil_bulk_density_kg_m3:1300,soil_residence_time_y:10,water_to_sediment_pct:20,sediment_area_km2:10,sediment_depth_m:0.05,sediment_bulk_density_kg_m3:1300,sediment_residence_time_y:10,air_mixing_height_m:1000,air_turnovers_y:365};
const eol=clone(D.MATERIAL_SCENARIOS[material].eol);
const factors=clone(D.PROCESS_FACTOR_LIBRARY[material]);
const sludge=clone(D.COUNTRY_SLUDGE_PRESETS.KR);
const lifetimes=clone(D.LIFETIME_DEFAULTS[material]);
const dynamicSettings={start_year:2024,end_year:2026,closed_loop_recycling_pct:20,recycling_delay_y:1,reuse_delay_y:1,initial_landfill_stock_kg:0};
assert.deepStrictEqual(E.validateInputs(prep.products,eol,factors,sludge,lifetimes,dynamicSettings),[]);
const result=E.runDynamicMFA({products:prep.products,eol,factors,sludge,lifetimes,trajectory:tr,dynamicSettings,region,env});
result.annual.forEach((r,i)=>{
  close(r.mass_balance_closure_pct,100,1e-8);
  close(r.primary_input_kg_y,tr[i].primary_input_kg_y);
  close(Object.values(r.product_primary_input_kg_y).reduce((a,b)=>a+b,0),r.primary_input_kg_y);
});

// Existing aggregate trajectory remains valid and unchanged in form.
const legacyTrajectory=tr.map(({year,primary_input_kg_y})=>({year,primary_input_kg_y}));
assert.deepStrictEqual(E.validateInputs(products,eol,factors,sludge,lifetimes,dynamicSettings),[]);
const legacy=E.runDynamicMFA({products,eol,factors,sludge,lifetimes,trajectory:legacyTrajectory,dynamicSettings,region,env});
legacy.annual.forEach(r=>close(r.mass_balance_closure_pct,100,1e-8));

// Product-specific uncertainty is reproducible with a fixed seed and remains non-negative.
const uncertainty=PI.uncertaintyRows(prep.by_product);
const s1=E.sampleProductInputUncertainty(uncertainty,E.mulberry32(77));
const s2=E.sampleProductInputUncertainty(uncertainty,E.mulberry32(77));
assert.deepStrictEqual(s1,s2);
Object.values(s1).forEach(v=>assert.ok(Number.isFinite(v)&&v>=0));
const mc=E.runStaticMonteCarlo({iterations:50,seed:77,rsd:0.25,baseArgs:{products:prep.products,eol,factors,sludge,region,env,total:prep.total_kg_y,product_input_uncertainty:uncertainty}});
assert.strictEqual(mc.input_uncertainty_mode,'product_specific');
assert.ok(mc.terminal.surface_water.P50>=0);
// Initializing product-informed mode from each bundled legacy scenario preserves its total and allocation.
for(const [mat,scenario] of Object.entries(D.MATERIAL_SCENARIOS)){
  const ps=clone(scenario.products),eo=clone(scenario.eol),fa=clone(D.PROCESS_FACTOR_LIBRARY[mat]),li=clone(D.LIFETIME_DEFAULTS[mat]);
  PI.initializeFromLegacy(ps,1000);const pp=PI.prepareStatic(ps);close(pp.total_kg_y,1000);pp.products.forEach((r,i)=>close(r.allocation_pct,ps[i].allocation_pct));
  const sr=E.runStaticMFA({products:pp.products,eol:eo,factors:fa,sludge,region,env,total:pp.total_kg_y});close(sr.mass_balance_closure_pct,100,1e-8);
  const tt=PI.buildTrajectory(ps,2024,2025),dr=E.runDynamicMFA({products:pp.products,eol:eo,factors:fa,sludge,lifetimes:li,trajectory:tt,dynamicSettings:{...dynamicSettings,start_year:2024,end_year:2025},region,env});
  dr.annual.forEach(r=>close(r.mass_balance_closure_pct,100,1e-8));
}
// Restore the configured test inventory for probabilistic checks.
PI.loadState(state,products,0);

const dmc=E.runDynamicMonteCarlo({iterations:30,seed:88,rsd:0.25,lifetimeRsd:0.2,growthSdPct:3,metrics:['primary_input_kg_y','pec.surface_water_pec_ug_L'],baseArgs:{products:prep.products,eol,factors,sludge,lifetimes,dynamicSettings,trajectory:tr,region,env,product_input_uncertainty:uncertainty}});
assert.strictEqual(dmc.input_uncertainty_mode,'product_specific');
assert.strictEqual(dmc.years.length,3);
assert.ok(dmc.metrics.primary_input_kg_y[1].P50>=0);

console.log('Product-informed static, dynamic, uncertainty, compatibility, and mass-balance tests passed.',{static_total_kg_y:prep.total_kg_y,final_dynamic_input_kg_y:tr.at(-1).primary_input_kg_y});
