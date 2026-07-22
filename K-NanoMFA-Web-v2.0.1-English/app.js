(function(){
'use strict';

const D=window.KNanoData;
const E=window.KNanoEngine;
const PI=window.KNanoProductInventory;
const $=id=>document.getElementById(id);
const deepClone=E.deepClone;
const APP_INFO=Object.freeze({
  name:'K-NanoMFA',version:'2.0.1-en',initial_release_date:'2026-07-17',current_release_date:'2026-07-22',
  copyright_holder:'Younghun Kim',developer:'Prof. Younghun Kim',affiliation:'Kwangwoon University',
  contact:'korea1@kw.ac.kr',license:'MIT',use_classification:'Research screening tool',
  disclaimer:'Outputs require independent verification. The software is provided as-is, without warranty, and liability is limited to the maximum extent permitted by applicable law.'
});

const PROCESS_LABELS={
  WWTP:'Wastewater treatment plant (WWTP)',
  incineration:'Waste incineration plant',
  landfill:'Landfill',
  recycling:'Recycling',
  reuse:'Reuse',
  biological_treatment:'Biological treatment'
};
const OUTPUT_LABELS={
  effluent:'Effluent',sludge:'Sludge',transformation_non_nano:'Transformation / non-nano form',
  air:'Air',fly_ash_to_landfill:'Fly ash to landfill',bottom_ash_recovery:'Bottom ash recovery',
  thermal_transformation_loss:'Thermal transformation / loss',landfill_stock:'Retained landfill stock',
  leachate_to_surface_water:'Leachate to surface water',runoff_to_surface_water:'Runoff to surface water',
  fugitive_dust_to_air:'Fugitive dust to air',transformation:'Transformation',recovered_product:'Recovered product',
  wastewater_to_wwtp:'Wastewater to WWTP',residue_to_incineration:'Residue to incineration',
  residue_to_landfill:'Residue to landfill',extended_use_stock:'Extended-use stock',surface_water:'Surface water',
  soil:'Soil',soil_compost:'Soil / compost',biodegradation_transformation:'Biodegradation / transformation',
  fuel_product_feedstock:'Fuel / product feedstock',other_unclassified:'Other / unclassified'
};
const TERMINAL_LABELS={
  air:'Air',surface_water:'Surface water',soil:'Soil',recovery_resource:'Recovery and resource utilization',
  reuse_product_stock:'Reuse and product stock',landfill_stock:'Landfill stock',
  transformation_loss:'Transformation / loss',other_unclassified:'Other / unclassified'
};
const PEC_NAMES={
  wwtp_effluent_concentration_ug_L:['WWTP effluent concentration','µg/L'],
  sewage_sludge_concentration_ug_kg_dry:['Sewage-sludge concentration','µg/kg dry'],
  air_pec_ng_m3:['Air PEC','ng/m³'],
  surface_water_pec_ug_L:['Surface-water PEC','µg/L'],
  soil_pec_ug_kg:['Soil PEC','µg/kg dry'],
  active_sediment_pec_ug_kg:['Active-sediment PEC','µg/kg dry'],
  annual_soil_increment_ug_kg:['Annual soil concentration increment','µg/kg·y'],
  annual_active_sediment_increment_ug_kg:['Annual active-sediment increment','µg/kg·y']
};
const ENV_LABELS={
  river_flow_m3_s:'Receiving-water flow (m³/s)',
  soil_area_ha:'Receiving soil area (ha)',
  soil_depth_m:'Soil mixing depth (m)',
  soil_bulk_density_kg_m3:'Soil bulk density (kg/m³)',
  soil_residence_time_y:'Soil residence time (y)',
  water_to_sediment_pct:'Water-to-active-sediment transfer (%)',
  sediment_area_km2:'Active sediment area (km²)',
  sediment_depth_m:'Active sediment depth (m)',
  sediment_bulk_density_kg_m3:'Sediment bulk density (kg/m³)',
  sediment_residence_time_y:'Active-sediment residence time (y)',
  air_mixing_height_m:'Atmospheric mixing height (m)',
  air_turnovers_y:'Effective annual air exchanges'
};
const INPUT_BASIS_LABELS={
  direct_region:'Direct selected-region input',
  national_population:'National input × population share',
  national_sewer_population:'National input × sewered-population share',
  national_wwtp_flow:'National input × wastewater-flow share'
};
const DYNAMIC_METRICS={
  primary_input_kg_y:'Primary regional market input',secondary_input_kg_y:'Recycled secondary input',
  use_release_kg_y:'Use-stage release',eol_generation_kg_y:'End-of-life generation',
  air_release_kg_y:'Air release',surface_water_release_kg_y:'Surface-water release',soil_release_kg_y:'Soil release',
  in_use_stock_kg:'In-use product stock',reuse_stock_kg:'Reuse stock',landfill_stock_kg:'Landfill stock',
  'pec.air_pec_ng_m3':'Air PEC','pec.surface_water_pec_ug_L':'Surface-water PEC',
  'pec.soil_pec_ug_kg':'Soil PEC','pec.active_sediment_pec_ug_kg':'Active-sediment PEC',
  'pec.wwtp_effluent_concentration_ug_L':'WWTP effluent concentration',
  'pec.sewage_sludge_concentration_ug_kg_dry':'Sewage-sludge concentration',
  mass_balance_closure_pct:'Mass-balance closure'
};
const DYNAMIC_PEC_KEYS=[
  'air_pec_ng_m3','surface_water_pec_ug_L','soil_pec_ug_kg','active_sediment_pec_ug_kg',
  'wwtp_effluent_concentration_ug_L','sewage_sludge_concentration_ug_kg_dry'
];

const CUSTOM_MATERIAL_KEY='__CUSTOM__';
const CUSTOM_FATE_PRESETS=['Persistent carbonaceous','Persistent mineral oxide','Dissolving metal / oxide','Biodegradable nanomaterial'];
const CUSTOM_TEMPLATE_FATE={'CNT':'Persistent carbonaceous','Carbon black':'Persistent carbonaceous','Graphene':'Persistent carbonaceous','Fullerenes':'Persistent carbonaceous','AgNP':'Dissolving metal / oxide','nano-ZnO':'Dissolving metal / oxide','nano-TiO2':'Persistent mineral oxide','nano-SiO2':'Persistent mineral oxide','Nanoclay':'Persistent mineral oxide','Nanocellulose':'Biodegradable nanomaterial'};
function defaultCustomMaterial(){return {name:'Custom nanomaterial',description:'User-defined nanomaterial scenario. Initialize from the closest bundled material, then replace all relevant product, release, treatment, lifetime, fate, and evidence assumptions.',template:'nano-TiO2',fate_preset:'Persistent mineral oxide',benchmark_proxy:'none',evidence:'E',source:'User-defined screening scenario',url:'',note:'No bundled material-specific evidence is assumed. Replace screening priors with project-specific data where available.',definition:null};}

const QUALITY_DEFAULTS=[
  {key:'market_input',group:'Market input and production trajectory',source_note:'User input or external market estimate',reliability:2,geography:2,temporal:2,technology:3,completeness:2,cv:0.40},
  {key:'product_market_quantity',group:'Product-market quantity or unit-sales data',source_note:'Product inventory, sales statistics, or user input',reliability:2,geography:2,temporal:2,technology:3,completeness:2,cv:0.35},
  {key:'product_enm_content',group:'Nanomaterial content in products',source_note:'Product specification, measurement, literature, or proxy',reliability:2,geography:2,temporal:2,technology:2,completeness:2,cv:0.35},
  {key:'nano_enabled_fraction',group:'Nano-enabled fraction of the product market',source_note:'Market survey or scenario assumption',reliability:1,geography:2,temporal:2,technology:2,completeness:1,cv:0.50},
  {key:'product_allocation',group:'Allocation to product categories',source_note:'Literature-informed screening prior',reliability:2,geography:2,temporal:2,technology:3,completeness:2,cv:0.35},
  {key:'use_release',group:'Use-stage release factors',source_note:'Product-category screening prior',reliability:2,geography:2,temporal:2,technology:2,completeness:2,cv:0.50},
  {key:'eol_routes',group:'End-of-life routing shares',source_note:'Country waste preset or user input',reliability:3,geography:3,temporal:3,technology:3,completeness:3,cv:0.25},
  {key:'treatment_factors',group:'Treatment transfer coefficients',source_note:'Literature-informed process prior',reliability:2,geography:2,temporal:2,technology:2,completeness:2,cv:0.40},
  {key:'circularity',group:'Recycling, reuse and circular delays',source_note:'Scenario assumption',reliability:2,geography:2,temporal:2,technology:2,completeness:2,cv:0.40},
  {key:'lifetimes',group:'Product lifetimes and Weibull shape',source_note:'Product-class lifetime prior',reliability:3,geography:2,temporal:3,technology:3,completeness:3,cv:0.25},
  {key:'country_domain',group:'Country wastewater and sludge domain',source_note:'Official statistics or harmonised screening estimate',reliability:3,geography:3,temporal:3,technology:3,completeness:3,cv:0.20},
  {key:'environment_capacity',group:'Receiving-environment capacity and residence time',source_note:'Regional screening assumptions',reliability:2,geography:2,temporal:2,technology:2,completeness:2,cv:0.45}
];
const RELEASE_FORM_LABELS={free_nanoform_pct:'Free or aggregated nanoform',matrix_associated_pct:'Matrix-associated particulate form',transformed_dissolved_pct:'Transformed or dissolved form',unknown_pct:'Unknown form'};
const MEDIUM_LABELS={air:'Air',surface_water:'Surface water',soil:'Soil'};
const SENSITIVITY_METRICS={
  'pec.surface_water_pec_ug_L':['Surface-water PEC','µg/L'],
  'pec.soil_pec_ug_kg':['Soil PEC','µg/kg dry'],
  'pec.active_sediment_pec_ug_kg':['Active-sediment PEC','µg/kg dry'],
  'pec.air_pec_ng_m3':['Air PEC','ng/m³'],
  'release.surface_water':['Surface-water release','kg/y'],
  'release.air':['Air release','kg/y'],
  'release.soil':['Soil release','kg/y']
};
const COMPARISON_METRICS={
  effective_input:['Effective domain input','kg/y'],air_release:['Air release','kg/y'],surface_water_release:['Surface-water release','kg/y'],soil_release:['Soil release','kg/y'],
  surface_water_pec:['Surface-water PEC','µg/L'],soil_pec:['Soil PEC','µg/kg dry'],sediment_pec:['Active-sediment PEC','µg/kg dry'],air_pec:['Air PEC','ng/m³']
};

const WORKSPACE_STAGES={
  study:{title:'Study & material',description:'Define the model, material, geography, and multi-material project.',tabs:['model','mixture']},
  lifecycle:{title:'Product inventory, waste & environment',description:'Edit product-market inputs, contents, releases, lifetimes, treatment, sludge, geography, and PEC settings.',tabs:['lifecycle','treatment','environment']},
  evidence:{title:'Evidence & uncertainty',description:'Review provenance, data quality, nanoform reporting, uncertainty, sensitivity, and benchmarks.',tabs:['quality','uncertainty']},
  results:{title:'Results & compare',description:'Inspect flows, stocks, PECs, stored comparison runs, and reproducible exports.',tabs:['results']},
  expert:{title:'Expert & reference',description:'Use trade, stock-driven inversion, reconciliation, calibration, fate, validation, burden, and method notes.',tabs:['advanced','method']}
};
let interfaceView='guided';
let activeStage='study';
const lastTabByStage={study:'model',lifecycle:'lifecycle',evidence:'quality',results:'results',expert:'advanced'};
function stageForTab(name){return Object.keys(WORKSPACE_STAGES).find(k=>WORKSPACE_STAGES[k].tabs.includes(name))||'study';}

const EVIDENCE_CLASS_LABELS={A:'Official national or subnational statistic',B:'Directly applicable peer-reviewed evidence',C:'Peer-reviewed proxy or cross-context evidence',D:'Harmonised regional screening proxy',E:'Expert screening assumption'};
const MATERIAL_PROVENANCE={
  CNT:{evidence:'B',source:'Gottschalk et al. (2009); Sun et al. (2014, 2016)',url:'https://doi.org/10.1021/es9015553',note:'Product-use and release architecture informed by published probabilistic ENM MFA; bundled numerical shares remain editable screening priors.'},
  'Carbon black':{evidence:'E',source:'Expert screening scenario',url:'SOURCES.md',note:'Application categories are representative, but nano-specific national flow factors are not calibrated.'},
  Graphene:{evidence:'B',source:'Hong et al. (2022) and 2024 correction',url:'https://doi.org/10.1021/acs.est.2c04002',note:'Product categories, long lifetimes, incineration, landfill, and environmental-release structure are informed by the European dynamic GBM MFA.'},
  Fullerenes:{evidence:'B',source:'Gottschalk et al. (2009); Sun et al. (2014, 2016)',url:'https://doi.org/10.1021/es9015553',note:'Life-cycle architecture is literature informed; bundled category shares are screening priors.'},
  AgNP:{evidence:'B',source:'Gottschalk et al. (2009); Sun et al. (2014, 2016)',url:'https://doi.org/10.1021/es9015553',note:'Down-the-drain use and WWTP routing are directly relevant; national product shares remain uncertain.'},
  'nano-TiO2':{evidence:'B',source:'Gottschalk et al. (2009); Sun et al. (2014, 2016)',url:'https://doi.org/10.1021/es9015553',note:'Cosmetics, coatings, and WWTP pathways are directly relevant; country-specific market shares are not calibrated.'},
  'nano-ZnO':{evidence:'B',source:'Gottschalk et al. (2009); Sun et al. (2014, 2016)',url:'https://doi.org/10.1021/es9015553',note:'Cosmetics, rubber, coatings, and dissolution-sensitive pathways are literature informed.'},
  Nanocellulose:{evidence:'C',source:'Cross-product literature and expert screening assumptions',url:'SOURCES.md',note:'Application categories are plausible, but harmonised nano-specific release and EoL datasets remain limited.'},
  'nano-SiO2':{evidence:'B',source:'Wang and Nowack (2018)',url:'https://doi.org/10.1016/j.envpol.2018.01.004',note:'Dynamic nano-SiO₂ application and waste-system structure is directly relevant; Korean and other national shares remain proxies.'},
  Nanoclay:{evidence:'E',source:'Expert screening scenario',url:'SOURCES.md',note:'Product categories and treatment factors require project-specific replacement where data are available.'}
};
const BENCHMARK_LIBRARY=[
  {id:'gottschalk-sw',materials:['CNT','AgNP','nano-TiO2','nano-ZnO','Fullerenes'],metric:'surface_water_pec_ug_L',name:'Regional modeled surface-water PEC envelope',min:0.000003,max:0.021,unit:'µg/L',domain:'United States, Europe, and Switzerland; probabilistic modes',evidence:'B',source:'Gottschalk et al. (2009)',url:'https://doi.org/10.1021/es9015553',note:'Multi-material envelope; use for order-of-magnitude screening, not material-specific calibration.'},
  {id:'gottschalk-eff',materials:['CNT','AgNP','nano-TiO2','nano-ZnO','Fullerenes'],metric:'wwtp_effluent_concentration_ug_L',name:'Modeled WWTP-effluent concentration envelope',min:0.004,max:4,unit:'µg/L',domain:'United States and Europe; probabilistic modes',evidence:'B',source:'Gottschalk et al. (2009)',url:'https://doi.org/10.1021/es9015553',note:'Multi-material envelope from fullerene to nano-TiO₂.'},
  {id:'gottschalk-soil',materials:['CNT','AgNP','nano-TiO2','nano-ZnO','Fullerenes'],metric:'annual_soil_increment_ug_kg',name:'Annual increment in sludge-treated soil',min:0.001,max:89,unit:'µg/kg·y',domain:'Europe and United States',evidence:'B',source:'Gottschalk et al. (2009)',url:'https://doi.org/10.1021/es9015553',note:'Compare only when the selected soil pathway reasonably represents sludge-treated soil.'},
  {id:'usgs-tio2',materials:['nano-TiO2'],metric:'wwtp_effluent_concentration_ug_L',name:'Measured TiO₂ engineered-particle concentration in WWTP effluent',min:7,max:30,unit:'µg/L',country:'US',evidence:'B',source:'Nabi et al. (2021), five U.S. WWTPs',url:'https://doi.org/10.1016/j.scitotenv.2020.142017',note:'Measured engineered-particle estimate; includes nanosized and pigment-sized TiO₂ fractions and is not identical to a pristine nano-TiO₂ mass basis.'},
  {id:'usgs-ag',materials:['AgNP'],metric:'wwtp_effluent_concentration_ug_L',name:'Measured Ag engineered-particle concentration in WWTP effluent',min:0.01,max:0.04,unit:'µg/L',country:'US',evidence:'B',source:'Nabi et al. (2021), five U.S. WWTPs',url:'https://doi.org/10.1016/j.scitotenv.2020.142017',note:'Reported as total Ag concentration associated with engineered-particle assessment; nanoform comparability is imperfect.'},
  {id:'graphene-water',materials:['Graphene'],metric:'surface_water_pec_ug_L',name:'Projected European 2030 surface-water concentration',target:0.0014,unit:'µg/L',year:2030,evidence:'B',source:'Hong et al. (2022)',url:'https://doi.org/10.1021/acs.est.2c04002',note:'European multi-country dynamic boundary; compare by order of magnitude unless the model boundary is aligned.'},
  {id:'graphene-soil',materials:['Graphene'],metric:'soil_pec_ug_kg',name:'Projected European 2030 sludge-treated-soil concentration',target:20,unit:'µg/kg dry',year:2030,evidence:'B',source:'Hong et al. (2022)',url:'https://doi.org/10.1021/acs.est.2c04002',note:'The published compartment is sludge-treated soil; the app soil PEC may use a broader receiving-soil definition.'}
];


let state={
  mode:'static_deterministic',
  material:Object.keys(D.MATERIAL_SCENARIOS)[0],
  geography:{input_basis:'national_population',apply_country_waste_preset:true},
  products:[],eol:[],factors:{},sludge:{},lifetimes:[],environment:{},trajectory:[],
  dynamicSettings:{
    start_year:2015,end_year:2035,initial_input_kg_y:500,annual_growth_pct:5,
    closed_loop_recycling_pct:30,recycling_delay_y:1,reuse_delay_y:3,
    initial_landfill_stock_kg:0,initial_soil_media_stock_kg:0,initial_sediment_media_stock_kg:0
  },
  metadata:{study_title:'K-NanoMFA screening assessment',analyst:'',purpose:'Screening exposure assessment',tracking_basis:'Mass of selected nanoform entering the technosphere',system_boundary:'Market input through use, EoL, treatment and environmental release',accounting_principle:'Consumption-based market input',notes:''},
  qualityProfile:deepClone(QUALITY_DEFAULTS),releaseForms:{},comparisons:[],sensitivity:null,
  customMaterial:defaultCustomMaterial(),
  result:null,mc:null
};

function isCustomMaterial(){return state.material===CUSTOM_MATERIAL_KEY;}
function materialDisplayName(){return isCustomMaterial()?(String(state.customMaterial?.name||'Custom nanomaterial').trim()||'Custom nanomaterial'):state.material;}
function safeFilePart(v){return String(v||'material').trim().replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'material';}
function customDefinitionSnapshot(){return {products:deepClone(state.products),eol:deepClone(state.eol),factors:deepClone(state.factors),lifetimes:deepClone(state.lifetimes),releaseForms:deepClone(state.releaseForms)};}
function registerCustomRuntime(definition=null){
  const d=definition||state.customMaterial?.definition||customDefinitionSnapshot();
  if(!d)return;
  D.MATERIAL_SCENARIOS[CUSTOM_MATERIAL_KEY]={description:state.customMaterial.description,products:deepClone(d.products),eol:deepClone(d.eol)};
  D.PROCESS_FACTOR_LIBRARY[CUSTOM_MATERIAL_KEY]=deepClone(d.factors);
  D.LIFETIME_DEFAULTS[CUSTOM_MATERIAL_KEY]=deepClone(d.lifetimes);
  D.RELEASE_FORM_DEFAULTS[CUSTOM_MATERIAL_KEY]=deepClone(d.releaseForms);
}
function customDefaultBlock(key,fallback){const d=state.customMaterial?.definition;return deepClone(d?.[key]??fallback);}
function readCustomIdentity(invalidate=true){
  if(!$('customMaterialName'))return;
  const previousFate=state.customMaterial?.fate_preset;
  state.customMaterial.name=$('customMaterialName').value.trim()||'Custom nanomaterial';
  state.customMaterial.description=$('customMaterialDescription').value.trim()||'User-defined nanomaterial scenario.';
  state.customMaterial.template=$('customTemplateSelect').value;
  state.customMaterial.fate_preset=$('customFatePreset').value;
  state.customMaterial.benchmark_proxy=$('customBenchmarkProxy').value;
  state.customMaterial.evidence=$('customEvidenceClass').value;
  state.customMaterial.source=$('customSource').value.trim()||'User-defined screening scenario';
  state.customMaterial.url=$('customSourceUrl').value.trim();
  state.customMaterial.note=$('customEvidenceNote').value.trim()||'User-defined assumptions require independent verification.';
  if(isCustomMaterial()){
    registerCustomRuntime();
    $('materialDescription').textContent=state.customMaterial.description;
    const opt=[...$('materialSelect').options].find(o=>o.value===CUSTOM_MATERIAL_KEY);if(opt)opt.text=`Custom: ${state.customMaterial.name}`;
    if(previousFate!==state.customMaterial.fate_preset)window.KNanoAdvanced?.setFatePreset?.(state.customMaterial.fate_preset,true);
    renderProvenance();renderBenchmark();renderWorkflowGuide();if(invalidate)clearResults();validate();
  }
}
function renderCustomMaterialPanel(){
  const panel=$('customMaterialPanel');if(!panel)return;panel.hidden=!isCustomMaterial();if(!isCustomMaterial())return;
  const c=state.customMaterial;
  $('customMaterialName').value=c.name;$('customMaterialDescription').value=c.description;
  $('customTemplateSelect').value=c.template;$('customFatePreset').value=c.fate_preset;$('customBenchmarkProxy').value=c.benchmark_proxy||'none';
  $('customEvidenceClass').value=c.evidence;$('customSource').value=c.source;$('customSourceUrl').value=c.url||'';$('customEvidenceNote').value=c.note||'';
  $('customMaterialStatus').innerHTML=`<b>Active custom material:</b> ${esc(materialDisplayName())}<br><span>All product, use-release, EoL, treatment, lifetime, release-form, environmental, uncertainty, and advanced-fate variables remain editable in their respective tabs.</span>`;
}
function initializeCustomFromTemplate(template=null,announce=true){
  const base=(template&&D.MATERIAL_SCENARIOS[template]&&template!==CUSTOM_MATERIAL_KEY)?template:(state.customMaterial?.template||'nano-TiO2');
  const sc=D.MATERIAL_SCENARIOS[base];if(!sc)throw new Error('The selected custom-material template is unavailable.');
  state.material=CUSTOM_MATERIAL_KEY;state.customMaterial.template=base;state.customMaterial.fate_preset=CUSTOM_TEMPLATE_FATE[base]||state.customMaterial.fate_preset||'Persistent mineral oxide';
  state.products=deepClone(sc.products);state.eol=deepClone(sc.eol);state.factors=deepClone(D.PROCESS_FACTOR_LIBRARY[base]);state.lifetimes=deepClone(D.LIFETIME_DEFAULTS[base]);state.releaseForms=deepClone(D.RELEASE_FORM_DEFAULTS[base]||D.RELEASE_FORM_DEFAULTS.CNT);
  state.customMaterial.definition=customDefinitionSnapshot();registerCustomRuntime(state.customMaterial.definition);PI?.syncProducts?.(state.products,Number($('totalMass')?.value)||1000,{reset:true});
  if(state.geography.apply_country_waste_preset)applyCountryWastePreset(false);
  state.sludge=deepClone(countrySludgePreset());
  $('materialSelect').value=CUSTOM_MATERIAL_KEY;$('materialDescription').textContent=state.customMaterial.description;
  window.KNanoAdvanced?.setFatePreset?.(state.customMaterial.fate_preset,true);
  renderCustomMaterialPanel();renderEditors();renderProductSummary();renderReleaseForms();renderProvenance();renderBenchmark();renderWorkflowGuide();clearResults();validate();
  if(announce)alert(`Custom material initialized from ${base}. Review and replace all relevant screening priors before interpreting results.`);
}
function saveCustomDefaults(){
  if(!isCustomMaterial())return;
  readCustomIdentity(false);state.customMaterial.definition=customDefinitionSnapshot();registerCustomRuntime(state.customMaterial.definition);renderCustomMaterialPanel();
  alert('The current product, release, EoL, treatment, lifetime, and release-form settings were saved as this custom material’s restore point.');
}
function restoreCustomDefaults(){
  if(!isCustomMaterial()||!state.customMaterial.definition)return;
  const d=state.customMaterial.definition;state.products=deepClone(d.products);state.eol=deepClone(d.eol);state.factors=deepClone(d.factors);state.lifetimes=deepClone(d.lifetimes);state.releaseForms=deepClone(d.releaseForms);
  if(state.geography.apply_country_waste_preset)applyCountryWastePreset(false);
  renderEditors();renderProductSummary();renderReleaseForms();renderProvenance();clearResults();validate();
}

function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function fmt(v,d=3){v=Number(v);if(!Number.isFinite(v))return '–';const a=Math.abs(v);if(a!==0&&(a<.001||a>=1e7))return v.toExponential(3);return v.toLocaleString('en-US',{maximumFractionDigits:d});}
function mass(v,perYear=false){return $('displayUnit').value==='t'?`${fmt(v/1000)} t${perYear?'/y':''}`:`${fmt(v)} kg${perYear?'/y':''}`;}
function currentCountryCode(){return $('countrySelect')?.value||currentRegion().country_code||'KR';}
function currentCountry(){return D.COUNTRY_DOMAINS[currentCountryCode()]||D.COUNTRY_DOMAINS.KR;}
function populateCountrySelect(preferred=null){
  const select=$('countrySelect');if(!select)return;
  const current=preferred||select.value||'KR';select.innerHTML='';
  Object.entries(D.COUNTRY_DOMAINS).sort(([a,av],[b,bv])=>Number(Boolean(av.custom))-Number(Boolean(bv.custom))||av.country_name.localeCompare(bv.country_name)).forEach(([code,c])=>select.add(new Option(`${c.country_name}${c.custom?' · custom':''}`,code)));
  select.value=D.COUNTRY_DOMAINS[current]?current:(D.COUNTRY_DOMAINS.KR?'KR':Object.keys(D.COUNTRY_DOMAINS)[0]);
}
function populateRegionSelect(preferred=null){
  const code=$('countrySelect').value;const rows=D.REGION_DATA.filter(r=>r.country_code===code);
  $('regionSelect').innerHTML='';rows.forEach(r=>$('regionSelect').add(new Option(r.region,r.domain_id)));
  const legacy=rows.find(r=>r.region===preferred);const exact=rows.find(r=>r.domain_id===preferred);
  $('regionSelect').value=(exact||legacy||rows.find(r=>r.domain_level==='national')||rows[0]).domain_id;
}
function currentRegion(){return D.REGION_DATA.find(r=>r.domain_id===$('regionSelect').value)||D.REGION_DATA.find(r=>r.country_code===($('countrySelect')?.value||'KR')&&r.domain_level==='national')||D.REGION_DATA[0];}
function nationalRegion(){const code=currentRegion().country_code;return D.REGION_DATA.find(r=>r.country_code===code&&r.domain_level==='national')||currentRegion();}
function countryWastePreset(){return D.COUNTRY_WASTE_PRESETS[currentRegion().country_code]||D.KOREA_WASTE_PRESET;}
function countrySludgePreset(){return D.COUNTRY_SLUDGE_PRESETS[currentRegion().country_code]||D.SLUDGE_DEFAULT;}
function applyCountryWastePreset(render=true){state.eol.forEach(r=>Object.assign(r,deepClone(countryWastePreset())));if(render){renderEol();renderProductSummary();clearResults();validate();}}
function updateCountryLabels(){const c=currentCountry();$('applyCountryWasteBtn').textContent=`Apply ${c.short_name} waste preset`;$('sludgeHeading').textContent=`${c.country_name}: sewage-sludge management routes`;window.KNanoGeography?.syncSelection?.(currentCountryCode());}
function refreshGeographySelection(preferredDomain=null){
  populateRegionSelect(preferredDomain);state.environment=regionDefaults();state.sludge=deepClone(countrySludgePreset());
  if(state.geography.apply_country_waste_preset)applyCountryWastePreset(false);
  updateCountryLabels();renderEditors();renderEnvironment();renderGeography();renderTrajectory();renderProvenance();renderBenchmark();renderWorkflowGuide();clearResults();validate();
}
function geographicScale(){
  const r=currentRegion(),n=nationalRegion(),basis=state.geography.input_basis;
  if(basis==='direct_region'||r.domain_id===n.domain_id)return 1;
  if(basis==='national_sewer_population')return r.sewer_population/Math.max(n.sewer_population,1e-30);
  if(basis==='national_wwtp_flow')return r.wwtp_flow_m3_y/Math.max(n.wwtp_flow_m3_y,1e-30);
  return r.population/Math.max(n.population,1e-30);
}
function preparedStaticInput(){
  const factor=geographicScale(),year=Number($('baseYear').value)||2024;
  if(PI?.isActive?.()){
    const raw=PI.prepareStatic(state.products),adjustedTotal=window.KNanoAdvanced?.adjustStaticInput?window.KNanoAdvanced.adjustStaticInput(raw.total_kg_y,year):raw.total_kg_y;
    const adjustment=raw.total_kg_y>0?Math.max(0,Number(adjustedTotal)||0)/raw.total_kg_y:1;
    const byProduct=Object.fromEntries(Object.entries(raw.by_product).map(([k,v])=>[k,v*adjustment*factor]));
    return {...raw,total_kg_y:Math.max(0,Number(adjustedTotal)||0)*factor,by_product:byProduct,adjustment_factor:adjustment,geographic_factor:factor};
  }
  const entered=Math.max(0,Number($('totalMass').value)||0),adjusted=window.KNanoAdvanced?.adjustStaticInput?window.KNanoAdvanced.adjustStaticInput(entered,year):entered;
  return {mode:'direct_enm',total_kg_y:Math.max(0,adjusted)*factor,products:state.products,by_product:Object.fromEntries(state.products.map(p=>[p.product_category,Math.max(0,adjusted)*factor*Number(p.allocation_pct||0)/100])),adjustment_factor:entered>0?Math.max(0,adjusted)/entered:1,geographic_factor:factor};
}
function effectiveStaticInput(){return preparedStaticInput().total_kg_y;}
function activeCalculationProducts(){
  if(!PI?.isActive?.())return state.products;
  if(state.mode==='dynamic_probabilistic'&&state.trajectory?.[0]?.product_inputs_kg_y)return E.allocationFromProductMasses(state.products,state.trajectory[0].product_inputs_kg_y);
  return PI.prepareStatic(state.products).products;
}
function effectiveTrajectory(){
  const f=geographicScale();
  if(PI?.isActive?.()){
    const raw=(state.trajectory?.length&&state.trajectory.every(r=>r.product_inputs_kg_y))?deepClone(state.trajectory):PI.buildTrajectory(state.products,state.dynamicSettings.start_year,state.dynamicSettings.end_year);
    const aggregate=raw.map(r=>({year:Number(r.year),primary_input_kg_y:Math.max(0,Number(r.primary_input_kg_y)||0)}));
    const adjusted=window.KNanoAdvanced?.adjustTrajectory?window.KNanoAdvanced.adjustTrajectory(aggregate):aggregate;
    return raw.map((r,i)=>{const base=Math.max(0,Number(r.primary_input_kg_y)||0),target=Math.max(0,Number(adjusted[i]?.primary_input_kg_y)||0),ratio=base>0?target/base:1;const product_inputs_kg_y=Object.fromEntries(Object.entries(r.product_inputs_kg_y||{}).map(([k,v])=>[k,Math.max(0,Number(v)||0)*ratio*f]));return {year:Number(r.year),primary_input_kg_y:Object.values(product_inputs_kg_y).reduce((a,b)=>a+b,0),product_inputs_kg_y};});
  }
  const raw=state.trajectory.map(r=>({year:Number(r.year),primary_input_kg_y:Math.max(0,Number(r.primary_input_kg_y)||0)}));const adjusted=window.KNanoAdvanced?.adjustTrajectory?window.KNanoAdvanced.adjustTrajectory(raw):raw;return adjusted.map(r=>({year:Number(r.year),primary_input_kg_y:Math.max(0,Number(r.primary_input_kg_y)||0)*f}));
}
function regionDefaults(){
  const r=currentRegion();
  const q=r.wwtp_flow_m3_y/E.SECONDS_PER_YEAR;
  return {
    river_flow_m3_s:Number(r.river_flow_m3_s_default)||Math.max(q*10,0.05),
    soil_area_ha:Math.max(r.area_km2*100,1),
    soil_depth_m:0.2,
    soil_bulk_density_kg_m3:1300,
    soil_residence_time_y:10,
    water_to_sediment_pct:20,
    sediment_area_km2:Math.max(r.area_km2*0.001,0.1),
    sediment_depth_m:0.05,
    sediment_bulk_density_kg_m3:1300,
    sediment_residence_time_y:10,
    air_mixing_height_m:1000,
    air_turnovers_y:365
  };
}
function clearResults(){state.result=null;state.mc=null;state.sensitivity=null;window.KNanoNanoform?.clearResult?.();window.KNanoDynamicFate?.clearResult?.();$('resultsArea').hidden=true;$('emptyResults').hidden=false;$('mcResults').hidden=true;if($('productSourcePanel'))$('productSourcePanel').hidden=true;if($('releaseFormResults'))$('releaseFormResults').innerHTML='';if($('sensitivityChart'))Plotly.purge('sensitivityChart');if($('sensitivityTable'))$('sensitivityTable').innerHTML='';renderFitnessFlags();renderBenchmark();renderWorkflowGuide();}

function loadMaterial(name){
  if(name===CUSTOM_MATERIAL_KEY){
    state.material=CUSTOM_MATERIAL_KEY;
    if(!state.customMaterial.definition)initializeCustomFromTemplate(state.customMaterial.template,false);
    else{
      registerCustomRuntime(state.customMaterial.definition);
      const d=state.customMaterial.definition;state.products=deepClone(d.products);state.eol=deepClone(d.eol);state.factors=deepClone(d.factors);state.lifetimes=deepClone(d.lifetimes);state.releaseForms=deepClone(d.releaseForms);
      if(state.geography.apply_country_waste_preset)applyCountryWastePreset(false);
      state.sludge=deepClone(countrySludgePreset());$('materialDescription').textContent=state.customMaterial.description;
      window.KNanoAdvanced?.setFatePreset?.(state.customMaterial.fate_preset,true);
    }
  }else{
    state.material=name;
    state.products=deepClone(D.MATERIAL_SCENARIOS[name].products);
    state.eol=deepClone(D.MATERIAL_SCENARIOS[name].eol);
    if(state.geography.apply_country_waste_preset)applyCountryWastePreset(false);
    state.factors=deepClone(D.PROCESS_FACTOR_LIBRARY[name]);
    state.sludge=deepClone(countrySludgePreset());
    state.lifetimes=deepClone(D.LIFETIME_DEFAULTS[name]);
    state.releaseForms=deepClone(D.RELEASE_FORM_DEFAULTS?.[name]||D.RELEASE_FORM_DEFAULTS?.CNT||{});
    $('materialDescription').textContent=D.MATERIAL_SCENARIOS[name].description;
    window.KNanoAdvanced?.setFatePreset?.(CUSTOM_TEMPLATE_FATE[name]||'Persistent mineral oxide',true);
  }
  PI?.syncProducts?.(state.products,Number($('totalMass')?.value)||1000,{reset:true});
  if(PI?.isActive?.())PI.syncAllocationToProducts(state.products);
  renderCustomMaterialPanel();renderEditors();renderProductSummary();renderReleaseForms();renderProvenance();renderBenchmark();renderWorkflowGuide();clearResults();validate();
}
function init(){
  const builtInMaterials=Object.keys(D.MATERIAL_SCENARIOS).filter(x=>x!==CUSTOM_MATERIAL_KEY);builtInMaterials.forEach(x=>$('materialSelect').add(new Option(x,x)));$('materialSelect').add(new Option('Custom nanomaterial…',CUSTOM_MATERIAL_KEY));builtInMaterials.forEach(x=>$('customTemplateSelect').add(new Option(x,x)));builtInMaterials.forEach(x=>$('customBenchmarkProxy').add(new Option(`${x} — use only with documented comparability`,x)));
  window.KNanoGeography?.bootstrap?.(D);populateCountrySelect('KR');
  $('countrySelect').value='KR';populateRegionSelect('KR-national');
  $('inputBasis').value=state.geography.input_basis;$('countryWasteToggle').checked=state.geography.apply_country_waste_preset;updateCountryLabels();
  state.environment=regionDefaults();
  loadMaterial(state.material);
  syncDynamicInputs();generateTrajectory();renderEnvironment();renderGeography();renderQuality();renderMetadata();renderProvenance();renderBenchmark();initMetricSelectors();renderComparison();renderWorkflowGuide();bind();PI?.initUI?.(window.KNanoApp);
  window.KNanoGeography?.initUI?.({switchTab,getCurrentCode:currentCountryCode,getCurrentDomain:()=>currentRegion().domain_id,onChange:(code,domainId)=>{populateCountrySelect(code);$('countrySelect').value=code;refreshGeographySelection(domainId);},onDelete:()=>{populateCountrySelect('KR');$('countrySelect').value='KR';refreshGeographySelection('KR-national');}});
  window.KNanoNanoform?.initUI?.(window.KNanoApp);if(window.__KNANO_PENDING_NANOFORM_STATE)window.KNanoNanoform?.loadState?.(window.__KNANO_PENDING_NANOFORM_STATE);
  window.KNanoDynamicFate?.initUI?.(window.KNanoApp);if(window.__KNANO_PENDING_DYNAMIC_FATE_STATE)window.KNanoDynamicFate?.loadState?.(window.__KNANO_PENDING_DYNAMIC_FATE_STATE);
  try{interfaceView=localStorage.getItem('K-NanoMFA-v20-interface-view')||'guided';}catch(_){interfaceView='guided';}setInterfaceView(interfaceView,false);setMode('static_deterministic');
  let saved=null;try{saved=localStorage.getItem('K-NanoMFA-v20-en')||localStorage.getItem('K-NanoMFA-v15-en')||localStorage.getItem('K-NanoMFA-v14-en')||localStorage.getItem('K-NanoMFA-v13-en')||localStorage.getItem('K-NanoMFA-v121-en')||localStorage.getItem('K-NanoMFA-v12-en')||localStorage.getItem('K-NanoMFA-v10-en')||localStorage.getItem('K-NanoMFA-v092-en')||localStorage.getItem('K-NanoMFA-v09-en')||localStorage.getItem('K-NanoMFA-v08-en')||localStorage.getItem('K-NanoMFA-v07-en');}catch(e){console.warn('Browser storage is unavailable; scenarios can still be exported as JSON.',e);}
  if(saved){try{applyScenario(JSON.parse(saved),false);}catch(e){console.warn(e);}}
}
function setMode(mode){
  state.mode=mode;$('modelMode').value=mode;
  document.querySelectorAll('.model-card').forEach(x=>x.classList.toggle('selected',x.dataset.mode===mode));
  const dyn=mode==='dynamic_probabilistic';
  $('staticSidebarFields').hidden=dyn;$('dynamicStructure').hidden=!dyn;$('staticStructure').hidden=dyn;
  $('dynamicSettingsPanel').hidden=!dyn;$('lifetimePanel').hidden=!dyn;$('dynamicCharts').hidden=!dyn;
  $('staticCharts').hidden=dyn;$('staticMcResults').hidden=dyn;$('dynamicMcResults').hidden=!dyn;
  $('growthSd').closest('label').hidden=!dyn;$('lifetimeRsd').closest('label').hidden=!dyn;
  $('calculateBtn').textContent=dyn?'Run dynamic country/domain trajectory':'Run static country/domain model';
  renderProducts();renderLifetimes();renderFactors();renderProductSummary();renderTrajectory();renderEffectiveInput();renderProvenance();renderBenchmark();renderWorkflowGuide();clearResults();renderFitnessFlags();validate();
}

function inputCell(value,path,min=0,max=100,step=.01){return `<input type="number" min="${min}" max="${max}" step="${step}" value="${Number(value)}" data-path="${path}">`;}
function renderEditors(){renderProducts();renderEol();renderLifetimes();renderFactors();renderSludge();PI?.render?.(state.products);}
function renderProducts(){
  const h=['Product category','Allocation (%)','Use → air (%)','Use → direct water (%)','Use → WWTP (%)','Use → soil (%)','Release total','Action'];
  let s=`<thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>`;
  state.products.forEach((r,i)=>{
    const t=Number(r.use_air_pct)+Number(r.use_direct_water_pct)+Number(r.use_wwtp_pct)+Number(r.use_soil_pct);
    s+=`<tr><td><input class="category-name" type="text" value="${esc(r.product_category)}" data-category-index="${i}"></td>`+
      `<td>${PI?.isActive?.()?`<input class="allocation-derived" type="number" value="${Number(r.allocation_pct)}" disabled title="Calculated from the active product inventory">`:inputCell(r.allocation_pct,`products.${i}.allocation_pct`)}</td>`+
      `<td>${inputCell(r.use_air_pct,`products.${i}.use_air_pct`)}</td>`+
      `<td>${inputCell(r.use_direct_water_pct,`products.${i}.use_direct_water_pct`)}</td>`+
      `<td>${inputCell(r.use_wwtp_pct,`products.${i}.use_wwtp_pct`)}</td>`+
      `<td>${inputCell(r.use_soil_pct,`products.${i}.use_soil_pct`)}</td>`+
      `<td class="${t<=100?'sum-ok':'sum-bad'}">${fmt(t)}%</td>`+
      `<td><button class="icon-button remove-product" data-remove-index="${i}" ${state.products.length<=1?'disabled':''}>Remove</button></td></tr>`;
  });
  const total=state.products.reduce((a,r)=>a+Number(r.allocation_pct),0);
  s+=`<tr><td><b>Total</b></td><td class="${Math.abs(total-100)<=.05?'sum-ok':'sum-bad'}"><b>${fmt(total)}%</b></td><td colspan="6"></td></tr></tbody>`;
  $('productTable').innerHTML=s;
  bindPathInputs($('productTable'));
  $('productTable').querySelectorAll('[data-category-index]').forEach(el=>el.addEventListener('change',()=>renameProductCategory(Number(el.dataset.categoryIndex),el.value)));
  $('productTable').querySelectorAll('[data-remove-index]').forEach(el=>el.addEventListener('click',()=>removeProductCategory(Number(el.dataset.removeIndex))));
}
function renderEol(){
  const h=['Product category','Incineration (%)','Landfill (%)','Recycling (%)','Reuse (%)','Biological treatment (%)','Total'];
  let s=`<thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>`;
  state.eol.forEach((r,i)=>{
    const t=Number(r.incineration_pct)+Number(r.landfill_pct)+Number(r.recycling_pct)+Number(r.reuse_pct)+Number(r.biological_treatment_pct);
    s+=`<tr><td>${esc(r.product_category)}</td><td>${inputCell(r.incineration_pct,`eol.${i}.incineration_pct`)}</td><td>${inputCell(r.landfill_pct,`eol.${i}.landfill_pct`)}</td><td>${inputCell(r.recycling_pct,`eol.${i}.recycling_pct`)}</td><td>${inputCell(r.reuse_pct,`eol.${i}.reuse_pct`)}</td><td>${inputCell(r.biological_treatment_pct,`eol.${i}.biological_treatment_pct`)}</td><td class="${Math.abs(t-100)<=.05?'sum-ok':'sum-bad'}">${fmt(t)}%</td></tr>`;
  });
  s+='</tbody>';$('eolTable').innerHTML=s;bindPathInputs($('eolTable'));
}
function renderLifetimes(){
  let s='<thead><tr><th>Product category</th><th>Mean lifetime (y)</th><th>Weibull shape k</th><th>Use-release duration (y)</th></tr></thead><tbody>';
  state.lifetimes.forEach((r,i)=>{s+=`<tr><td>${esc(r.product_category)}</td><td>${inputCell(r.mean_lifetime_y,`lifetimes.${i}.mean_lifetime_y`,.1,100,.1)}</td><td>${inputCell(r.weibull_shape,`lifetimes.${i}.weibull_shape`,.2,10,.1)}</td><td>${inputCell(r.use_release_duration_y,`lifetimes.${i}.use_release_duration_y`,1,100,1)}</td></tr>`;});
  s+='</tbody>';$('lifetimeTable').innerHTML=s;bindPathInputs($('lifetimeTable'));
}
function renderFactors(){
  let s='';
  Object.entries(state.factors).forEach(([proc,o])=>{
    let total=Object.values(o).reduce((a,b)=>a+Number(b),0);
    const dynamicLf=state.mode==='dynamic_probabilistic'&&proc==='landfill';
    if(dynamicLf)total=['leachate_to_surface_water','runoff_to_surface_water','fugitive_dust_to_air','transformation'].reduce((a,k)=>a+Number(o[k]||0),0);
    s+=`<details class="factor-group" open><summary><span>${PROCESS_LABELS[proc]}</span><span class="${dynamicLf?(total<100?'sum-ok':'sum-bad'):(Math.abs(total-100)<=.05?'sum-ok':'sum-bad')}">${dynamicLf?'Annual loss total':'Total'} ${fmt(total)}%</span></summary><div class="factor-content"><table><thead><tr><th>Output route</th><th>${dynamicLf?'Value / annual rate (%)':'Share (%)'}</th></tr></thead><tbody>`;
    Object.entries(o).forEach(([k,v])=>{const disabled=dynamicLf&&k==='landfill_stock';s+=`<tr><td>${OUTPUT_LABELS[k]||k}${disabled?' (calculated residual)':''}</td><td><input type="number" min="0" max="100" step="0.01" value="${v}" data-path="factors.${proc}.${k}" ${disabled?'disabled':''}></td></tr>`;});
    s+='</tbody></table></div></details>';
  });
  $('processFactors').innerHTML=s;bindPathInputs($('processFactors'));
}
function renderSludge(){
  let s='<thead><tr><th>Management route</th><th>Share (%)</th></tr></thead><tbody>';
  Object.entries(state.sludge).forEach(([k,v])=>s+=`<tr><td>${OUTPUT_LABELS[k]||PROCESS_LABELS[k]||k}</td><td>${inputCell(v,`sludge.${k}`)}</td></tr>`);
  const t=Object.values(state.sludge).reduce((a,b)=>a+Number(b),0);
  s+=`<tr><td><b>Total</b></td><td class="${Math.abs(t-100)<=.05?'sum-ok':'sum-bad'}"><b>${fmt(t)}%</b></td></tr></tbody>`;
  $('sludgeTable').innerHTML=s;bindPathInputs($('sludgeTable'));
}
function bindPathInputs(root){root.querySelectorAll('input[data-path]').forEach(el=>el.addEventListener('change',()=>{setPath(state,el.dataset.path,Number(el.value));renderEditors();renderProductSummary();clearResults();validate();}));}
function setPath(o,path,v){const p=path.split('.');let c=o;for(let i=0;i<p.length-1;i++)c=c[p[i]];c[p.at(-1)]=v;}
function renameProductCategory(index,name){
  const cleaned=String(name||'').trim();
  state.products[index].product_category=cleaned;PI?.renameProduct?.(index,cleaned);
  if(state.eol[index])state.eol[index].product_category=cleaned;
  if(state.lifetimes[index])state.lifetimes[index].product_category=cleaned;
  renderEditors();renderProductSummary();clearResults();validate();
}
function addProductCategory(){
  let n=1,name='New product category';
  const names=new Set(state.products.map(r=>r.product_category));
  while(names.has(name)){n++;name=`New product category ${n}`;}
  state.products.push({product_category:name,allocation_pct:0,use_air_pct:0,use_direct_water_pct:0,use_wwtp_pct:0,use_soil_pct:0});
  state.eol.push({...deepClone(state.geography.apply_country_waste_preset?countryWastePreset():(state.eol[0]||D.MATERIAL_SCENARIOS.CNT.eol[0])),product_category:name});
  state.lifetimes.push({product_category:name,mean_lifetime_y:5,weibull_shape:2.5,use_release_duration_y:3});PI?.addProduct?.(state.products.at(-1),0);
  renderEditors();renderProductSummary();clearResults();validate();
}
function removeProductCategory(index){
  if(state.products.length<=1)return;
  state.products.splice(index,1);state.eol.splice(index,1);state.lifetimes.splice(index,1);PI?.removeProduct?.(index);
  renderEditors();renderProductSummary();clearResults();validate();
}
function renderProductSummary(){
  $('productSummary').innerHTML=state.products.map((p,i)=>{
    const release=Number(p.use_air_pct)+Number(p.use_direct_water_pct)+Number(p.use_wwtp_pct)+Number(p.use_soil_pct);
    const e=state.eol[i]||{};
    const routeKeys=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'];
    const dominant=routeKeys.sort((a,b)=>Number(e[b]||0)-Number(e[a]||0))[0];
    const route=dominant?dominant.replace('_pct','').replaceAll('_',' '):'–';
    const life=state.lifetimes[i];
    const productInput=PI?.isActive?.()?PI.prepareStatic(state.products).by_product[p.product_category]:null;
    return `<div class="product-card"><b>${esc(p.product_category)}</b><span>${fmt(p.allocation_pct)}% of input</span>${productInput!==null?`<small>Calculated ENM input: ${fmt(productInput,8)} kg/y</small>`:''}<small>Use release: ${fmt(release)}%</small><small>Dominant EoL: ${esc(route)} (${fmt(e[dominant]||0)}%)</small>${state.mode==='dynamic_probabilistic'&&life?`<small>Mean lifetime: ${fmt(life.mean_lifetime_y)} y</small>`:''}</div>`;
  }).join('');
}

function renderEnvironment(){
  let s='';
  Object.entries(ENV_LABELS).forEach(([k,l])=>{const bounds=k==='water_to_sediment_pct'?'min="0" max="100"':'min="0.000001"';s+=`<label>${l}<input type="number" ${bounds} step="any" value="${state.environment[k]}" data-env="${k}"></label>`;});
  $('environmentGrid').innerHTML=s;
  $('environmentGrid').querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>{state.environment[el.dataset.env]=Number(el.value);clearResults();validate();}));
}
function refreshInputViews(){
  syncDynamicInputs();
  renderEditors();renderEnvironment();renderTrajectory();renderGeography();renderProductSummary();renderReleaseForms();renderProvenance();renderBenchmark();renderWorkflowGuide();renderEffectiveInput();
  clearResults();validate();
}
function renderGeography(){
  const r=currentRegion(),factor=geographicScale();
  const direct=state.geography.input_basis==='direct_region';
  $('inputBasisHelp').textContent=direct?'The entered input is used without geographic downscaling. Environmental capacities still follow the selected domain.':`The entered value is treated as a national total and multiplied by the selected domain’s ${state.geography.input_basis==='national_population'?'population':state.geography.input_basis==='national_sewer_population'?'sewered population':'wastewater flow'} share.`;
  const rows=[
    ['Country',r.country],['Selected domain',r.region],['Domain level',r.domain_level],['Population',fmt(r.population,0)],['Sewered population',fmt(r.sewer_population,0)],
    ['Land area',`${fmt(r.area_km2,3)} km²`],['Public WWTP flow',`${fmt(r.wwtp_flow_m3_y,0)} m³/y`],
    ['Dry sewage sludge',`${fmt(r.sludge_dry_t_y,3)} t/y`],['Effective freshwater flow',`${fmt(r.river_flow_m3_s_default,3)} m³/s`],['Input geography',INPUT_BASIS_LABELS[state.geography.input_basis]],
    ['Geographic allocation factor',fmt(factor,8)],['Country EoL coupling',state.geography.apply_country_waste_preset?'Enabled':'Disabled']
  ];
  $('regionSummary').innerHTML=makeTable(['Parameter','Value'],rows);
  $('regionDataTable').innerHTML=makeTable(['Region statistic','Value','Calculation role'],[
    ['Population',fmt(r.population,0),'Optional market-input downscaling'],
    ['Sewered population',fmt(r.sewer_population,0),'Optional market-input downscaling'],
    ['Area',`${fmt(r.area_km2,3)} km²`,'Air volume and regional soil/sediment defaults'],
    ['Wastewater flow',`${fmt(r.wwtp_flow_m3_y,0)} m³/y`,'WWTP effluent concentration and receiving-water default'],
    ['Dry sludge production',`${fmt(r.sludge_dry_t_y,3)} t/y`,'Sewage-sludge concentration'],
    ['Effective freshwater flow',`${fmt(r.river_flow_m3_s_default,3)} m³/s`,'Default national or subnational surface-water dilution'],
    ['Data basis',r.data_quality||'screening','Domain provenance and interpretation']
  ]);
  renderEffectiveInput();
}
function renderEffectiveInput(){
  const factor=geographicScale();
  if(state.mode==='dynamic_probabilistic'){
    const eff=effectiveTrajectory(),first=eff[0]?.primary_input_kg_y||0,last=eff.at(-1)?.primary_input_kg_y||first;
    $('effectiveInputBox').innerHTML=`<span>${PI?.isActive?.()?'Product-informed effective trajectory':'Geographic factor'}</span><b>${PI?.isActive?.()?`${fmt(first)}–${fmt(last)} kg/y`:fmt(factor,8)}</b><small>${PI?.isActive?.()?'Calculated product-specific ENM inputs after geographic and advanced-input adjustment.':`Effective domain trajectory: ${fmt(first)}–${fmt(last)} kg/y`}</small>`;
  }else{
    const prep=preparedStaticInput();$('effectiveInputBox').innerHTML=`<span>${PI?.isActive?.()?'Product-informed effective domain input':'Effective domain input'}</span><b>${mass(prep.total_kg_y,true)}</b><small>${PI?.isActive?.()?`${Object.keys(prep.by_product).length} product sources · geographic factor ${fmt(factor,8)}`:`Entered input × ${fmt(factor,8)}`}</small>`;
  }
}

function syncDynamicInputs(){
  const ds=state.dynamicSettings;
  $('startYear').value=ds.start_year;$('endYear').value=ds.end_year;$('initialInput').value=ds.initial_input_kg_y;
  $('annualGrowth').value=ds.annual_growth_pct;$('closedLoopPct').value=ds.closed_loop_recycling_pct;
  $('recyclingDelay').value=ds.recycling_delay_y;$('reuseDelay').value=ds.reuse_delay_y;
  $('initialLandfillStock').value=ds.initial_landfill_stock_kg;
}
function readDynamicInputs(){
  Object.assign(state.dynamicSettings,{
    start_year:Number($('startYear').value),end_year:Number($('endYear').value),
    initial_input_kg_y:Number($('initialInput').value),annual_growth_pct:Number($('annualGrowth').value),
    closed_loop_recycling_pct:Number($('closedLoopPct').value),recycling_delay_y:Number($('recyclingDelay').value),
    reuse_delay_y:Number($('reuseDelay').value),initial_landfill_stock_kg:Number($('initialLandfillStock').value)
  });
}
function generateTrajectory(){readDynamicInputs();state.trajectory=PI?.isActive?.()?PI.buildTrajectory(state.products,state.dynamicSettings.start_year,state.dynamicSettings.end_year):E.buildTrajectory(state.dynamicSettings);renderTrajectory();renderEffectiveInput();clearResults();validate();}
function generateProductTrajectory(){if(PI?.isActive?.()){readDynamicInputs();state.trajectory=PI.buildTrajectory(state.products,state.dynamicSettings.start_year,state.dynamicSettings.end_year);renderTrajectory();renderEffectiveInput();clearResults();validate();}}
function renderTrajectory(){
  const factor=geographicScale();if(PI?.renderTrajectory?.($('trajectoryTable'),state.trajectory,factor))return;
  let s='<thead><tr><th>Year</th><th>Entered input (kg/y)</th><th>Effective domain input (kg/y)</th></tr></thead><tbody>';
  state.trajectory.forEach((r,i)=>s+=`<tr><td>${r.year}</td><td><input type="number" min="0" step="any" value="${r.primary_input_kg_y}" data-traj="${i}"></td><td>${fmt(r.primary_input_kg_y*factor,6)}</td></tr>`);
  s+='</tbody>';$('trajectoryTable').innerHTML=s;
  $('trajectoryTable').querySelectorAll('input').forEach(el=>el.addEventListener('change',()=>{state.trajectory[Number(el.dataset.traj)].primary_input_kg_y=Number(el.value);renderTrajectory();renderEffectiveInput();clearResults();validate();}));
}


function readMetadata(){
  state.metadata={
    study_title:$('metadataStudyTitle').value.trim(),analyst:$('metadataAnalyst').value.trim(),purpose:$('metadataPurpose').value,
    tracking_basis:$('metadataTrackingBasis').value,system_boundary:$('metadataBoundary').value,accounting_principle:$('metadataAccounting').value,notes:$('metadataNotes').value.trim()
  };
}

function evidenceBadge(cls){return `<span class="evidence-badge evidence-${String(cls).toLowerCase()}">${esc(cls)} · ${esc(EVIDENCE_CLASS_LABELS[cls]||'Unclassified')}</span>`;}
function provenanceRows(){
  const material=isCustomMaterial()?{evidence:state.customMaterial.evidence||'E',source:state.customMaterial.source||'User-defined screening scenario',url:state.customMaterial.url||'SOURCES.md',note:state.customMaterial.note||'No bundled material-specific provenance is assumed.'}:(MATERIAL_PROVENANCE[state.material]||{evidence:'E',source:'Expert screening assumption',url:'SOURCES.md',note:'No material-specific provenance record is available.'});
  const region=currentRegion();
  const geoOfficial=String(region.data_quality||'').startsWith('official');
  return [
    {group:PI?.isActive?.()?'Product-market inventory, ENM content, and nano-enabled fraction':'Material/product allocation and life-cycle architecture',cls:PI?.isActive?.()?'E':material.evidence,source:PI?.isActive?.()?'User-entered product inventory with row-specific evidence metadata':material.source,url:PI?.isActive?.()?'SOURCES.md':material.url,application:PI?.isActive?.()?'Product quantities are converted to ENM mass before MFA; consult the product-inventory evidence table for row-specific sources.':material.note},
    {group:'Country/domain population, wastewater and sludge denominators',cls:geoOfficial?'A':(window.KNanoGeography?.isCustomCode?.(region.country_code)?'E':'D'),source:geoOfficial?'Republic of Korea 2024 Sewerage Statistics':(window.KNanoGeography?.isCustomCode?.(region.country_code)?(currentCountry().basis||'User-defined geographic data'):'Harmonised country screening dataset'),url:geoOfficial?'https://www.mcee.go.kr/home/web/public_info/read.do?publicInfoId=640':(currentCountry().source_url||'SOURCES.md'),application:`Active domain: ${region.country} / ${region.region}; data-quality flag: ${region.data_quality||'screening'}.`},
    {group:'Country waste-management preset',cls:'D',source:'Official or international waste statistics harmonised to common routes',url:'SOURCES.md',application:'Country routes are screening presets because statistical definitions differ among jurisdictions.'},
    {group:'Use-stage release factors',cls:material.evidence==='B'?'C':'E',source:'Material/product literature translated to editable release fractions',url:material.url,application:'Release fractions are not measured national averages and should be replaced for site- or product-specific studies.'},
    {group:'Treatment transfer coefficients',cls:'C',source:'Peer-reviewed ENM MFA and waste-treatment literature',url:'SOURCES.md',application:'Cross-study process proxies; nanoform transformation and facility technology may differ.'},
    {group:'Product lifetimes and Weibull shape',cls:state.mode==='dynamic_probabilistic'?'C':'E',source:'Product-class lifetime priors and dynamic MFA practice',url:'SOURCES.md',application:state.mode==='dynamic_probabilistic'?'Used directly in cohort calculations.':'Stored but not used in static calculations.'},
    {group:'Receiving-water, soil, sediment, and air capacities',cls:geoOfficial?'C':'D',source:'Domain statistics plus transparent environmental-capacity assumptions',url:'SOURCES.md',application:'Suitable for screening PECs; replace with site-specific hydrology and receiving-medium data for local assessment.'},
    {group:'Nanoform-state allocation',cls:'E',source:'Editable material screening prior',url:'SOURCES.md',application:'Reporting allocation only; it does not simulate form-specific transformation kinetics.'},
    {group:'Dynamic nanoform-fate kinetics',cls:'E',source:'Editable v2.0.1 kinetic screening prior',url:'MANUAL_ADDENDUM_v2.0.1.md',application:'First-order operational-state kinetics; replace with nanoform-, medium-, and process-specific evidence.'}
  ];
}
function renderProvenance(){
  if(!$('provenanceTable'))return;
  const rows=provenanceRows();
  const counts=rows.reduce((o,r)=>(o[r.cls]=(o[r.cls]||0)+1,o),{});
  const strongest=rows.filter(r=>['A','B'].includes(r.cls)).length;
  $('provenanceSummary').innerHTML=`<div class="quality-badge"><span>Selected material</span><b>${esc(materialDisplayName())}</b></div><div class="quality-badge"><span>Direct or official evidence rows</span><b>${strongest} / ${rows.length}</b></div><div class="quality-badge"><span>Screening-assumption rows</span><b>${(counts.D||0)+(counts.E||0)}</b></div>`;
  $('provenanceTable').innerHTML=makeTable(['Parameter family','Evidence class','Source / reference','Applicability to current scenario'],rows.map(r=>[r.group,htmlCell(evidenceBadge(r.cls)),htmlCell(`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source)}</a>`),r.application]));
}
function currentBenchmarkValue(metric){
  if(!state.result)return null;
  if(state.mode==='dynamic_probabilistic'){
    const row=state.result.final;
    if(metric==='annual_soil_increment_ug_kg')return row.pec?.annual_soil_increment_ug_kg;
    return row.pec?.[metric];
  }
  return state.result.pec?.[metric];
}
function benchmarkApplicability(b){
  let level='Moderate',reasons=[];
  if(b.country){if(currentRegion().country_code===b.country){level='High';reasons.push('country matches');}else{level='Low';reasons.push('country differs');}}
  if(b.year){const y=state.mode==='dynamic_probabilistic'?state.result?.final?.year:Number($('baseYear').value);if(y===b.year){reasons.push('year matches');if(level!=='Low')level='High';}else{reasons.push(`reference year ${b.year}; current ${y}`);if(level==='High')level='Moderate';}}
  if(!b.country&&!b.year)reasons.push('broad regional/order-of-magnitude envelope');
  return {level,reasons:reasons.join('; ')};
}
function benchmarkStatus(value,b){
  if(!(Number.isFinite(value)&&value>=0))return {label:'Not available',cls:'low',ratio:null};
  if(Number.isFinite(b.min)&&Number.isFinite(b.max)){
    if(value>=b.min&&value<=b.max)return {label:'Within published range',cls:'high',ratio:1};
    if(value<b.min)return {label:`Below range (${fmt(b.min/Math.max(value,1e-30),3)}× lower)`,cls:'moderate',ratio:value/b.min};
    return {label:`Above range (${fmt(value/b.max,3)}× higher)`,cls:'low',ratio:value/b.max};
  }
  const ratio=value/Math.max(b.target,1e-30),orders=Math.abs(Math.log10(Math.max(ratio,1e-30)));
  return orders<=1?{label:`Same order of magnitude (${fmt(ratio,3)}×)`,cls:'high',ratio}:{label:`Different order of magnitude (${fmt(ratio,3)}×)`,cls:orders<=2?'moderate':'low',ratio};
}
function benchmarkAuditData(){
  if(!state.result)return [];
  return BENCHMARK_LIBRARY.filter(b=>b.materials.includes(isCustomMaterial()&&state.customMaterial.benchmark_proxy!=='none'?state.customMaterial.benchmark_proxy:state.material)).map(b=>{const value=currentBenchmarkValue(b.metric),app=benchmarkApplicability(b),status=benchmarkStatus(value,b);return {benchmark_id:b.id,name:b.name,metric:b.metric,current_value:value,unit:b.unit,published_min:b.min??null,published_max:b.max??null,published_target:b.target??null,applicability:app,status:status.label,source:b.source,url:b.url,qualification:b.note};});
}
function renderBenchmark(){
  if(!$('benchmarkTable'))return;
  const relevant=BENCHMARK_LIBRARY.filter(b=>b.materials.includes(isCustomMaterial()&&state.customMaterial.benchmark_proxy!=='none'?state.customMaterial.benchmark_proxy:state.material));
  if(!state.result){$('benchmarkApplicability').textContent='Run the model first. The benchmark module will then compare the current PEC or process concentration with applicable literature values.';$('benchmarkSummary').innerHTML='';$('benchmarkTable').innerHTML='<div class="comparison-empty">No calculated result is available.</div>';return;}
  if(!relevant.length){$('benchmarkApplicability').textContent='No bundled material-specific benchmark is available for this material. Use the independent validation module with project-specific observations.';$('benchmarkSummary').innerHTML='';$('benchmarkTable').innerHTML='<div class="comparison-empty">No bundled benchmark for the selected material.</div>';return;}
  const rows=relevant.map(b=>{const value=currentBenchmarkValue(b.metric),app=benchmarkApplicability(b),status=benchmarkStatus(value,b);return {...b,value,app,status};});
  const plausible=rows.filter(r=>r.status.cls==='high').length,highApp=rows.filter(r=>r.app.level==='High').length;
  $('benchmarkApplicability').innerHTML=`Benchmarks are used as external plausibility checks. ${highApp} of ${rows.length} benchmark(s) have high applicability to the current country/year settings. Form, boundary, and compartment definitions must still be reviewed.`;
  $('benchmarkSummary').innerHTML=`<div class="quality-badge"><span>Applicable benchmark records</span><b>${rows.length}</b></div><div class="quality-badge"><span>Within range / same order</span><b>${plausible}</b></div><div class="quality-badge"><span>High-applicability matches</span><b>${highApp}</b></div>`;
  $('benchmarkTable').innerHTML=makeTable(['Benchmark','Current result','Published value','Applicability','Comparison','Reference and qualification'],rows.map(r=>{
    const pub=Number.isFinite(r.min)?`${fmt(r.min,6)}–${fmt(r.max,6)} ${r.unit}`:`${fmt(r.target,6)} ${r.unit}`;
    return [r.name,Number.isFinite(r.value)?`${fmt(r.value,8)} ${r.unit}`:'Not available',pub,htmlCell(`<span class="benchmark-${r.app.level.toLowerCase()}">${esc(r.app.level)}</span><br><small>${esc(r.app.reasons)}</small>`),htmlCell(`<span class="benchmark-${r.status.cls}">${esc(r.status.label)}</span>`),htmlCell(`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.source)}</a><br><small>${esc(r.note)}</small>`)];
  }));
}
function renderWorkflowGuide(){
  if(!$('workflowStatus'))return;
  let html='';
  if(!state.result)html='<b>Next recommended action:</b> Review the active product categories and the provenance register, then click <b>Run model</b> in the left sidebar.';
  else if(state.mode!=='static_deterministic'&&!state.mc)html='<b>Base result available.</b> Inspect the Sankey and mass balance, then open <b>Uncertainty</b> to run P5–P50–P95 analysis.';
  else if((state.comparisons||[]).length===0)html='<b>Result available.</b> Click <b>Add current run to comparison</b> in Results before changing the scenario.';
  else if(state.comparisons.length===1)html='<b>One comparison run is stored.</b> Change one material, domain, or assumption; calculate again; then add the second run.';
  else html=`<b>${state.comparisons.length} comparison runs are stored.</b> Select a metric in Results, review benchmark applicability, and export the audit file.`;
  $('workflowStatus').innerHTML=html;
  document.querySelectorAll('.workflow-step').forEach((el,i)=>el.classList.toggle('complete',i===0||Boolean(state.result)||(i<3&&Boolean(state.result))));
}
function renderMetadata(){
  const m=state.metadata;
  $('metadataStudyTitle').value=m.study_title||'';$('metadataAnalyst').value=m.analyst||'';$('metadataPurpose').value=m.purpose||'Screening exposure assessment';
  $('metadataTrackingBasis').value=m.tracking_basis||'Mass of selected nanoform entering the technosphere';
  $('metadataBoundary').value=m.system_boundary||'Market input through use, EoL, treatment and environmental release';
  $('metadataAccounting').value=m.accounting_principle||'Consumption-based market input';$('metadataNotes').value=m.notes||'';
}
function qualityScore(row){return ['reliability','geography','temporal','technology','completeness'].reduce((s,k)=>s+Number(row[k]||0),0)/5;}
function qualityClass(score){return score>=4?'High':score>=3?'Moderate':score>=2?'Low':'Very low';}
function cvFromScore(score){if(score>=4.5)return 0.08;if(score>=3.5)return 0.15;if(score>=2.5)return 0.30;if(score>=1.5)return 0.55;return 0.90;}
function uncertaintyProfileMap(){return Object.fromEntries(state.qualityProfile.map(r=>[r.key,Math.max(0,Number(r.cv)||0)]));}
function renderQuality(){
  const headers=['Parameter group','Evidence/source note','Reliability','Geography','Temporal','Technology','Completeness','Mean score','CV'];
  const rows=state.qualityProfile.map((r,i)=>{
    const score=qualityScore(r);
    return `<tr><td><b>${esc(r.group)}</b><br><span class="tag">${esc(r.key)}</span></td><td><input type="text" value="${esc(r.source_note)}" data-quality="${i}.source_note"></td>`+
      ['reliability','geography','temporal','technology','completeness'].map(k=>`<td><input type="number" min="1" max="5" step="1" value="${Number(r[k])}" data-quality="${i}.${k}"></td>`).join('')+
      `<td class="${score>=3?'sum-ok':'sum-bad'}">${fmt(score,2)} (${qualityClass(score)})</td><td><input type="number" min="0" max="2" step="0.01" value="${Number(r.cv)}" data-quality="${i}.cv}"></td></tr>`;
  });
  $('qualityTable').innerHTML=`<thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;
  $('qualityTable').querySelectorAll('[data-quality]').forEach(el=>el.addEventListener('change',()=>{
    const [i,k]=el.dataset.quality.split('.');state.qualityProfile[Number(i)][k]=k==='source_note'?el.value:Number(el.value);renderQuality();clearResults();validate();
  }));
  const scores=state.qualityProfile.map(qualityScore),mean=scores.reduce((a,b)=>a+b,0)/Math.max(scores.length,1),low=state.qualityProfile.filter(r=>qualityScore(r)<2.5).length,avgCv=state.qualityProfile.reduce((a,r)=>a+Number(r.cv||0),0)/Math.max(state.qualityProfile.length,1);
  $('qualitySummary').innerHTML=`<div class="quality-badge"><span>Overall data-quality score</span><b class="${mean>=4?'quality-high':mean>=3?'quality-moderate':'quality-low'}">${fmt(mean,2)} / 5 · ${qualityClass(mean)}</b></div><div class="quality-badge"><span>Low-evidence parameter groups</span><b>${low}</b></div><div class="quality-badge"><span>Mean probabilistic CV</span><b>${fmt(avgCv*100,1)}%</b></div>`;
  renderFitnessFlags();
}
function applyDqiCvs(){state.qualityProfile.forEach(r=>r.cv=cvFromScore(qualityScore(r)));renderQuality();clearResults();validate();}

function renderReleaseForms(){
  const keys=Object.keys(RELEASE_FORM_LABELS);let html=`<thead><tr><th>Environmental medium</th>${keys.map(k=>`<th>${RELEASE_FORM_LABELS[k]} (%)</th>`).join('')}<th>Total</th></tr></thead><tbody>`;
  Object.entries(MEDIUM_LABELS).forEach(([medium,label])=>{const row=state.releaseForms[medium]||{};const total=keys.reduce((s,k)=>s+Number(row[k]||0),0);html+=`<tr><td>${label}</td>${keys.map(k=>`<td><input type="number" min="0" max="100" step="0.1" value="${Number(row[k]||0)}" data-release-form="${medium}.${k}"></td>`).join('')}<td class="${Math.abs(total-100)<.05?'sum-ok':'sum-bad'}">${fmt(total,2)}%</td></tr>`;});
  $('releaseFormTable').innerHTML=html+'</tbody>';
  $('releaseFormTable').querySelectorAll('[data-release-form]').forEach(el=>el.addEventListener('change',()=>{const [m,k]=el.dataset.releaseForm.split('.');state.releaseForms[m][k]=Number(el.value);renderReleaseForms();renderReleaseFormResults();window.KNanoNanoform?.refresh?.();window.KNanoDynamicFate?.refresh?.();validate();}));
}
function currentEnvironmentalReleases(){
  if(!state.result)return null;
  if(state.mode==='dynamic_probabilistic'){const f=state.result.final;return {year:f.year,air:f.air_release_kg_y,surface_water:f.surface_water_release_kg_y,soil:f.soil_release_kg_y};}
  return {year:Number($('baseYear').value),air:state.result.terminal.air,surface_water:state.result.terminal.surface_water,soil:state.result.terminal.soil};
}
function formResolvedRows(releases=currentEnvironmentalReleases()){
  if(!releases)return [];
  const rows=[];Object.keys(MEDIUM_LABELS).forEach(m=>Object.keys(RELEASE_FORM_LABELS).forEach(k=>rows.push({year:releases.year,medium:m,form:k,mass_kg_y:(Number(releases[m])||0)*(Number(state.releaseForms[m]?.[k]||0)/100)})));return rows;
}
function renderReleaseFormResults(){
  const rows=formResolvedRows();if(!rows.length){$('releaseFormResults').innerHTML='<div class="comparison-empty">Run the model to calculate form-resolved releases.</div>';return;}
  $('releaseFormResults').innerHTML=makeTable(['Medium','Release form','kg/y'],rows.map(r=>[MEDIUM_LABELS[r.medium],RELEASE_FORM_LABELS[r.form],fmt(r.mass_kg_y,7)]));
}

function fitnessFlagsData(){
  const flags=[];const qMean=state.qualityProfile.reduce((a,r)=>a+qualityScore(r),0)/Math.max(state.qualityProfile.length,1);
  flags.push({level:qMean>=3?'good':'warn',text:`Overall evidence score is ${fmt(qMean,2)}/5 (${qualityClass(qMean)}).`});
  if(state.mode!=='dynamic_probabilistic')flags.push({level:'warn',text:'Static mode assumes all non-use-released mass reaches EoL in the same accounting year.'});
  else flags.push({level:'good',text:'Dynamic mode uses product cohorts, Weibull lifetimes, delayed EoL, reuse, recycling, and landfill stocks.'});
  const country=currentCountryCode();if(country==='KR')flags.push({level:'good',text:'Korean wastewater and sludge values use the embedded Korean statistical domain dataset; product and nano-specific factors remain screening priors.'});
  else flags.push({level:'warn',text:'The selected non-Korean wastewater, sludge, freshwater, waste, and sludge-management domain is a harmonised screening dataset and should be replaced for a national inventory.'});
  flags.push({level:'warn',text:window.KNanoDynamicFate?.getState?.().enabled?'The optional v2.0.1 fate calculation resolves operational first-order state transitions but remains spatially aggregated and screening-level.':'Base PECs are screening calculations; enable the optional v2.0.1 dynamic fate engine for operational aggregation, dissolution, settling, and remobilization.'});
  const unknown=Math.max(...Object.values(state.releaseForms).map(r=>Number(r.unknown_pct||0)));if(unknown>=15)flags.push({level:'warn',text:`Nanoform-state uncertainty is explicit; the maximum unknown release-form fraction is ${fmt(unknown,1)}%.`});
  if(state.result){const closure=state.mode==='dynamic_probabilistic'?state.result.final.mass_balance_closure_pct:state.result.mass_balance_closure_pct;flags.push({level:Math.abs(closure-100)<1e-5?'good':'bad',text:`Calculated mass-balance closure is ${fmt(closure,8)}%.`});}
  const nf=window.KNanoNanoform?.getOutputs?.();if(nf)flags.push({level:Math.abs(Number(nf.state_balance_closure_pct)-100)<1e-5?'good':'bad',text:`Nanoform-state allocation closure is ${fmt(nf.state_balance_closure_pct,8)}%.`});
  const df=window.KNanoDynamicFate?.getOutputs?.();if(df)flags.push({level:Math.abs(Number(df.mass_balance_closure_pct)-100)<1e-5?'good':'bad',text:`Dynamic nanoform-fate closure is ${fmt(df.mass_balance_closure_pct,8)}%.`});
  return flags;
}
function renderFitnessFlags(){$('fitnessFlags').innerHTML=`<div class="fitness-list">${fitnessFlagsData().map(f=>`<div class="fitness-item ${f.level}">${esc(f.text)}</div>`).join('')}</div>`;}

function initMetricSelectors(){
  $('sensitivityMetric').innerHTML=Object.entries(SENSITIVITY_METRICS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
  $('comparisonMetric').innerHTML=Object.entries(COMPARISON_METRICS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
}
function normalizeKeys(object,keys){const total=keys.reduce((s,k)=>s+Math.max(0,Number(object[k])||0),0);if(total<=0)return;keys.forEach(k=>object[k]=Math.max(0,Number(object[k])||0)/total*100);}
function scaleComposition(object,key,factor,keys){object[key]=Math.max(0,Number(object[key])||0)*factor;normalizeKeys(object,keys);}
function sensitivityBase(){return {products:deepClone(activeCalculationProducts()),eol:deepClone(state.eol),factors:deepClone(state.factors),sludge:deepClone(state.sludge),env:deepClone(state.environment),lifetimes:deepClone(state.lifetimes),dynamicSettings:deepClone(state.dynamicSettings),trajectory:deepClone(effectiveTrajectory()),region:deepClone(currentRegion()),total:effectiveStaticInput()};}
function deterministicFromConfig(c){return state.mode==='dynamic_probabilistic'?E.runDynamicMFA({products:c.products,eol:c.eol,factors:c.factors,sludge:c.sludge,region:c.region,env:c.env,lifetimes:c.lifetimes,dynamicSettings:c.dynamicSettings,trajectory:c.trajectory}):E.runStaticMFA({products:c.products,eol:c.eol,factors:c.factors,sludge:c.sludge,region:c.region,env:c.env,total:c.total});}
function outputFromResult(result,key){
  const dynamic=state.mode==='dynamic_probabilistic',row=dynamic?result.final:null;
  if(key.startsWith('pec.'))return dynamic?E.valueAtPath(row,key):result.pec[key.slice(4)];
  const medium=key.split('.')[1];if(dynamic)return row[`${medium}_release_kg_y`];return result.terminal[medium];
}
function sensitivityCases(){
  const cases=[
    {name:'Market input',apply:(c,f)=>{if(state.mode==='dynamic_probabilistic')c.trajectory.forEach(r=>r.primary_input_kg_y*=f);else c.total*=f;}},
    {name:'Largest product allocation',apply:(c,f)=>{let idx=0;c.products.forEach((r,i)=>{if(Number(r.allocation_pct)>Number(c.products[idx].allocation_pct))idx=i;});c.products[idx].allocation_pct=Math.max(0,Number(c.products[idx].allocation_pct)||0)*f;const vals=c.products.map(r=>Math.max(0,Number(r.allocation_pct)||0)),sum=vals.reduce((a,b)=>a+b,0);c.products.forEach((r,i)=>r.allocation_pct=vals[i]/Math.max(sum,1e-30)*100);}},
    {name:'All use-stage release factors',apply:(c,f)=>c.products.forEach(r=>{const keys=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'];keys.forEach(k=>r[k]*=f);const t=keys.reduce((a,k)=>a+r[k],0);if(t>95)keys.forEach(k=>r[k]*=95/t);})},
    {name:'EoL landfill share',apply:(c,f)=>c.eol.forEach(r=>scaleComposition(r,'landfill_pct',f,['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct']))},
    {name:'WWTP effluent transfer',apply:(c,f)=>scaleComposition(c.factors.WWTP,'effluent',f,Object.keys(c.factors.WWTP))},
    {name:'Incinerator air transfer',apply:(c,f)=>scaleComposition(c.factors.incineration,'air',f,Object.keys(c.factors.incineration))},
    {name:'Sludge-to-soil route',apply:(c,f)=>scaleComposition(c.sludge,'soil_compost',f,Object.keys(c.sludge))},
    {name:'Receiving-water flow',apply:(c,f)=>c.env.river_flow_m3_s*=f},
    {name:'Water-to-sediment transfer',apply:(c,f)=>c.env.water_to_sediment_pct=Math.min(100,c.env.water_to_sediment_pct*f)},
    {name:'Soil residence time',apply:(c,f)=>c.env.soil_residence_time_y*=f},
    {name:'Sediment residence time',apply:(c,f)=>c.env.sediment_residence_time_y*=f}
  ];
  if(state.mode==='dynamic_probabilistic')cases.push({name:'Mean product lifetime',apply:(c,f)=>c.lifetimes.forEach(r=>r.mean_lifetime_y*=f)},{name:'Closed-loop recycling share',apply:(c,f)=>c.dynamicSettings.closed_loop_recycling_pct=Math.min(100,c.dynamicSettings.closed_loop_recycling_pct*f)});
  return cases;
}
async function runSensitivity(){
  if(!state.result)calculate();if(!state.result)return;const key=$('sensitivityMetric').value,delta=Math.max(.01,Math.min(.5,Number($('sensitivityDelta').value||10)/100));
  $('runSensitivityBtn').disabled=true;await new Promise(r=>setTimeout(r,20));
  try{
    const baseConfig=sensitivityBase(),baseResult=deterministicFromConfig(deepClone(baseConfig)),baseline=outputFromResult(baseResult,key),rows=[];
    sensitivityCases().forEach(test=>{const lo=deepClone(baseConfig),hi=deepClone(baseConfig);test.apply(lo,1-delta);test.apply(hi,1+delta);const low=outputFromResult(deterministicFromConfig(lo),key),high=outputFromResult(deterministicFromConfig(hi),key);rows.push({parameter:test.name,low,high,low_change:baseline!==0?(low/baseline-1)*100:0,high_change:baseline!==0?(high/baseline-1)*100:0,range:Math.abs(high-low)});});
    rows.sort((a,b)=>b.range-a.range);state.sensitivity={metric:key,delta,baseline,rows};
    Plotly.react('sensitivityChart',[{type:'bar',orientation:'h',name:`−${delta*100}%`,y:rows.map(r=>r.parameter),x:rows.map(r=>r.low_change)},{type:'bar',orientation:'h',name:`+${delta*100}%`,y:rows.map(r=>r.parameter),x:rows.map(r=>r.high_change)}],{barmode:'group',margin:{l:210,r:25,t:20,b:55},xaxis:{title:'Change in selected output (%)',zeroline:true},yaxis:{autorange:'reversed'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},plotCfg());
    $('sensitivityTable').innerHTML=makeTable(['Parameter group','Low case','High case','Low change (%)','High change (%)'],rows.map(r=>[r.parameter,fmt(r.low,8),fmt(r.high,8),fmt(r.low_change,4),fmt(r.high_change,4)]));
  }catch(e){alert(e.message);}finally{$('runSensitivityBtn').disabled=false;}
}

function comparisonSnapshot(){
  if(!state.result)return null;const dynamic=state.mode==='dynamic_probabilistic',row=dynamic?state.result.final:null,pec=dynamic?row.pec:state.result.pec;
  return {label:`${materialDisplayName()} · ${currentCountry().short_name} · ${currentRegion().region} · ${dynamic?row.year:$('baseYear').value}`,material:materialDisplayName(),country:currentRegion().country,domain:currentRegion().region,mode:state.mode,
    effective_input:dynamic?row.primary_input_kg_y:effectiveStaticInput(),air_release:dynamic?row.air_release_kg_y:state.result.terminal.air,surface_water_release:dynamic?row.surface_water_release_kg_y:state.result.terminal.surface_water,soil_release:dynamic?row.soil_release_kg_y:state.result.terminal.soil,
    surface_water_pec:pec.surface_water_pec_ug_L,soil_pec:pec.soil_pec_ug_kg,sediment_pec:pec.active_sediment_pec_ug_kg,air_pec:pec.air_pec_ng_m3};
}
function addComparison(){const snap=comparisonSnapshot();if(!snap){alert('Run the model before adding a comparison.');return;}state.comparisons.push(snap);if(state.comparisons.length>8)state.comparisons.shift();renderComparison();renderWorkflowGuide();}
function renderComparison(){
  const items=state.comparisons||[],key=$('comparisonMetric')?.value||'surface_water_pec';if(!items.length){$('comparisonChart').innerHTML='';$('comparisonStatus').innerHTML='<b>No runs stored.</b> Calculate the first scenario and click “Add current run to comparison”.';$('comparisonTable').innerHTML='<div class="comparison-empty">A metric can be plotted only after at least one completed run has been stored.</div>';return;}
  $('comparisonStatus').innerHTML=items.length===1?'<b>One run stored.</b> Modify the scenario, calculate again, and add the second run for a meaningful comparison.':`<b>${items.length} runs stored.</b> The selected metric is now plotted below.`;
  const meta=COMPARISON_METRICS[key];Plotly.react('comparisonChart',[{type:'bar',x:items.map(x=>x.label),y:items.map(x=>x[key]),customdata:items.map(x=>[x.material,x.country,x.domain,x.mode]),hovertemplate:'%{x}<br>%{y:.6g} '+meta[1]+'<extra></extra>'}],{margin:{l:75,r:20,t:15,b:150},yaxis:{title:meta[1]},xaxis:{tickangle:-30},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},plotCfg());
  $('comparisonTable').innerHTML=makeTable(['Run','Material','Country/domain','Mode',`${meta[0]} (${meta[1]})`],items.map(x=>[x.label,x.material,`${x.country} / ${x.domain}`,x.mode,fmt(x[key],8)]));
}
function fateInventoryCsv(){
  const headers=['year','material','country','domain','model_mode','medium','release_form','mass_kg_y','tracking_basis','system_boundary'];const rows=[headers.map(csv).join(',')];
  const years=state.mode==='dynamic_probabilistic'?state.result.annual.map(r=>({year:r.year,air:r.air_release_kg_y,surface_water:r.surface_water_release_kg_y,soil:r.soil_release_kg_y})):[currentEnvironmentalReleases()];
  years.forEach(rel=>formResolvedRows(rel).forEach(r=>rows.push([r.year,materialDisplayName(),currentRegion().country,currentRegion().region,state.mode,MEDIUM_LABELS[r.medium],RELEASE_FORM_LABELS[r.form],r.mass_kg_y,state.metadata.tracking_basis,state.metadata.system_boundary].map(csv).join(','))));return rows.join('\n');
}

function validate(){
  readDynamicInputs();
  const dynamic=state.mode==='dynamic_probabilistic';
  const errors=E.validateInputs(activeCalculationProducts(),state.eol,state.factors,state.sludge,dynamic?state.lifetimes:null,dynamic?state.dynamicSettings:null);
  errors.push(...(PI?.validate?.(state.products,dynamic?state.dynamicSettings:null)||[]));
  errors.push(...(window.KNanoNanoform?.validate?.().errors||[]));
  errors.push(...(window.KNanoDynamicFate?.validate?.(window.KNanoDynamicFate?.getState?.(),window.KNanoNanoform?.getState?.()).errors||[]));
  if(dynamic&&(!state.trajectory.length||state.trajectory[0].year!==state.dynamicSettings.start_year||state.trajectory.at(-1).year!==state.dynamicSettings.end_year))errors.push('Regenerate the annual input trajectory after changing the horizon.');
  if(!dynamic&&!PI?.isActive?.()&&(!Number.isFinite(Number($('totalMass').value))||Number($('totalMass').value)<0))errors.push('Market input must be a finite non-negative value.');
  if(!(geographicScale()>0))errors.push('The geographic allocation factor must be positive.');
  Object.entries(state.environment).forEach(([k,v])=>{const n=Number(v);if(k==='water_to_sediment_pct'){if(!Number.isFinite(n)||n<0||n>100)errors.push(`${ENV_LABELS[k]||k} must be between 0 and 100%.`);}else if(!Number.isFinite(n)||n<=0)errors.push(`${ENV_LABELS[k]||k} must be a finite positive value.`);});
  Object.entries(state.releaseForms||{}).forEach(([medium,row])=>{const total=Object.keys(RELEASE_FORM_LABELS).reduce((a,k)=>a+Number(row[k]||0),0);if(Math.abs(total-100)>0.05)errors.push(`${MEDIUM_LABELS[medium]||medium}: release-form fractions total ${total.toFixed(3)}%, not 100%.`);});
  state.qualityProfile.forEach(r=>{if(!(Number(r.cv)>=0))errors.push(`${r.group}: coefficient of variation must be non-negative.`);['reliability','geography','temporal','technology','completeness'].forEach(k=>{if(Number(r[k])<1||Number(r[k])>5)errors.push(`${r.group}: ${k} score must be between 1 and 5.`);});});
  if(isCustomMaterial()&&!String(state.customMaterial?.name||'').trim())errors.push('Custom material name is required.');
  const box=$('validationBox');
  if(errors.length){box.className='validation bad';box.innerHTML=errors.join('<br>');$('calculateBtn').disabled=true;}
  else{box.className='validation ok';box.textContent=PI?.isActive?.()?'Inputs validated. Product-market quantities will be converted to product-specific ENM inputs before geographic allocation.':'Inputs validated. Geography and environmental capacities will be applied.';$('calculateBtn').disabled=false;}
  return errors;
}
function baseArgs(){return {products:activeCalculationProducts(),eol:state.eol,factors:state.factors,sludge:state.sludge,region:currentRegion(),env:state.environment};}
function geographyMetadata(){return {country_code:currentRegion().country_code,country:currentRegion().country,domain_id:currentRegion().domain_id,region:currentRegion().region,input_basis:state.geography.input_basis,input_basis_label:INPUT_BASIS_LABELS[state.geography.input_basis],allocation_factor:geographicScale()};}
function calculate(){
  if(window.KNanoMixture?.isMultiMode?.()){window.KNanoMixture.run();return;}
  readMetadata();if(validate().length)return;
  try{
    if(state.mode==='dynamic_probabilistic'){
      const effective=effectiveTrajectory(),dynArgs={...baseArgs(),trajectory:effective,lifetimes:state.lifetimes,dynamicSettings:state.dynamicSettings};
      const prepared=window.KNanoAdvanced?.prepareDynamicRun?window.KNanoAdvanced.prepareDynamicRun(dynArgs):null;
      if(prepared?.result){state.result=prepared.result;state.result.stock_driven_solution=prepared.diagnostics||null;}
      else state.result=E.runDynamicMFA({...dynArgs,trajectory:prepared?.trajectory||dynArgs.trajectory});
      state.result.geography=geographyMetadata();
      if(PI?.isActive?.()){
        const annualProductInput=prepared?.result?state.result.annual.map(r=>{const allocation=activeCalculationProducts();const total=Math.max(0,Number(r.primary_input_kg_y)||0);const by_product=Object.fromEntries(allocation.map(p=>[p.product_category,total*Math.max(0,Number(p.allocation_pct)||0)/100]));return {year:r.year,total_kg_y:total,by_product};}):effective.map(r=>({year:r.year,total_kg_y:r.primary_input_kg_y,by_product:deepClone(r.product_inputs_kg_y||{})}));
        state.result.product_input={mode:'product_inventory',annual:annualProductInput,stock_driven_allocation:Boolean(prepared?.result)};
      }else state.result.product_input={mode:'direct_enm'};
      renderDynamic();
    }else{
      const prep=preparedStaticInput();state.result=E.runStaticMFA({...baseArgs(),products:prep.products,total:prep.total_kg_y});
      state.result.geography=geographyMetadata();state.result.product_input={mode:prep.mode,total_kg_y:prep.total_kg_y,by_product:deepClone(prep.by_product)};renderStatic();
    }
    PI?.renderResult?.(state.result);state.mc=null;$('mcResults').hidden=true;$('emptyResults').hidden=true;$('resultsArea').hidden=false;renderReleaseFormResults();window.KNanoNanoform?.onModelResult?.(state.result,{mode:state.mode,releaseForms:deepClone(state.releaseForms),environment:deepClone(state.environment),region:deepClone(currentRegion()),material:materialDisplayName()});window.KNanoDynamicFate?.onModelResult?.(state.result,{environment:deepClone(state.environment),region:deepClone(currentRegion()),baseYear:Number($('baseYear').value),material:materialDisplayName()});renderFitnessFlags();renderComparison();renderProvenance();renderBenchmark();renderWorkflowGuide();window.KNanoAdvanced?.onModelResult?.(state.result);switchTab('results');
  }catch(e){alert(e.message);}
}

function htmlCell(value){return {__knano_html:String(value??'')};}
function makeTable(headers,rows){const cell=c=>(c&&typeof c==='object'&&Object.prototype.hasOwnProperty.call(c,'__knano_html'))?c.__knano_html:esc(c);return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function renderKpis(items){$('kpiGrid').innerHTML=items.map(([l,v])=>`<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('');}
function hexToRgba(hex,a){const h=String(hex||'#4e79a7').replace('#','');const n=h.length===3?h.split('').map(x=>x+x).join(''):h;const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);return `rgba(${r},${g},${b},${a})`;}
function sankeyGeometry(flows){
  const nodes=[...new Set(flows.flatMap(f=>[f.source,f.target]))],idx=Object.fromEntries(nodes.map((n,i)=>[n,i]));
  const incoming=Object.fromEntries(nodes.map(n=>[n,[]])),outgoing=Object.fromEntries(nodes.map(n=>[n,[]])),throughput=Object.fromEntries(nodes.map(n=>[n,0]));
  flows.forEach(f=>{incoming[f.target].push(f);outgoing[f.source].push(f);throughput[f.source]+=Number(f.kg_y)||0;throughput[f.target]+=Number(f.kg_y)||0;});
  const indeg=Object.fromEntries(nodes.map(n=>[n,incoming[n].length]));
  const level=Object.fromEntries(nodes.map(n=>[n,0]));
  const queue=nodes.filter(n=>indeg[n]===0).sort((a,b)=>a.localeCompare(b));
  while(queue.length){
    const n=queue.shift();
    outgoing[n].forEach(f=>{const t=f.target;level[t]=Math.max(level[t],level[n]+1);indeg[t]-=1;if(indeg[t]===0)queue.push(t);});
  }
  const unresolved=nodes.filter(n=>indeg[n]>0);
  unresolved.forEach(n=>{const guess=(incoming[n][0]&&level[incoming[n][0].source]+1)||0;level[n]=Math.max(level[n],guess);});
  const maxLevel=Math.max(1,...nodes.map(n=>level[n]));
  const groups={};
  nodes.forEach(n=>{(groups[level[n]]??=[]).push(n);});
  const palette=['#334155','#0f766e','#7c3aed','#ea580c','#64748b','#0891b2'];
  const xArr=new Array(nodes.length).fill(0.5),yArr=new Array(nodes.length).fill(0.5),nodeColors=new Array(nodes.length).fill(palette[0]);
  Object.entries(groups).forEach(([lev,arr])=>{
    const levNum=Number(lev);arr.sort((a,b)=>(throughput[b]-throughput[a])||a.localeCompare(b));
    const x=arr.length===1?(levNum/maxLevel)*0.96+0.02:(levNum/maxLevel)*0.96+0.02;
    arr.forEach((n,i)=>{
      const y=(i+1)/(arr.length+1);const j=idx[n];xArr[j]=x;yArr[j]=y;nodeColors[j]=palette[levNum%palette.length];
    });
  });
  return {nodes,idx,xArr,yArr,nodeColors};
}
function sankey(divId,flows,total){
  const {nodes,idx,xArr,yArr,nodeColors}=sankeyGeometry(flows);
  const linkColors=flows.map(f=>hexToRgba(nodeColors[idx[f.source]],0.42));
  Plotly.react(divId,[{
    type:'sankey',arrangement:'fixed',valueformat:'.5g',valuesuffix:' kg',
    node:{
      label:nodes,pad:18,thickness:18,x:xArr,y:yArr,
      color:nodeColors,line:{color:'rgba(23,33,31,0.28)',width:0.7},
      hovertemplate:'%{label}<extra></extra>'
    },
    link:{
      source:flows.map(f=>idx[f.source]),target:flows.map(f=>idx[f.target]),value:flows.map(f=>f.kg_y),
      color:linkColors,label:flows.map(f=>`${f.source} → ${f.target}`),
      customdata:flows.map(f=>total>0?f.kg_y/total*100:0),
      hovertemplate:'<b>%{source.label} → %{target.label}</b><br>Mass flow: %{value:.5g} kg<br>Share of regional input: %{customdata:.3f}%<extra></extra>'
    }
  }],{margin:{l:18,r:18,t:10,b:10},paper_bgcolor:'rgba(0,0,0,0)',font:{size:12}},{responsive:true,displaylogo:false});
}
function renderStatic(){
  const r=state.result,total=effectiveStaticInput();
  renderKpis([
    ['Model',state.mode==='static_probabilistic'?'Static probabilistic (base run)':'Static deterministic'],
    ['Country',currentRegion().country],['Domain',currentRegion().region],['Domain input',mass(total,true)],
    ['Environmental release',mass(r.terminal.air+r.terminal.surface_water+r.terminal.soil,true)],
    ['Mass-balance closure',`${fmt(r.mass_balance_closure_pct,6)}%`]
  ]);
  sankey('staticSankeyChart',r.flows,total);
  const entries=Object.entries(r.terminal).sort((a,b)=>b[1]-a[1]);
  Plotly.react('terminalChart',[{type:'bar',x:entries.map(x=>x[1]),y:entries.map(x=>TERMINAL_LABELS[x[0]]),orientation:'h',hovertemplate:'%{y}<br>%{x:.6g} kg/y<extra></extra>'}],{margin:{l:190,r:35,t:25,b:90},xaxis:{title:axisTitle('Terminal destination mass flow (kg/y)'),automargin:true,ticks:'outside',showline:true,linewidth:1,zeroline:false},yaxis:{autorange:'reversed',automargin:true,ticks:'outside',showline:true,linewidth:1},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},plotCfg());
  $('terminalTable').innerHTML=makeTable(['Destination','kg/y','Regional input (%)'],entries.map(([k,v])=>[TERMINAL_LABELS[k],fmt(v,6),fmt(v/Math.max(total,1e-30)*100,5)]));
  $('pecTable').innerHTML=makeTable(['Medium / process','PEC or concentration','Unit'],Object.entries(r.pec).map(([k,v])=>[PEC_NAMES[k]?.[0]||k,fmt(v,8),PEC_NAMES[k]?.[1]||'']));
  $('flowTable').innerHTML=makeTable(['Source','Target','kg/y','Regional input (%)'],r.flows.map(f=>[f.source,f.target,fmt(f.kg_y,6),fmt(f.kg_y/Math.max(total,1e-30)*100,5)]));
}
function line(name,x,y){if(y===undefined){y=x;x=undefined;}const trace={type:'scatter',mode:'lines',name,y};if(Array.isArray(x))trace.x=x;return trace;}
function axisTitle(text){return {text,standoff:16,font:{size:14}};}
function layout(yTitle,x){const shown=x.filter((_,i)=>i%Math.max(1,Math.ceil(x.length/10))===0);return {margin:{l:100,r:30,t:24,b:88},xaxis:{title:axisTitle('Calendar year (year)'),automargin:true,ticks:'outside',tickmode:'array',tickvals:shown,ticktext:shown.map(String),showline:true,linewidth:1,zeroline:false},yaxis:{title:axisTitle(yTitle),automargin:true,ticks:'outside',showline:true,linewidth:1,zeroline:false},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',legend:{orientation:'h',y:-0.24}};}
function plotCfg(){return {responsive:true,displaylogo:false};}
function renderDynamic(){
  const a=state.result.annual,final=state.result.final,years=a.map(r=>r.year);
  renderKpis([
    ['Model','Dynamic probabilistic (base trajectory)'],['Country',currentRegion().country],['Domain',currentRegion().region],['Period',`${a[0].year}–${final.year}`],
    ['Cumulative domain input',mass(final.cumulative_primary_input_kg)],['Mass-balance closure',`${fmt(final.mass_balance_closure_pct,6)}%`]
  ]);
  Plotly.react('dynamicFlowChart',[line('Primary regional input',years,a.map(r=>r.primary_input_kg_y)),line('Secondary input',years,a.map(r=>r.secondary_input_kg_y)),line('Use release',years,a.map(r=>r.use_release_kg_y)),line('EoL generation',years,a.map(r=>r.eol_generation_kg_y))],layout('Annual mass flow (kg/y)',years),plotCfg());
  Plotly.react('stockChart',[line('In-use stock',years,a.map(r=>r.in_use_stock_kg)),line('Reuse stock',years,a.map(r=>r.reuse_stock_kg)),line('Landfill stock',years,a.map(r=>r.landfill_stock_kg)),line('Delayed recycled feedstock',years,a.map(r=>r.recycled_feedstock_stock_kg))],layout('Stock mass (kg)',years),plotCfg());
  Plotly.react('releaseChart',[line('Air',years,a.map(r=>r.air_release_kg_y)),line('Surface water',years,a.map(r=>r.surface_water_release_kg_y)),line('Soil',years,a.map(r=>r.soil_release_kg_y))],layout('Annual release (kg/y)',years),plotCfg());
  $('resultYearSelect').innerHTML=years.map(y=>`<option>${y}</option>`).join('');$('resultYearSelect').value=final.year;renderDynamicYear(final.year);
  renderDynamicPec();
  $('dynamicTable').innerHTML=makeTable(['Year','Primary regional input','Secondary input','Use release','EoL','Air','Water','Soil','In-use stock','Reuse stock','Landfill stock','Closure (%)'],a.map(r=>[r.year,fmt(r.primary_input_kg_y,5),fmt(r.secondary_input_kg_y,5),fmt(r.use_release_kg_y,5),fmt(r.eol_generation_kg_y,5),fmt(r.air_release_kg_y,5),fmt(r.surface_water_release_kg_y,5),fmt(r.soil_release_kg_y,5),fmt(r.in_use_stock_kg,5),fmt(r.reuse_stock_kg,5),fmt(r.landfill_stock_kg,5),fmt(r.mass_balance_closure_pct,6)]));
}
function renderDynamicPec(){
  if(!state.result)return;
  const sel=$('dynamicPecMetricSelect');
  if(!sel.options.length)sel.innerHTML=DYNAMIC_PEC_KEYS.map(k=>`<option value="${k}">${PEC_NAMES[k][0]}</option>`).join('');
  if(!DYNAMIC_PEC_KEYS.includes(sel.value))sel.value='surface_water_pec_ug_L';
  const key=sel.value,a=state.result.annual,years=a.map(r=>r.year),unit=PEC_NAMES[key][1];
  const pecAxisTitle=unit?`${PEC_NAMES[key][0]} (${unit})`:PEC_NAMES[key][0];
  Plotly.react('dynamicPecChart',[line(PEC_NAMES[key][0],years,a.map(r=>r.pec[key]))],layout(pecAxisTitle,years),plotCfg());
  $('dynamicPecTable').innerHTML=makeTable(['Year',...DYNAMIC_PEC_KEYS.map(k=>`${PEC_NAMES[k][0]} (${PEC_NAMES[k][1]})`)],a.map(r=>[r.year,...DYNAMIC_PEC_KEYS.map(k=>fmt(r.pec[k],8))]));
}
function renderDynamicYear(year){const r=state.result.annual.find(x=>x.year===Number(year));sankey('sankeyChart',r.flows,r.total_product_input_kg_y||r.primary_input_kg_y||1);}

async function runMC(){
  if(state.mode==='static_deterministic'){alert('Select Static probabilistic MFA or Dynamic probabilistic MFA to run uncertainty analysis.');return;}
  if(!state.result)calculate();if(!state.result)return;
  const iterations=Math.max(100,Math.min(1500,Number($('mcIterations').value)||300)),seed=Number($('mcSeed').value)||42,rsd=Number($('mcRsd').value)||.2;
  $('runMcBtn').disabled=true;$('mcStatus').textContent=' Running…';await new Promise(r=>setTimeout(r,20));
  try{
    if(state.mode==='static_probabilistic'){
      const prep=preparedStaticInput();state.mc=E.runStaticMonteCarlo({iterations,seed,rsd,uncertaintyProfile:uncertaintyProfileMap(),baseArgs:{...baseArgs(),total:prep.total_kg_y,products:prep.products,eol:state.eol,factors:state.factors,sludge:state.sludge,product_input_uncertainty:PI?.isActive?.()?PI.uncertaintyRows(prep.by_product):null}});renderStaticMC();
    }else{
      const metrics=Object.keys(DYNAMIC_METRICS),adv=window.KNanoAdvanced?.getState?.();
      const effTrajectory=effectiveTrajectory(),firstBy=effTrajectory[0]?.product_inputs_kg_y||{};const common={seed,rsd,lifetimeRsd:Number($('lifetimeRsd').value)||.2,uncertaintyProfile:uncertaintyProfileMap(),metrics,baseArgs:{...baseArgs(),trajectory:effTrajectory,lifetimes:state.lifetimes,dynamicSettings:state.dynamicSettings,products:activeCalculationProducts(),eol:state.eol,factors:state.factors,sludge:state.sludge,product_input_uncertainty:PI?.isActive?.()?PI.uncertaintyRows(firstBy):null}};
      if(adv?.dynamic_driver==='stock_driven'){
        const stockIterations=Math.min(iterations,100);state.mc=E.runStockDrivenMonteCarlo({...common,iterations:stockIterations,targetTrajectory:adv.target_stock});$('mcStatus').textContent=` Stock-driven simulation capped at ${stockIterations} iterations; `;
      }else state.mc=E.runDynamicMonteCarlo({...common,iterations,growthSdPct:Number($('growthSd').value)||0});
      renderDynamicMC();
    }
    $('mcResults').hidden=false;resizeVisiblePlots();$('mcStatus').textContent=` Completed (${Number(state.mc?.iterations||iterations).toLocaleString('en-US')} iterations${state.mc?.model==='stock_driven_dynamic_probabilistic'?' · stock-driven inverse solution':''})`;
  }catch(e){alert(e.message);$('mcStatus').textContent=' Error';}finally{$('runMcBtn').disabled=false;}
}
function renderStaticMC(){
  const entries=Object.entries(state.mc.terminal).sort((a,b)=>b[1].P50-a[1].P50);
  Plotly.react('mcTerminalChart',[{type:'bar',x:entries.map(x=>x[1].P50),y:entries.map(x=>TERMINAL_LABELS[x[0]]),orientation:'h',error_x:{type:'data',symmetric:false,array:entries.map(x=>x[1].P95-x[1].P50),arrayminus:entries.map(x=>x[1].P50-x[1].P5)},hovertemplate:'%{y}<br>P50: %{x:.6g} kg/y<extra></extra>'}],{margin:{l:190,r:40,t:25,b:90},xaxis:{title:axisTitle('Terminal destination mass flow (kg/y)'),automargin:true,ticks:'outside',showline:true,linewidth:1,zeroline:false},yaxis:{autorange:'reversed',automargin:true,ticks:'outside',showline:true,linewidth:1},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},plotCfg());
  $('mcTerminalTable').innerHTML=makeTable(['Destination','P5','P50','P95'],entries.map(([k,v])=>[TERMINAL_LABELS[k],fmt(v.P5,6),fmt(v.P50,6),fmt(v.P95,6)]));
  $('mcPecTable').innerHTML=makeTable(['Metric','Unit','P5','P50','P95'],Object.entries(state.mc.pec).map(([k,v])=>[PEC_NAMES[k]?.[0]||k,PEC_NAMES[k]?.[1]||'',fmt(v.P5,8),fmt(v.P50,8),fmt(v.P95,8)]));
}
function renderDynamicMC(){const sel=$('dynamicMetricSelect');sel.innerHTML=Object.entries(DYNAMIC_METRICS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');sel.value='pec.surface_water_pec_ug_L';renderDynamicMetric();renderDynamicFinalTable();}
function metricUnit(key){
  if(key==='mass_balance_closure_pct')return '%';
  if(key.startsWith('pec.'))return PEC_NAMES[key.slice(4)]?.[1]||'';
  if(key.includes('stock'))return 'kg';
  return 'kg/y';
}
function renderDynamicMetric(){
  if(!state.mc)return;
  const key=$('dynamicMetricSelect').value,series=state.mc.metrics[key],years=state.mc.years,p5=series.map(x=>x.P5),p50=series.map(x=>x.P50),p95=series.map(x=>x.P95);
  const dynamicMetricLabel=DYNAMIC_METRICS[key]||key;
  const dynamicMetricUnit=metricUnit(key);
  const dynamicAxisTitle=dynamicMetricUnit?`${dynamicMetricLabel} (${dynamicMetricUnit})`:dynamicMetricLabel;
  Plotly.react('dynamicMcChart',[{type:'scatter',x:years,y:p95,mode:'lines',line:{width:0},showlegend:false,hoverinfo:'skip'},{type:'scatter',x:years,y:p5,mode:'lines',fill:'tonexty',name:'P5–P95',line:{width:0},hoverinfo:'skip'},{type:'scatter',x:years,y:p50,mode:'lines',name:'P50'}],{margin:{l:100,r:30,t:24,b:88},xaxis:{title:axisTitle('Calendar year (year)'),automargin:true,ticks:'outside',showline:true,linewidth:1,zeroline:false},yaxis:{title:axisTitle(dynamicAxisTitle),automargin:true,ticks:'outside',showline:true,linewidth:1,zeroline:false},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',legend:{orientation:'h',y:-0.24}},plotCfg());
}
function renderDynamicFinalTable(){
  const i=state.mc.years.length-1;
  $('dynamicMcTable').innerHTML=makeTable(['Metric','Unit','P5','P50','P95'],Object.entries(DYNAMIC_METRICS).map(([k,l])=>{const v=state.mc.metrics[k][i];return [l,metricUnit(k),fmt(v.P5,7),fmt(v.P50,7),fmt(v.P95,7)];}));
}

function scenario(){readMetadata();if(isCustomMaterial()){readCustomIdentity(false);registerCustomRuntime();}return {app:'K-NanoMFA',version:'2.0.1-en',software_metadata:deepClone(APP_INFO),language:'English',interface_view:interfaceView,default_provenance:provenanceRows(),advanced:window.KNanoAdvanced?.getState?.()||null,mixture:window.KNanoMixture?.getState?.()||null,product_inventory:PI?.getState?.()||null,nanoform:window.KNanoNanoform?.getState?.()||null,dynamic_fate:window.KNanoDynamicFate?.getState?.()||null,mode:state.mode,material:state.material,material_display_name:materialDisplayName(),customMaterial:isCustomMaterial()?deepClone(state.customMaterial):null,custom_geography:window.KNanoGeography?.getDefinition?.(currentRegion().country_code)||null,country_code:currentRegion().country_code,domain_id:currentRegion().domain_id,region:currentRegion().region,geography:state.geography,totalMass:Number($('totalMass').value),baseYear:Number($('baseYear').value),metadata:state.metadata,qualityProfile:state.qualityProfile,uncertaintyProfile:uncertaintyProfileMap(),releaseForms:state.releaseForms,products:state.products,eol:state.eol,factors:state.factors,sludge:state.sludge,lifetimes:state.lifetimes,environment:state.environment,dynamicSettings:state.dynamicSettings,trajectory:state.trajectory};}
function applyScenario(x,notify=true){
  if(!x||typeof x!=='object')throw new Error('The scenario file is empty or invalid.');
  const allowedModes=new Set(['static_deterministic','static_probabilistic','dynamic_probabilistic']);
  const requestedMode=allowedModes.has(x.mode)?x.mode:'static_deterministic';
  const requestedMaterial=(x.customMaterial||x.material===CUSTOM_MATERIAL_KEY)?CUSTOM_MATERIAL_KEY:x.material;
  if(requestedMaterial!==CUSTOM_MATERIAL_KEY&&!D.MATERIAL_SCENARIOS[requestedMaterial])throw new Error('Unsupported material in the scenario file.');
  if(x.custom_geography)window.KNanoGeography?.registerDefinition?.(x.custom_geography);
  const legacyRegion=D.REGION_DATA.find(r=>r.region===x.region||r.domain_id===x.domain_id);
  const code=x.country_code||legacyRegion?.country_code||'KR';
  if(!D.COUNTRY_DOMAINS[code])throw new Error(`Unsupported country code in the scenario file: ${code}.`);
  state.mode=requestedMode;state.material=requestedMaterial;
  if(state.material===CUSTOM_MATERIAL_KEY){
    state.customMaterial={...defaultCustomMaterial(),...deepClone(x.customMaterial||{}),name:x.material_display_name||x.customMaterial?.name||'Custom nanomaterial'};
    state.customMaterial.definition=deepClone(state.customMaterial.definition||{products:x.products,eol:x.eol,factors:x.factors,lifetimes:x.lifetimes,releaseForms:x.releaseForms});
    const d=state.customMaterial.definition;
    if(!d||!Array.isArray(d.products)||!Array.isArray(d.eol)||!d.factors||!Array.isArray(d.lifetimes))throw new Error('The custom-material definition is incomplete.');
    registerCustomRuntime(d);const opt=[...$('materialSelect').options].find(o=>o.value===CUSTOM_MATERIAL_KEY);if(opt)opt.text=`Custom: ${state.customMaterial.name}`;
  }
  $('modelMode').value=state.mode;$('materialSelect').value=state.material;populateCountrySelect(code);$('countrySelect').value=code;
  const fallbackDomain=D.COUNTRY_DOMAINS[code].national_domain_id;
  const preferred=x.domain_id||x.region||fallbackDomain;
  populateRegionSelect(preferred);
  if(!D.REGION_DATA.some(r=>r.country_code===code&&r.domain_id===$('regionSelect').value))populateRegionSelect(fallbackDomain);
  state.geography={input_basis:'national_population',apply_country_waste_preset:true,...deepClone(x.geography||{input_basis:x.inputBasis||'national_population'})};
  if(!Object.prototype.hasOwnProperty.call(INPUT_BASIS_LABELS,state.geography.input_basis))state.geography.input_basis='national_population';
  $('inputBasis').value=state.geography.input_basis;$('countryWasteToggle').checked=Boolean(state.geography.apply_country_waste_preset);updateCountryLabels();
  const total=Number(x.totalMass??1000),baseYear=Number(x.baseYear??2024);
  $('totalMass').value=Number.isFinite(total)?total:1000;$('baseYear').value=Number.isFinite(baseYear)?baseYear:2024;
  const built=state.material===CUSTOM_MATERIAL_KEY?state.customMaterial.definition:D.MATERIAL_SCENARIOS[state.material];
  state.products=deepClone(x.products||built.products);state.eol=deepClone(x.eol||built.eol);
  state.factors=deepClone(x.factors||(state.material===CUSTOM_MATERIAL_KEY?built.factors:D.PROCESS_FACTOR_LIBRARY[state.material]));state.sludge=deepClone(x.sludge||countrySludgePreset());
  state.lifetimes=deepClone(x.lifetimes||(state.material===CUSTOM_MATERIAL_KEY?built.lifetimes:D.LIFETIME_DEFAULTS[state.material]));
  state.releaseForms=deepClone(x.releaseForms||(state.material===CUSTOM_MATERIAL_KEY?built.releaseForms:D.RELEASE_FORM_DEFAULTS?.[state.material])||D.RELEASE_FORM_DEFAULTS?.CNT||{});
  PI?.loadState?.(x.product_inventory||null,state.products,Number(x.totalMass??1000));if(PI?.isActive?.())PI.syncAllocationToProducts(state.products);
  state.qualityProfile=deepClone(x.qualityProfile||QUALITY_DEFAULTS);state.metadata={...state.metadata,...deepClone(x.metadata||{})};
  state.environment={...regionDefaults(),...(deepClone(x.environment||{}))};state.dynamicSettings={...state.dynamicSettings,...deepClone(x.dynamicSettings||{})};
  state.trajectory=deepClone(x.trajectory||(PI?.isActive?.()?PI.buildTrajectory(state.products,state.dynamicSettings.start_year,state.dynamicSettings.end_year):E.buildTrajectory(state.dynamicSettings)));
  $('materialDescription').textContent=isCustomMaterial()?state.customMaterial.description:D.MATERIAL_SCENARIOS[state.material].description;renderCustomMaterialPanel();
  syncDynamicInputs();renderEditors();renderEnvironment();renderTrajectory();renderGeography();renderProductSummary();renderMetadata();renderQuality();renderReleaseForms();renderProvenance();renderBenchmark();renderWorkflowGuide();setMode(state.mode);validate();
  if(x.advanced){if(window.KNanoAdvanced?.loadState)window.KNanoAdvanced.loadState(x.advanced);else window.__KNANO_PENDING_ADVANCED_STATE=deepClone(x.advanced);}
  if(x.mixture){if(window.KNanoMixture?.loadState)window.KNanoMixture.loadState(x.mixture);else window.__KNANO_PENDING_MIXTURE_STATE=deepClone(x.mixture);}
  {const nf=x.nanoform||(window.KNanoNanoform?.defaultState?.()||null);if(nf){if(window.KNanoNanoform?.loadState)window.KNanoNanoform.loadState(nf);else window.__KNANO_PENDING_NANOFORM_STATE=deepClone(nf);}}
  {const df=x.dynamic_fate||(window.KNanoDynamicFate?.defaultState?.()||null);if(df){if(window.KNanoDynamicFate?.loadState)window.KNanoDynamicFate.loadState(df);else window.__KNANO_PENDING_DYNAMIC_FATE_STATE=deepClone(df);}}
  if(x.interface_view)setInterfaceView(x.interface_view,false);
  if(notify)alert('Scenario imported successfully. Review any validation messages before running the model.');
}
function download(name,text,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function csv(v){return `"${String(v).replaceAll('"','""')}"`;}
function resizeVisiblePlots(){requestAnimationFrame(()=>setTimeout(()=>{document.querySelectorAll('.tab-page.active .js-plotly-plot:not([hidden]), .tab-page.active [id$=Chart].js-plotly-plot').forEach(el=>{try{Plotly.Plots.resize(el);}catch(_){}});},80));}
function updateWorkspaceNavigation(tabName=null){
  const selected=tabName||document.querySelector('.tab.active')?.dataset.tab||lastTabByStage[activeStage];activeStage=stageForTab(selected);lastTabByStage[activeStage]=selected;
  document.querySelectorAll('.stage-tab').forEach(x=>x.classList.toggle('active',x.dataset.stage===activeStage));
  const info=WORKSPACE_STAGES[activeStage];if($('stageTitle'))$('stageTitle').textContent=info.title;if($('stageDescription'))$('stageDescription').textContent=info.description;
  document.querySelectorAll('.workspace-tabs .tab').forEach(x=>{x.hidden=interfaceView==='guided'&&x.dataset.stage!==activeStage;});
  if($('showAllWorkspacesBtn'))$('showAllWorkspacesBtn').textContent=interfaceView==='all'?'Use guided stages':'Show all workspaces';
  if($('interfaceView'))$('interfaceView').value=interfaceView;
}
function setInterfaceView(view,persist=true){interfaceView=view==='all'?'all':'guided';if(persist){try{localStorage.setItem('K-NanoMFA-v20-interface-view',interfaceView);}catch(_){}}updateWorkspaceNavigation();}
function switchStage(stage){if(!WORKSPACE_STAGES[stage])return;activeStage=stage;switchTab(lastTabByStage[stage]||WORKSPACE_STAGES[stage].tabs[0]);}
function switchTab(name){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id===`tab-${name}`));updateWorkspaceNavigation(name);resizeVisiblePlots();}

function bind(){
  $('modelMode').onchange=e=>setMode(e.target.value);
  document.querySelectorAll('.model-card').forEach(x=>x.onclick=()=>setMode(x.dataset.mode));
  $('materialSelect').onchange=e=>loadMaterial(e.target.value);
  $('initializeCustomBtn').onclick=()=>initializeCustomFromTemplate($('customTemplateSelect').value,true);
  $('applyCustomIdentityBtn').onclick=readCustomIdentity;
  $('saveCustomDefaultsBtn').onclick=saveCustomDefaults;
  $('restoreCustomDefaultsBtn').onclick=restoreCustomDefaults;
  ['customMaterialName','customMaterialDescription','customFatePreset','customBenchmarkProxy','customEvidenceClass','customSource','customSourceUrl','customEvidenceNote'].forEach(id=>$(id).addEventListener('change',readCustomIdentity));
  $('countrySelect').onchange=()=>refreshGeographySelection();
  $('regionSelect').onchange=()=>{state.environment=regionDefaults();renderEnvironment();renderGeography();renderTrajectory();renderProvenance();renderBenchmark();renderWorkflowGuide();clearResults();validate();};
  $('countryWasteToggle').onchange=e=>{state.geography.apply_country_waste_preset=e.target.checked;state.eol=isCustomMaterial()?customDefaultBlock('eol',state.eol):deepClone(D.MATERIAL_SCENARIOS[state.material].eol);if(e.target.checked)applyCountryWastePreset(false);renderEol();renderProductSummary();clearResults();validate();};
  $('inputBasis').onchange=e=>{state.geography.input_basis=e.target.value;renderGeography();renderTrajectory();clearResults();validate();};
  $('totalMass').oninput=()=>{renderEffectiveInput();clearResults();validate();};
  $('displayUnit').onchange=()=>renderEffectiveInput();
  $('calculateBtn').onclick=calculate;
  document.querySelectorAll('.tab').forEach(x=>x.onclick=()=>switchTab(x.dataset.tab));
  document.querySelectorAll('.stage-tab').forEach(x=>x.onclick=()=>switchStage(x.dataset.stage));
  document.querySelectorAll('[data-guide-tab]').forEach(x=>x.onclick=()=>switchTab(x.dataset.guideTab));
  document.querySelectorAll('[data-guide-stage]').forEach(x=>x.onclick=()=>switchStage(x.dataset.guideStage));
  $('interfaceView').onchange=e=>setInterfaceView(e.target.value);$('showAllWorkspacesBtn').onclick=()=>setInterfaceView(interfaceView==='all'?'guided':'all');
  $('editProductsBtn').onclick=()=>switchTab('lifecycle');
  $('addProductBtn').onclick=addProductCategory;
  $('normalizeProductsBtn').onclick=()=>{const t=state.products.reduce((a,r)=>a+Number(r.allocation_pct),0);if(t>0)state.products.forEach(r=>r.allocation_pct=r.allocation_pct/t*100);renderProducts();renderProductSummary();clearResults();validate();};
  $('applyCountryWasteBtn').onclick=()=>{state.geography.apply_country_waste_preset=true;$('countryWasteToggle').checked=true;applyCountryWastePreset();};
  $('resetSludgeBtn').onclick=()=>{state.sludge=deepClone(countrySludgePreset());renderSludge();clearResults();validate();};
  $('resetFactorsBtn').onclick=()=>{state.factors=isCustomMaterial()?customDefaultBlock('factors',state.factors):deepClone(D.PROCESS_FACTOR_LIBRARY[state.material]);renderFactors();clearResults();validate();};
  $('regionDefaultsBtn').onclick=()=>{state.environment=regionDefaults();renderEnvironment();clearResults();validate();};
  $('generateTrajectoryBtn').onclick=generateTrajectory;
  ['startYear','endYear','initialInput','annualGrowth','closedLoopPct','recyclingDelay','reuseDelay','initialLandfillStock'].forEach(id=>$(id).onchange=()=>{readDynamicInputs();renderEffectiveInput();clearResults();validate();});
  $('resultYearSelect').onchange=e=>renderDynamicYear(e.target.value);
  $('dynamicPecMetricSelect').onchange=renderDynamicPec;
  $('runMcBtn').onclick=runMC;$('dynamicMetricSelect').onchange=renderDynamicMetric;
  $('runSensitivityBtn').onclick=runSensitivity;
  $('applyDqiCvBtn').onclick=applyDqiCvs;$('resetQualityBtn').onclick=()=>{state.qualityProfile=deepClone(QUALITY_DEFAULTS);renderQuality();clearResults();validate();};
  $('resetReleaseFormsBtn').onclick=()=>{state.releaseForms=isCustomMaterial()?customDefaultBlock('releaseForms',state.releaseForms):deepClone(D.RELEASE_FORM_DEFAULTS?.[state.material]||D.RELEASE_FORM_DEFAULTS?.CNT||{});renderReleaseForms();renderReleaseFormResults();window.KNanoNanoform?.refresh?.();window.KNanoDynamicFate?.refresh?.();validate();};
  ['metadataStudyTitle','metadataAnalyst','metadataPurpose','metadataTrackingBasis','metadataBoundary','metadataAccounting','metadataNotes'].forEach(id=>$(id).addEventListener('change',readMetadata));
  $('addComparisonBtn').onclick=addComparison;$('clearComparisonBtn').onclick=()=>{state.comparisons=[];renderComparison();renderWorkflowGuide();};$('comparisonMetric').onchange=renderComparison;$('runBenchmarkBtn').onclick=renderBenchmark;
  $('saveLocalBtn').onclick=()=>{try{localStorage.setItem('K-NanoMFA-v20-en',JSON.stringify(scenario()));alert('Scenario saved in this browser.');}catch(e){alert('Browser storage is unavailable. Use Export scenario JSON instead.');}};
  $('exportScenarioBtn').onclick=()=>download(`K-NanoMFA_${safeFilePart(materialDisplayName())}_${state.mode}_scenario_v20.json`,JSON.stringify(scenario(),null,2),'application/json');
  $('importScenario').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{applyScenario(JSON.parse(r.result));}catch(err){alert(err.message);}};r.readAsText(f);};
  $('downloadCsvBtn').onclick=()=>{const rows=['source,target,kg_y',...state.result.flows.map(f=>[f.source,f.target,f.kg_y].map(csv).join(','))];download(`K-NanoMFA_${safeFilePart(materialDisplayName())}_${safeFilePart(currentRegion().region)}_static_flows.csv`,rows.join('\n'),'text/csv;charset=utf-8');};
  $('downloadDynamicCsvBtn').onclick=()=>{
    const keys=['year','primary_input_kg_y','secondary_input_kg_y','total_product_input_kg_y','use_release_kg_y','eol_generation_kg_y','wwtp_input_kg_y','incineration_input_kg_y','landfill_inflow_kg_y','air_release_kg_y','surface_water_release_kg_y','soil_release_kg_y','recovery_output_kg_y','transformation_loss_kg_y','in_use_stock_kg','reuse_stock_kg','landfill_stock_kg','recycled_feedstock_stock_kg','soil_media_stock_kg','sediment_media_stock_kg','pec.air_pec_ng_m3','pec.surface_water_pec_ug_L','pec.soil_pec_ug_kg','pec.active_sediment_pec_ug_kg','pec.wwtp_effluent_concentration_ug_L','pec.sewage_sludge_concentration_ug_kg_dry','opening_technosphere_stock_kg','cumulative_primary_input_kg','cumulative_accounted_input_kg','cumulative_external_sinks_kg','mass_balance_residual_kg','mass_balance_closure_pct'];
    const rows=[keys.join(','),...state.result.annual.map(r=>keys.map(k=>k.includes('.')?E.valueAtPath(r,k):r[k]).join(','))];
    download(`K-NanoMFA_${safeFilePart(materialDisplayName())}_${safeFilePart(currentRegion().region)}_dynamic_annual.csv`,rows.join('\n'),'text/csv;charset=utf-8');
  };
  $('downloadResultsBtn').onclick=()=>download(`K-NanoMFA_${safeFilePart(materialDisplayName())}_${state.mode}_audit_v20.json`,JSON.stringify({...scenario(),fitness_flags:fitnessFlagsData(),form_resolved_releases:formResolvedRows(),result:state.result,uncertainty:state.mc,sensitivity:state.sensitivity,comparison_runs:state.comparisons,benchmark_validation:benchmarkAuditData(),advanced_outputs:window.KNanoAdvanced?.getOutputs?.()||null,mixture_outputs:window.KNanoMixture?.getOutputs?.()||null,nanoform_outputs:window.KNanoNanoform?.getOutputs?.()||null,dynamic_fate_outputs:window.KNanoDynamicFate?.getOutputs?.()||null,dynamic_fate_uncertainty:window.KNanoDynamicFate?.getUncertainty?.()||null},null,2),'application/json');
  $('downloadFateInventoryBtn').onclick=()=>{if(!state.result){alert('Run the model before exporting the fate-input inventory.');return;}download(`K-NanoMFA_${safeFilePart(materialDisplayName())}_${safeFilePart(currentRegion().domain_id)}_fate_input_v20.csv`,fateInventoryCsv(),'text/csv;charset=utf-8');};
  $('downloadPngBtn').onclick=()=>Plotly.downloadImage($('staticSankeyChart'),{format:'png',filename:`K-NanoMFA_${safeFilePart(materialDisplayName())}_${safeFilePart(currentRegion().region)}_static_Sankey`,width:1600,height:900});
}

window.KNanoApp={state,D,E,PI,$,deepClone,currentRegion,nationalRegion,geographicScale,preparedStaticInput,effectiveStaticInput,effectiveTrajectory,activeCalculationProducts,baseArgs,calculate,scenario,applyScenario,download,makeTable,fmt,mass,renderDynamic,renderStatic,renderTrajectory,renderEffectiveInput,clearResults,validate,switchTab,switchStage,setInterfaceView,populateCountrySelect,refreshGeographySelection,sensitivityBase,deterministicFromConfig,outputFromResult,scaleComposition,geographyMetadata,materialDisplayName,isCustomMaterial,registerCustomRuntime,refreshInputViews,generateProductTrajectory};
document.addEventListener('DOMContentLoaded',init);
})();
