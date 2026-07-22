const assert=require('assert');
const G=require('./geography.js');
const BaseData=require('./data.js');
const E=require('./engine.js');

function clone(x){return JSON.parse(JSON.stringify(x));}
const D={
  COUNTRY_DOMAINS:clone(BaseData.COUNTRY_DOMAINS),
  COUNTRY_WASTE_PRESETS:clone(BaseData.COUNTRY_WASTE_PRESETS),
  COUNTRY_SLUDGE_PRESETS:clone(BaseData.COUNTRY_SLUDGE_PRESETS),
  REGION_DATA:clone(BaseData.REGION_DATA)
};
global.localStorage={getItem:()=>null,setItem:()=>{}};
G.bootstrap(D);

const def=G.registerDefinition({
  code:'NZ',country_name:'New Zealand',short_name:'New Zealand',reference_year:2025,basis:'Test data',national_domain_id:'NZ-national',
  waste_preset:{incineration_pct:10,landfill_pct:20,recycling_pct:55,reuse_pct:5,biological_treatment_pct:10},
  sludge_preset:{incineration:20,landfill:10,soil_compost:55,fuel_product_feedstock:10,other_unclassified:5},
  domains:[
    {domain_id:'NZ-national',region:'New Zealand (national)',domain_level:'national',population:5200000,area_km2:268000,sewer_population:4500000,wwtp_flow_m3_y:600000000,sludge_dry_t_y:120000,river_flow_m3_s_default:1000,data_quality:'user_defined'},
    {domain_id:'NZ-test-region',region:'Test region',domain_level:'subnational',population:1300000,area_km2:67000,sewer_population:1125000,wwtp_flow_m3_y:150000000,sludge_dry_t_y:30000,river_flow_m3_s_default:250,data_quality:'user_defined'}
  ]
});
assert.equal(def.code,'NZ');
assert.equal(D.COUNTRY_DOMAINS.NZ.country_name,'New Zealand');
assert.equal(D.REGION_DATA.filter(r=>r.country_code==='NZ').length,2);
assert.equal(G.getDefinition('nz').national_domain_id,'NZ-national');
assert.throws(()=>G.registerDefinition({...def,code:'KR'}),/reserved/);
assert.throws(()=>G.normalizeDefinition({...def,waste_preset:{...def.waste_preset,recycling_pct:20}}),/totals/);

function envFor(region){
  return {
    river_flow_m3_s:region.river_flow_m3_s_default,
    soil_area_ha:region.area_km2*100,
    soil_depth_m:.2,
    soil_bulk_density_kg_m3:1300,
    soil_residence_time_y:10,
    water_to_sediment_pct:20,
    sediment_area_km2:Math.max(region.area_km2*.001,.1),
    sediment_depth_m:.05,
    sediment_bulk_density_kg_m3:1300,
    sediment_residence_time_y:10,
    air_mixing_height_m:1000,
    air_turnovers_y:365
  };
}
const material='nano-TiO2';
const sc=BaseData.MATERIAL_SCENARIOS[material];
const factors=BaseData.PROCESS_FACTOR_LIBRARY[material];
const lifetimes=BaseData.LIFETIME_DEFAULTS[material];
const eol=sc.eol.map(r=>({...r,...def.waste_preset}));
for(const region of def.domains){
  const staticResult=E.runStaticMFA({total:1000,products:sc.products,eol,factors,sludge:def.sludge_preset,region,env:envFor(region)});
  assert(Math.abs(staticResult.mass_balance_residual)<1e-6,`${region.domain_id}: static residual`);
  assert(Number.isFinite(staticResult.pec.surface_water_pec_ug_L),`${region.domain_id}: static PEC`);

  const dynamicSettings={start_year:2020,end_year:2030,initial_input_kg_y:200,annual_growth_pct:3,closed_loop_recycling_pct:25,recycling_delay_y:1,reuse_delay_y:2,initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0};
  const dynamicResult=E.runDynamicMFA({trajectory:E.buildTrajectory(dynamicSettings),products:sc.products,eol,factors,sludge:def.sludge_preset,lifetimes,region,env:envFor(region),dynamicSettings});
  assert(Math.max(...dynamicResult.annual.map(r=>Math.abs(r.mass_balance_residual_kg)))<1e-5,`${region.domain_id}: dynamic residual`);
  assert(Number.isFinite(dynamicResult.final.pec.surface_water_pec_ug_L),`${region.domain_id}: dynamic PEC`);
}

G.removeDefinition('NZ');
assert.equal(D.COUNTRY_DOMAINS.NZ,undefined);
assert.equal(D.REGION_DATA.filter(r=>r.country_code==='NZ').length,0);
console.log('Custom-geography registry, validation, static MFA, dynamic MFA, mass-balance and PEC tests passed.');
