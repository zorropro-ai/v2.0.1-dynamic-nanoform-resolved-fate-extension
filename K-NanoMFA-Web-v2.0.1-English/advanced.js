(function(){
'use strict';
const A=window.KNanoApp,E=window.KNanoEngine,D=window.KNanoData;
if(!A||!E)throw new Error('K-NanoMFA advanced module requires app.js and engine.js.');
const $=id=>document.getElementById(id),clone=E.deepClone;
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(v,d=5)=>A.fmt(v,d);
const pct=x=>Math.max(0,Number(x)||0)/100;

const METRICS={
 'pec.surface_water_pec_ug_L':['Surface-water PEC','µg/L'],
 'pec.air_pec_ng_m3':['Air PEC','ng/m³'],
 'pec.soil_pec_ug_kg':['Soil PEC','µg/kg dry'],
 'pec.active_sediment_pec_ug_kg':['Active-sediment PEC','µg/kg dry'],
 'pec.wwtp_effluent_concentration_ug_L':['WWTP effluent concentration','µg/L'],
 'pec.sewage_sludge_concentration_ug_kg_dry':['Sewage-sludge concentration','µg/kg dry'],
 'release.air':['Air release','kg/y'],
 'release.surface_water':['Surface-water release','kg/y'],
 'release.soil':['Soil release','kg/y'],
 'stock.in_use':['In-use stock','kg'],
 'stock.landfill':['Landfill stock','kg']
};
const FATE_RATE_LABELS={
 air_advective_y:'Air advective loss',air_to_water_y:'Air deposition to water',air_to_soil_y:'Air deposition to soil',air_transformation_y:'Air transformation',
 water_advective_y:'Water advective outflow',water_to_sediment_y:'Water sedimentation',water_to_soil_y:'Water transfer to soil',water_transformation_y:'Water transformation / dissolution',
 soil_to_water_y:'Soil runoff to water',soil_to_sediment_y:'Soil erosion to sediment',soil_to_air_y:'Soil resuspension to air',soil_burial_y:'Soil burial / deep transfer',soil_transformation_y:'Soil transformation',
 sediment_to_water_y:'Sediment resuspension to water',sediment_burial_y:'Sediment burial',sediment_transformation_y:'Sediment transformation'
};
const FATE_PRESETS={
 'Persistent carbonaceous':{water_residence_time_days:30,substeps_per_year:12,air_advective_y:120,air_to_water_y:20,air_to_soil_y:30,air_transformation_y:.02,water_advective_y:12,water_to_sediment_y:8,water_to_soil_y:.2,water_transformation_y:.03,soil_to_water_y:.03,soil_to_sediment_y:.02,soil_to_air_y:.005,soil_burial_y:.03,soil_transformation_y:.01,sediment_to_water_y:.12,sediment_burial_y:.08,sediment_transformation_y:.008},
 'Persistent mineral oxide':{water_residence_time_days:30,substeps_per_year:12,air_advective_y:120,air_to_water_y:25,air_to_soil_y:35,air_transformation_y:.03,water_advective_y:12,water_to_sediment_y:12,water_to_soil_y:.3,water_transformation_y:.08,soil_to_water_y:.04,soil_to_sediment_y:.03,soil_to_air_y:.003,soil_burial_y:.04,soil_transformation_y:.03,sediment_to_water_y:.1,sediment_burial_y:.1,sediment_transformation_y:.02},
 'Dissolving metal / oxide':{water_residence_time_days:20,substeps_per_year:24,air_advective_y:120,air_to_water_y:25,air_to_soil_y:30,air_transformation_y:.15,water_advective_y:18,water_to_sediment_y:6,water_to_soil_y:.2,water_transformation_y:2.0,soil_to_water_y:.08,soil_to_sediment_y:.03,soil_to_air_y:.002,soil_burial_y:.04,soil_transformation_y:.5,sediment_to_water_y:.15,sediment_burial_y:.1,sediment_transformation_y:.3},
 'Biodegradable nanomaterial':{water_residence_time_days:15,substeps_per_year:24,air_advective_y:120,air_to_water_y:20,air_to_soil_y:25,air_transformation_y:.8,water_advective_y:24,water_to_sediment_y:3,water_to_soil_y:.2,water_transformation_y:4,soil_to_water_y:.06,soil_to_sediment_y:.02,soil_to_air_y:.002,soil_burial_y:.03,soil_transformation_y:1.5,sediment_to_water_y:.2,sediment_burial_y:.08,sediment_transformation_y:1.0}
};
const MATERIAL_FATE_PRESET={'CNT':'Persistent carbonaceous','Carbon black':'Persistent carbonaceous','Graphene':'Persistent carbonaceous','Fullerenes':'Persistent carbonaceous','AgNP':'Dissolving metal / oxide','nano-ZnO':'Dissolving metal / oxide','nano-TiO2':'Persistent mineral oxide','nano-SiO2':'Persistent mineral oxide','Nanoclay':'Persistent mineral oxide','Nanocellulose':'Biodegradable nanomaterial'};
const LCA_DEFAULTS=[
 {key:'primary_production',label:'Primary nanomaterial production',factor:15,unit:'kg CO₂e/kg primary input'},
 {key:'WWTP',label:'Wastewater treatment',factor:.2,unit:'kg CO₂e/kg handled'},
 {key:'incineration',label:'Incineration',factor:1,unit:'kg CO₂e/kg handled'},
 {key:'landfill',label:'Landfill',factor:.1,unit:'kg CO₂e/kg handled'},
 {key:'recycling',label:'Recycling',factor:.5,unit:'kg CO₂e/kg handled'},
 {key:'reuse',label:'Reuse preparation',factor:.1,unit:'kg CO₂e/kg handled'},
 {key:'biological_treatment',label:'Biological treatment',factor:.2,unit:'kg CO₂e/kg handled'},
 {key:'avoided_primary_credit',label:'Avoided primary-production credit',factor:8,unit:'kg CO₂e/kg recovered output'}
];
function defaultState(){
 const preset=A.state.material==='__CUSTOM__'?(A.state.customMaterial?.fate_preset||'Persistent mineral oxide'):(MATERIAL_FATE_PRESET[A.state.material]||'Persistent mineral oxide');
 return {
  trade:{enabled:false,static:{imports_kg_y:0,exports_kg_y:0,inventory_change_kg_y:0},annual:[],partners:[{partner:'China',import_share_pct:40,export_share_pct:20},{partner:'United States',import_share_pct:20,export_share_pct:25},{partner:'European Union',import_share_pct:25,export_share_pct:35},{partner:'Other',import_share_pct:15,export_share_pct:20}]},
  dynamic_driver:'inflow_driven',target_stock_initial_kg:2000,target_stock_growth_pct:5,stock_tolerance:0.0001,target_stock:[],stock_solution:null,
  reconciliation:{mode:'bayesian',rows:[],result:null},calibration:{parameter:'market_input',metric:'pec.surface_water_pec_ug_L',observed:1,obs_cv:.2,prior_cv:.5,range:[.1,5],result:null},
  fate:{preset,rates:clone(FATE_PRESETS[preset]),initial:{air:0,water:0,soil:0,sediment:0},result:null},validation:{rows:[],result:null},lca:{factors:clone(LCA_DEFAULTS),result:null}
 };
}
let state=defaultState();

function mergeState(x){
 const d=defaultState();state={...d,...clone(x||{})};
 state.trade={...d.trade,...clone(x?.trade||{})};state.trade.static={...d.trade.static,...clone(x?.trade?.static||{})};
 state.reconciliation={...d.reconciliation,...clone(x?.reconciliation||{})};state.calibration={...d.calibration,...clone(x?.calibration||{})};
 state.fate={...d.fate,...clone(x?.fate||{})};state.fate.rates={...d.fate.rates,...clone(x?.fate?.rates||{})};state.fate.initial={...d.fate.initial,...clone(x?.fate?.initial||{})};
 state.validation={...d.validation,...clone(x?.validation||{})};state.lca={...d.lca,...clone(x?.lca||{})};
}
function getState(){return clone(state);}
function getOutputs(){return clone({trade:tradeAudit(),stock_solution:state.stock_solution,reconciliation:state.reconciliation.result,calibration:state.calibration.result,multimedia_fate:state.fate.result,validation:state.validation.result,lca_screening:state.lca.result});}
function loadState(x){mergeState(x);renderAll();}
function setFatePreset(name,resetRates=true){
  const selected=FATE_PRESETS[name]?name:'Persistent mineral oxide';
  state.fate.preset=selected;if(resetRates)state.fate.rates=clone(FATE_PRESETS[selected]);
  if($('fatePreset'))renderFate();
}
function getFatePresetNames(){return Object.keys(FATE_PRESETS);}

function yearTrade(year){
 const r=state.trade.annual.find(x=>Number(x.year)===Number(year));return r||{year,imports_kg_y:0,exports_kg_y:0,inventory_change_kg_y:0};
}
function adjustStaticInput(production,year){
 if(!state.trade.enabled)return production;const t=state.trade.static;return Math.max(0,production+(Number(t.imports_kg_y)||0)-(Number(t.exports_kg_y)||0)-(Number(t.inventory_change_kg_y)||0));
}
function adjustTrajectory(rows){
 if(!state.trade.enabled)return clone(rows);return rows.map(r=>{const t=yearTrade(r.year);return {...r,primary_input_kg_y:Math.max(0,Number(r.primary_input_kg_y)+(Number(t.imports_kg_y)||0)-(Number(t.exports_kg_y)||0)-(Number(t.inventory_change_kg_y)||0))};});
}
function tradeAudit(){
 return {enabled:state.trade.enabled,formula:'apparent consumption = domestic production + imports - exports - technosphere inventory increase',static:clone(state.trade.static),annual:clone(state.trade.annual),partners:clone(state.trade.partners)};
}
function syncTradeYears(){
 const years=A.state.trajectory.map(r=>Number(r.year));const old=Object.fromEntries(state.trade.annual.map(r=>[Number(r.year),r]));
 state.trade.annual=years.map(year=>({year,imports_kg_y:Number(old[year]?.imports_kg_y)||0,exports_kg_y:Number(old[year]?.exports_kg_y)||0,inventory_change_kg_y:Number(old[year]?.inventory_change_kg_y)||0}));renderTrade();
}
function renderTrade(){
 $('tradeEnabled').checked=state.trade.enabled;$('tradeImportsStatic').value=state.trade.static.imports_kg_y;$('tradeExportsStatic').value=state.trade.static.exports_kg_y;$('tradeInventoryStatic').value=state.trade.static.inventory_change_kg_y;
 const production=Number($('totalMass').value)||0,cons=adjustStaticInput(production,Number($('baseYear').value));
 $('tradeStaticSummary').innerHTML=`<span>National apparent consumption</span><b>${fmt(cons)} kg/y</b><small>${fmt(production)} + ${fmt(state.trade.static.imports_kg_y)} − ${fmt(state.trade.static.exports_kg_y)} − ${fmt(state.trade.static.inventory_change_kg_y)}</small>`;
 if(!state.trade.annual.length)syncTradeYears();
 $('tradeAnnualTable').innerHTML='<thead><tr><th>Year</th><th>Imports (kg/y)</th><th>Exports (kg/y)</th><th>Inventory increase (kg/y)</th><th>Net trade adjustment</th></tr></thead><tbody>'+state.trade.annual.map((r,i)=>`<tr><td>${r.year}</td><td><input type="number" min="0" value="${r.imports_kg_y}" data-trade="${i}.imports_kg_y"></td><td><input type="number" min="0" value="${r.exports_kg_y}" data-trade="${i}.exports_kg_y"></td><td><input type="number" value="${r.inventory_change_kg_y}" data-trade="${i}.inventory_change_kg_y"></td><td>${fmt(r.imports_kg_y-r.exports_kg_y-r.inventory_change_kg_y)}</td></tr>`).join('')+'</tbody>';
 $('tradeAnnualTable').querySelectorAll('input').forEach(el=>el.onchange=()=>{const [i,k]=el.dataset.trade.split('.');state.trade.annual[+i][k]=Number(el.value)||0;renderTrade();A.renderEffectiveInput();A.clearResults();});
 $('tradePartnerTable').innerHTML='<thead><tr><th>Partner</th><th>Import share (%)</th><th>Export share (%)</th><th></th></tr></thead><tbody>'+state.trade.partners.map((r,i)=>`<tr><td><input type="text" value="${esc(r.partner)}" data-partner="${i}.partner"></td><td><input type="number" min="0" value="${r.import_share_pct}" data-partner="${i}.import_share_pct"></td><td><input type="number" min="0" value="${r.export_share_pct}" data-partner="${i}.export_share_pct"></td><td><button class="icon-button" data-remove-partner="${i}">Remove</button></td></tr>`).join('')+'</tbody>';
 $('tradePartnerTable').querySelectorAll('[data-partner]').forEach(el=>el.onchange=()=>{const [i,k]=el.dataset.partner.split('.');state.trade.partners[+i][k]=k==='partner'?el.value:Number(el.value)||0;renderTradeMatrix();});
 $('tradePartnerTable').querySelectorAll('[data-remove-partner]').forEach(el=>el.onclick=()=>{state.trade.partners.splice(+el.dataset.removePartner,1);renderTrade();});renderTradeMatrix();
}
function renderTradeMatrix(){
 const y=A.state.mode==='dynamic_probabilistic'?(A.state.trajectory[0]?.year||A.state.dynamicSettings.start_year):Number($('baseYear').value),t=A.state.mode==='dynamic_probabilistic'?yearTrade(y):state.trade.static;
 const rows=state.trade.partners.map(r=>[r.partner,fmt((Number(t.imports_kg_y)||0)*pct(r.import_share_pct)),fmt((Number(t.exports_kg_y)||0)*pct(r.export_share_pct)),fmt((Number(t.imports_kg_y)||0)*pct(r.import_share_pct)-(Number(t.exports_kg_y)||0)*pct(r.export_share_pct))]);
 const is=state.trade.partners.reduce((a,r)=>a+Number(r.import_share_pct||0),0),es=state.trade.partners.reduce((a,r)=>a+Number(r.export_share_pct||0),0);
 $('tradeMatrixPreview').innerHTML=`<p class="small muted">Preview year ${y}; import shares ${fmt(is,2)}%, export shares ${fmt(es,2)}%.</p>`+A.makeTable(['Partner','Imports (kg/y)','Exports (kg/y)','Net import'],rows);
}

function generateTargetStock(){
 const start=Number(A.state.dynamicSettings.start_year),end=Number(A.state.dynamicSettings.end_year),initial=Math.max(0,Number($('targetStockInitial').value)||0),g=(Number($('targetStockGrowth').value)||0)/100;
 state.target_stock=[];for(let y=start;y<=end;y++)state.target_stock.push({year:y,target_stock_kg:initial*Math.pow(1+g,y-start)});renderStockDriven();
}
function renderStockDriven(){
 $('dynamicDriver').value=state.dynamic_driver;$('targetStockInitial').value=state.target_stock_initial_kg;$('targetStockGrowth').value=state.target_stock_growth_pct;$('stockTolerance').value=state.stock_tolerance;
 $('stockDrivenSettings').hidden=state.dynamic_driver!=='stock_driven';
 const years=A.state.trajectory.map(r=>Number(r.year));if(!state.target_stock.length||state.target_stock[0]?.year!==years[0]||state.target_stock.at(-1)?.year!==years.at(-1))generateTargetStock();
 $('targetStockTable').innerHTML='<thead><tr><th>Year</th><th>Target end-of-year in-use stock (kg)</th></tr></thead><tbody>'+state.target_stock.map((r,i)=>`<tr><td>${r.year}</td><td><input type="number" min="0" value="${r.target_stock_kg}" data-target-stock="${i}"></td></tr>`).join('')+'</tbody>';
 $('targetStockTable').querySelectorAll('input').forEach(el=>el.onchange=()=>{state.target_stock[+el.dataset.targetStock].target_stock_kg=Math.max(0,Number(el.value)||0);A.clearResults();});renderStockDiagnostics();
}
function prepareDynamicRun(args){
 if(state.dynamic_driver!=='stock_driven')return null;
 const years=args.trajectory.map(r=>Number(r.year));
 if(!state.target_stock.length||Number(state.target_stock[0]?.year)!==years[0]||Number(state.target_stock.at(-1)?.year)!==years.at(-1)){const initial=Math.max(0,Number(state.target_stock_initial_kg)||0),g=(Number(state.target_stock_growth_pct)||0)/100;state.target_stock=years.map((year,i)=>({year,target_stock_kg:initial*Math.pow(1+g,i)}));}
 const solution=E.solveStockDrivenTrajectory({...args,targetTrajectory:state.target_stock,toleranceRelative:Math.max(1e-8,Number(state.stock_tolerance)||1e-4)});
 const scale=Math.max(A.geographicScale(),1e-30);
 solution.diagnostics.forEach(r=>{const t=yearTrade(r.year),nationalConsumption=r.required_primary_input_kg_y/scale;r.required_national_apparent_consumption_kg_y=nationalConsumption;r.implied_domestic_production_kg_y=state.trade.enabled?Math.max(0,nationalConsumption-(Number(t.imports_kg_y)||0)+(Number(t.exports_kg_y)||0)+(Number(t.inventory_change_kg_y)||0)):nationalConsumption;});
 state.stock_solution=solution.diagnostics;return {result:solution.result,trajectory:solution.trajectory,diagnostics:solution.diagnostics};
}
function renderStockDiagnostics(){
 if(!state.stock_solution){$('stockDrivenDiagnostics').innerHTML='<p class="small muted">Run the dynamic model to calculate required primary inflows.</p>';return;}
 const headers=['Year','Target stock','Achieved stock','Gap','Required domain apparent consumption','Implied national production','Status'];
 $('stockDrivenDiagnostics').innerHTML=A.makeTable(headers,state.stock_solution.map(r=>[r.year,fmt(r.target_stock_kg),fmt(r.achieved_stock_kg),fmt(r.stock_gap_kg),fmt(r.required_primary_input_kg_y),fmt(r.implied_domestic_production_kg_y??r.required_primary_input_kg_y),r.status]));
}

function loadCurrentBalance(){
 if(!A.state.result){alert('Run the MFA model before loading a reconciliation balance.');return;}
 const cv=.2,rows=[];
 if(A.state.mode==='dynamic_probabilistic'){
  const f=A.state.result.final;rows.push({name:'Cumulative primary input',role:'inflow',model_value:f.cumulative_primary_input_kg,model_cv:cv,observed_value:'',observed_cv:.1});
  [['In-use stock',f.in_use_stock_kg],['Reuse stock',f.reuse_stock_kg],['Landfill stock',f.landfill_stock_kg],['Delayed recycled feedstock',f.recycled_feedstock_stock_kg]].forEach(([n,v])=>rows.push({name:n,role:'stock_change',model_value:v,model_cv:cv,observed_value:'',observed_cv:.15}));
  rows.push({name:'Cumulative external sinks',role:'outflow',model_value:f.cumulative_external_sinks_kg,model_cv:cv,observed_value:'',observed_cv:.15});
 }else{
  rows.push({name:'Effective domain input',role:'inflow',model_value:A.effectiveStaticInput(),model_cv:cv,observed_value:'',observed_cv:.1});
  Object.entries(A.state.result.terminal).forEach(([k,v])=>rows.push({name:k.replaceAll('_',' '),role:k.includes('stock')?'stock_change':'outflow',model_value:v,model_cv:.25,observed_value:'',observed_cv:.2}));
 }
 state.reconciliation.rows=rows;state.reconciliation.result=null;renderReconciliation();
}
function renderReconciliation(){
 $('reconciliationMode').value=state.reconciliation.mode;
 $('reconciliationTable').innerHTML='<thead><tr><th>Flow</th><th>Role</th><th>Model</th><th>Model CV</th><th>Observed</th><th>Observation CV</th><th></th></tr></thead><tbody>'+state.reconciliation.rows.map((r,i)=>`<tr><td><input type="text" value="${esc(r.name)}" data-rec="${i}.name"></td><td><select data-rec="${i}.role"><option value="inflow" ${r.role==='inflow'?'selected':''}>Inflow</option><option value="outflow" ${r.role==='outflow'?'selected':''}>Outflow</option><option value="stock_change" ${r.role==='stock_change'?'selected':''}>Stock increase</option></select></td><td><input type="number" min="0" value="${r.model_value}" data-rec="${i}.model_value"></td><td><input type="number" min="0" value="${r.model_cv}" data-rec="${i}.model_cv"></td><td><input type="number" min="0" value="${r.observed_value}" data-rec="${i}.observed_value"></td><td><input type="number" min="0" value="${r.observed_cv}" data-rec="${i}.observed_cv"></td><td><button class="icon-button" data-remove-rec="${i}">Remove</button></td></tr>`).join('')+'</tbody>';
 $('reconciliationTable').querySelectorAll('[data-rec]').forEach(el=>el.onchange=()=>{const [i,k]=el.dataset.rec.split('.');state.reconciliation.rows[+i][k]=['name','role'].includes(k)?el.value:(el.value===''?'':Number(el.value));});
 $('reconciliationTable').querySelectorAll('[data-remove-rec]').forEach(el=>el.onclick=()=>{state.reconciliation.rows.splice(+el.dataset.removeRec,1);renderReconciliation();});renderReconciliationResult();
}
function runReconciliation(){
 try{state.reconciliation.mode=$('reconciliationMode').value;state.reconciliation.result=E.reconcileBalance(state.reconciliation.rows,{mode:state.reconciliation.mode});renderReconciliationResult();}catch(e){alert(e.message);}
}
function renderReconciliationResult(){
 const r=state.reconciliation.result;if(!r){$('reconciliationSummary').innerHTML='';$('reconciliationResults').innerHTML='';return;}
 $('reconciliationSummary').innerHTML=`<div><span>Closure residual</span><b>${fmt(r.balance_residual,8)} kg</b></div><div><span>Closure adjustment χ²</span><b>${fmt(r.chi_square,5)}</b></div>`;
 $('reconciliationResults').innerHTML=A.makeTable(['Flow','Prior/observed estimate','Reconciled','Adjustment','Standardized adjustment','Observation z'],r.rows.map(x=>[x.name,fmt(x.estimate),fmt(x.reconciled_value),fmt(x.adjustment),fmt(x.standardized_adjustment),x.observation_z===null?'–':fmt(x.observation_z)]));
}

function metricValue(result,key){
 const dynamic=A.state.mode==='dynamic_probabilistic',row=dynamic?result.final:null;
 if(key.startsWith('pec.'))return dynamic?E.valueAtPath(row,key):result.pec[key.slice(4)];
 if(key==='release.air')return dynamic?row.air_release_kg_y:result.terminal.air;
 if(key==='release.surface_water')return dynamic?row.surface_water_release_kg_y:result.terminal.surface_water;
 if(key==='release.soil')return dynamic?row.soil_release_kg_y:result.terminal.soil;
 if(key==='stock.in_use')return dynamic?row.in_use_stock_kg:0;if(key==='stock.landfill')return dynamic?row.landfill_stock_kg:result.terminal.landfill_stock;return 0;
}
function runConfig(config){
 if(A.state.mode==='dynamic_probabilistic')return E.runDynamicMFA({products:config.products,eol:config.eol,factors:config.factors,sludge:config.sludge,region:config.region,env:config.env,lifetimes:config.lifetimes,dynamicSettings:config.dynamicSettings,trajectory:config.trajectory});
 return E.runStaticMFA({products:config.products,eol:config.eol,factors:config.factors,sludge:config.sludge,region:config.region,env:config.env,total:config.total});
}
function patchCalibration(config,param,m){
 if(param==='market_input'){if(A.state.mode==='dynamic_probabilistic')config.trajectory.forEach(r=>r.primary_input_kg_y*=m);else config.total*=m;}
 else if(param==='use_release')config.products.forEach(r=>{const keys=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'];keys.forEach(k=>r[k]*=m);const t=keys.reduce((a,k)=>a+r[k],0);if(t>95)keys.forEach(k=>r[k]*=95/t);});
 else if(param==='wwtp_effluent')A.scaleComposition(config.factors.WWTP,'effluent',m,Object.keys(config.factors.WWTP));
 else if(param==='river_flow')config.env.river_flow_m3_s*=m;
 else if(param==='mean_lifetime'&&config.lifetimes)config.lifetimes.forEach(r=>r.mean_lifetime_y*=m);
}
function lognormalSigma(cv){return Math.sqrt(Math.log(1+cv*cv));}
function lognormalLogPdf(x,mean,cv){if(!(x>0&&mean>0))return -Infinity;const s=lognormalSigma(cv),mu=Math.log(mean)-.5*s*s;return -Math.log(x*s*Math.sqrt(2*Math.PI))-.5*((Math.log(x)-mu)/s)**2;}
function weightedQuantile(xs,ws,p){const a=xs.map((x,i)=>[x,ws[i]]).sort((a,b)=>a[0]-b[0]),tot=ws.reduce((x,y)=>x+y,0);let c=0;for(const [x,w] of a){c+=w;if(c>=tot*p)return x;}return a.at(-1)[0];}
async function runCalibration(){
 if(state.dynamic_driver==='stock_driven'&&A.state.mode==='dynamic_probabilistic'){alert('Bayesian scalar calibration is disabled in stock-driven mode because each parameter sample would require a new inverse cohort solution. Switch temporarily to inflow-driven mode.');return;}
 if(!A.state.result)A.calculate();if(!A.state.result)return;
 const param=$('calibrationParameter').value,metric=$('calibrationMetric').value,obs=Math.max(1e-30,Number($('calibrationObserved').value)||0),ocv=Math.max(.01,Number($('calibrationObsCv').value)||.2),pcv=Math.max(.01,Number($('calibrationPriorCv').value)||.5);
 if(param==='mean_lifetime'&&A.state.mode!=='dynamic_probabilistic'){alert('Mean lifetime does not affect the static model. Select Dynamic probabilistic MFA for this calibration target.');return;}
 const parts=$('calibrationRange').value.split(',').map(Number),lo=Math.max(.001,parts[0]||.1),hi=Math.max(lo*1.01,parts[1]||5),n=121,base=A.sensitivityBase(),xs=[],pred=[],lw=[];
 $('runCalibrationBtn').disabled=true;await new Promise(r=>setTimeout(r,20));
 try{for(let i=0;i<n;i++){const m=Math.exp(Math.log(lo)+(Math.log(hi)-Math.log(lo))*i/(n-1)),c=clone(base);patchCalibration(c,param,m);const y=Math.max(1e-30,metricValue(runConfig(c),metric));xs.push(m);pred.push(y);lw.push(lognormalLogPdf(m,1,pcv)+lognormalLogPdf(obs,y,ocv));}
 const max=Math.max(...lw),w=lw.map(x=>Math.exp(x-max)),sw=w.reduce((a,b)=>a+b,0),wn=w.map(x=>x/sw),mean=xs.reduce((a,x,i)=>a+x*wn[i],0),median=weightedQuantile(xs,wn,.5),p025=weightedQuantile(xs,wn,.025),p975=weightedQuantile(xs,wn,.975),predMean=pred.reduce((a,x,i)=>a+x*wn[i],0);
 state.calibration={parameter:param,metric,observed:obs,obs_cv:ocv,prior_cv:pcv,range:[lo,hi],result:{posterior_mean_multiplier:mean,posterior_median_multiplier:median,p025,p975,posterior_mean_prediction:predMean,grid:xs.map((x,i)=>({multiplier:x,prediction:pred[i],posterior_weight:wn[i]}))}};renderCalibrationResult();$('applyCalibrationBtn').disabled=false;
 }catch(e){alert(e.message);}finally{$('runCalibrationBtn').disabled=false;}
}
function applyCalibration(){const r=state.calibration.result;if(!r)return;const m=r.posterior_mean_multiplier,p=state.calibration.parameter;if(!(Number.isFinite(m)&&m>0)){alert('The calibration result is invalid and cannot be applied.');return;}if(p==='market_input'){if(A.state.mode==='dynamic_probabilistic')A.state.trajectory.forEach(x=>x.primary_input_kg_y*=m);else $('totalMass').value=Number($('totalMass').value)*m;}else if(p==='use_release'){A.state.products.forEach(x=>{const keys=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'];keys.forEach(k=>x[k]*=m);const t=keys.reduce((a,k)=>a+x[k],0);if(t>95)keys.forEach(k=>x[k]*=95/t);});}else if(p==='wwtp_effluent')A.scaleComposition(A.state.factors.WWTP,'effluent',m,Object.keys(A.state.factors.WWTP));else if(p==='river_flow')A.state.environment.river_flow_m3_s*=m;else if(p==='mean_lifetime')A.state.lifetimes.forEach(x=>x.mean_lifetime_y*=m);A.refreshInputViews?.();alert('Posterior mean applied. The visible input editors were refreshed; review them and rerun the model.');}
function renderCalibrationResult(){
 const r=state.calibration.result;if(!r){$('calibrationResults').innerHTML='';Plotly.purge('calibrationChart');return;}
 Plotly.react('calibrationChart',[{type:'scatter',mode:'lines',x:r.grid.map(x=>x.multiplier),y:r.grid.map(x=>x.posterior_weight),fill:'tozeroy',name:'Posterior density (discrete)'}],{margin:{l:60,r:20,t:20,b:50},xaxis:{title:'Parameter multiplier',type:'log'},yaxis:{title:'Posterior weight'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});
 $('calibrationResults').innerHTML=A.makeTable(['Posterior statistic','Value'],[['Mean multiplier',fmt(r.posterior_mean_multiplier)],['Median multiplier',fmt(r.posterior_median_multiplier)],['95% credible interval',`${fmt(r.p025)}–${fmt(r.p975)}`],['Posterior mean prediction',fmt(r.posterior_mean_prediction)],['Observed value',fmt(state.calibration.observed)]]);
}

function applyFatePreset(){const name=$('fatePreset').value||MATERIAL_FATE_PRESET[A.state.material];state.fate.preset=name;state.fate.rates=clone(FATE_PRESETS[name]);renderFate();}
function renderFate(){
 $('fatePreset').innerHTML=Object.keys(FATE_PRESETS).map(x=>`<option ${x===state.fate.preset?'selected':''}>${x}</option>`).join('');
 const r=state.fate.rates;$('fateWaterResidence').value=r.water_residence_time_days;$('fateSubsteps').value=r.substeps_per_year;$('fateInitialAir').value=state.fate.initial.air;$('fateInitialWater').value=state.fate.initial.water;$('fateInitialSoil').value=state.fate.initial.soil;$('fateInitialSediment').value=state.fate.initial.sediment;
 $('fateRateTable').innerHTML='<thead><tr><th>Process</th><th>First-order rate (y⁻¹)</th></tr></thead><tbody>'+Object.keys(FATE_RATE_LABELS).map(k=>`<tr><td>${FATE_RATE_LABELS[k]}</td><td><input type="number" min="0" step="0.001" value="${r[k]}" data-fate-rate="${k}"></td></tr>`).join('')+'</tbody>';
 $('fateRateTable').querySelectorAll('input').forEach(el=>el.onchange=()=>{state.fate.rates[el.dataset.fateRate]=Math.max(0,Number(el.value)||0);state.fate.result=null;renderFateResult();});renderFateResult();
}
function runFate(){
 if(!A.state.result){alert('Run the MFA model first.');return;}const rates={...state.fate.rates,water_residence_time_days:Number($('fateWaterResidence').value),substeps_per_year:Number($('fateSubsteps').value)};state.fate.rates=rates;state.fate.initial={air:Number($('fateInitialAir').value)||0,water:Number($('fateInitialWater').value)||0,soil:Number($('fateInitialSoil').value)||0,sediment:Number($('fateInitialSediment').value)||0};
 if(A.state.mode==='dynamic_probabilistic'){
  const annual=A.state.result.annual.map(r=>({year:r.year,air:r.air_release_kg_y,water:r.surface_water_release_kg_y,soil:r.soil_release_kg_y,sediment:0}));state.fate.result=E.runMultimediaFateDynamic({annualEmissions:annual,region:A.currentRegion(),env:A.state.environment,fate:rates,initialStocks:state.fate.initial});
 }else{const t=A.state.result.terminal;state.fate.result=E.runMultimediaFateStatic({emissions:{air:t.air,water:t.surface_water,soil:t.soil,sediment:0},region:A.currentRegion(),env:A.state.environment,fate:rates,initialStocks:state.fate.initial});}
 renderFateResult();
}
function renderFateResult(){
 const r=state.fate.result;if(!r){$('fateKpis').innerHTML='';$('fateResults').innerHTML='';Plotly.purge('fateChart');return;}
 const final=r.final||r,c=final.concentrations,stocks=final.stocks_kg;
 $('fateKpis').innerHTML=[['Mode',r.mode],['Air PEC',`${fmt(c.air_pec_ng_m3,7)} ng/m³`],['Water PEC',`${fmt(c.surface_water_pec_ug_L,7)} µg/L`],['Soil PEC',`${fmt(c.soil_pec_ug_kg,7)} µg/kg`],['Sediment PEC',`${fmt(c.active_sediment_pec_ug_kg,7)} µg/kg`]].map(([l,v])=>`<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('');
 if(r.annual){const y=r.annual.map(x=>x.year);Plotly.react('fateChart',Object.entries({Air:'air_pec_ng_m3','Surface water':'surface_water_pec_ug_L','Soil':'soil_pec_ug_kg','Sediment':'active_sediment_pec_ug_kg'}).map(([name,k])=>({type:'scatter',mode:'lines',name,x:y,y:r.annual.map(x=>x.concentrations[k])})),{margin:{l:70,r:20,t:20,b:50},xaxis:{title:'Year'},yaxis:{title:'PEC (mixed units; use hover)'},legend:{orientation:'h'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});}
 else Plotly.react('fateChart',[{type:'bar',x:Object.values(stocks),y:['Air','Water','Soil','Sediment'],orientation:'h'}],{margin:{l:100,r:20,t:20,b:50},xaxis:{title:'Steady-state stock (kg)'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});
 $('fateResults').innerHTML=A.makeTable(['Compartment','Stock (kg)','PEC','Unit'],[['Air',fmt(stocks.air),fmt(c.air_pec_ng_m3),'ng/m³'],['Water',fmt(stocks.water),fmt(c.surface_water_pec_ug_L),'µg/L'],['Soil',fmt(stocks.soil),fmt(c.soil_pec_ug_kg),'µg/kg'],['Sediment',fmt(stocks.sediment),fmt(c.active_sediment_pec_ug_kg),'µg/kg']]);
}

function renderValidation(){
 $('validationDataTable').innerHTML='<thead><tr><th>Metric</th><th>Year</th><th>Observed</th><th>CV</th><th></th></tr></thead><tbody>'+state.validation.rows.map((r,i)=>`<tr><td><select data-val="${i}.metric">${Object.entries(METRICS).map(([k,v])=>`<option value="${k}" ${k===r.metric?'selected':''}>${v[0]} (${v[1]})</option>`).join('')}</select></td><td><input type="number" value="${r.year??''}" data-val="${i}.year"></td><td><input type="number" min="0" value="${r.observed}" data-val="${i}.observed"></td><td><input type="number" min="0.001" value="${r.cv}" data-val="${i}.cv"></td><td><button class="icon-button" data-remove-val="${i}">Remove</button></td></tr>`).join('')+'</tbody>';
 $('validationDataTable').querySelectorAll('[data-val]').forEach(el=>el.onchange=()=>{const [i,k]=el.dataset.val.split('.');state.validation.rows[+i][k]=k==='metric'?el.value:Number(el.value);});$('validationDataTable').querySelectorAll('[data-remove-val]').forEach(el=>el.onclick=()=>{state.validation.rows.splice(+el.dataset.removeVal,1);renderValidation();});renderValidationResult();
}
function modelMetricAt(metric,year){
 if(A.state.mode!=='dynamic_probabilistic')return metricValue(A.state.result,metric);const rows=A.state.result.annual,row=rows.find(x=>Number(x.year)===Number(year))||rows.at(-1);
 if(metric.startsWith('pec.'))return E.valueAtPath(row,metric);if(metric==='release.air')return row.air_release_kg_y;if(metric==='release.surface_water')return row.surface_water_release_kg_y;if(metric==='release.soil')return row.soil_release_kg_y;if(metric==='stock.in_use')return row.in_use_stock_kg;if(metric==='stock.landfill')return row.landfill_stock_kg;return 0;
}
function runValidation(){if(!A.state.result){alert('Run the MFA model first.');return;}const pairs=state.validation.rows.map(r=>({...r,predicted:modelMetricAt(r.metric,r.year)}));state.validation.result={pairs,statistics:E.validationStatistics(pairs)};renderValidationResult();}
function renderValidationResult(){const r=state.validation.result;if(!r){$('validationStats').innerHTML='';$('validationResults').innerHTML='';return;}const s=r.statistics;$('validationStats').innerHTML=[['n',s.n],['RMSE',fmt(s.rmse)],['Bias',fmt(s.bias)],['MAPE',s.mape_pct===null?'–':`${fmt(s.mape_pct)}%`],['Within 95%',`${fmt(s.within_95_pct)}%`],['Reduced χ²',fmt(s.reduced_chi_square)]].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('');$('validationResults').innerHTML=A.makeTable(['Metric','Year','Observed','Predicted','Residual','z'],r.pairs.map(x=>[METRICS[x.metric][0],x.year??'–',fmt(x.observed),fmt(x.predicted),fmt(x.predicted-x.observed),fmt((x.predicted-x.observed)/Math.max(Math.abs(x.observed)*x.cv,1e-30))]));}

function renderLca(){
 $('lcaFactorTable').innerHTML='<thead><tr><th>Process</th><th>Factor</th><th>Unit</th></tr></thead><tbody>'+state.lca.factors.map((r,i)=>`<tr><td>${r.label}</td><td><input type="number" step="0.01" value="${r.factor}" data-lca="${i}"></td><td>${r.unit}</td></tr>`).join('')+'</tbody>';$('lcaFactorTable').querySelectorAll('input').forEach(el=>el.onchange=()=>{state.lca.factors[+el.dataset.lca].factor=Number(el.value)||0;state.lca.result=null;renderLcaResult();});renderLcaResult();
}
function sumProcessFlows(process){
 if(A.state.mode!=='dynamic_probabilistic')return Number(A.state.result.process_input?.[process]||0);let total=0;Object.values(A.state.result.flows_by_year||{}).forEach(flows=>flows.forEach(f=>{if(f.target===({WWTP:'WWTP',incineration:'Incineration',landfill:'Landfill',recycling:'Recycling',reuse:'Reuse',biological_treatment:'Biological treatment'})[process])total+=f.kg_y;}));return total;
}
function runLca(){if(!A.state.result){alert('Run the MFA model first.');return;}const f=Object.fromEntries(state.lca.factors.map(x=>[x.key,Number(x.factor)||0])),primary=A.state.mode==='dynamic_probabilistic'?A.state.result.final.cumulative_primary_input_kg:A.effectiveStaticInput(),recovered=A.state.mode==='dynamic_probabilistic'?A.state.result.annual.reduce((a,r)=>a+r.recovery_output_kg_y,0):A.state.result.terminal.recovery_resource;
 const activity={primary_production:primary,WWTP:sumProcessFlows('WWTP'),incineration:sumProcessFlows('incineration'),landfill:sumProcessFlows('landfill'),recycling:sumProcessFlows('recycling'),reuse:sumProcessFlows('reuse'),biological_treatment:sumProcessFlows('biological_treatment'),avoided_primary_credit:recovered};const rows=Object.entries(activity).map(([k,v])=>({key:k,activity_kg:v,factor:f[k],burden_kg_co2e:(k==='avoided_primary_credit'?-1:1)*v*f[k]})),net=rows.reduce((a,r)=>a+r.burden_kg_co2e,0);state.lca.result={activity,rows,net_kg_co2e:net,gross_kg_co2e:rows.filter(r=>r.burden_kg_co2e>0).reduce((a,r)=>a+r.burden_kg_co2e,0),credit_kg_co2e:-rows.filter(r=>r.burden_kg_co2e<0).reduce((a,r)=>a+r.burden_kg_co2e,0)};renderLcaResult();}
function renderLcaResult(){const r=state.lca.result;if(!r){$('lcaKpis').innerHTML='';$('lcaResults').innerHTML='';return;}$('lcaKpis').innerHTML=[['Gross burden',`${fmt(r.gross_kg_co2e)} kg CO₂e`],['Recovery credit',`${fmt(r.credit_kg_co2e)} kg CO₂e`],['Net indicator',`${fmt(r.net_kg_co2e)} kg CO₂e`]].map(([l,v])=>`<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('');$('lcaResults').innerHTML=A.makeTable(['Process','Activity (kg)','Factor','Contribution (kg CO₂e)'],r.rows.map(x=>[state.lca.factors.find(f=>f.key===x.key)?.label||x.key,fmt(x.activity_kg),fmt(x.factor),fmt(x.burden_kg_co2e)]));}

function onModelResult(){renderStockDiagnostics();state.reconciliation.result=null;state.calibration.result=null;state.validation.result=null;state.lca.result=null;state.fate.result=null;renderReconciliationResult();renderCalibrationResult();renderValidationResult();renderLcaResult();renderFateResult();if(A.state.mode==='dynamic_probabilistic'&&state.dynamic_driver==='stock_driven'&&A.state.result.stock_driven){const rows=A.state.result.annual;try{Plotly.addTraces('stockChart',{type:'scatter',mode:'lines',name:'Target in-use stock',x:rows.map(r=>r.year),y:rows.map(r=>r.target_in_use_stock_kg),line:{dash:'dash'}});}catch(e){console.warn(e);}}}

function renderAll(){renderTrade();renderStockDriven();renderReconciliation();
 $('calibrationParameter').value=state.calibration.parameter;$('calibrationMetric').innerHTML=Object.entries(METRICS).filter(([k])=>A.state.mode==='dynamic_probabilistic'||!k.startsWith('stock.')).map(([k,v])=>`<option value="${k}" ${k===state.calibration.metric?'selected':''}>${v[0]} (${v[1]})</option>`).join('');$('calibrationObserved').value=state.calibration.observed;$('calibrationObsCv').value=state.calibration.obs_cv;$('calibrationPriorCv').value=state.calibration.prior_cv;$('calibrationRange').value=state.calibration.range.join(', ');renderCalibrationResult();renderFate();renderValidation();renderLca();}
function bind(){
 $('tradeEnabled').onchange=e=>{state.trade.enabled=e.target.checked;renderTrade();A.renderEffectiveInput();A.clearResults();};['tradeImportsStatic','tradeExportsStatic','tradeInventoryStatic'].forEach(id=>$(id).onchange=()=>{state.trade.static={imports_kg_y:Number($('tradeImportsStatic').value)||0,exports_kg_y:Number($('tradeExportsStatic').value)||0,inventory_change_kg_y:Number($('tradeInventoryStatic').value)||0};renderTrade();A.renderEffectiveInput();A.clearResults();});$('syncTradeYearsBtn').onclick=syncTradeYears;$('addTradePartnerBtn').onclick=()=>{state.trade.partners.push({partner:'New partner',import_share_pct:0,export_share_pct:0});renderTrade();};$('normalizeTradePartnersBtn').onclick=()=>{['import_share_pct','export_share_pct'].forEach(k=>{const t=state.trade.partners.reduce((a,r)=>a+Number(r[k]||0),0);if(t>0)state.trade.partners.forEach(r=>r[k]=r[k]/t*100);});renderTrade();};
 $('dynamicDriver').onchange=e=>{state.dynamic_driver=e.target.value;renderStockDriven();A.clearResults();};$('targetStockInitial').onchange=()=>{state.target_stock_initial_kg=Number($('targetStockInitial').value)||0;generateTargetStock();};$('targetStockGrowth').onchange=()=>{state.target_stock_growth_pct=Number($('targetStockGrowth').value)||0;generateTargetStock();};$('stockTolerance').onchange=()=>state.stock_tolerance=Number($('stockTolerance').value)||.0001;$('generateTargetStockBtn').onclick=generateTargetStock;
 $('loadReconciliationBtn').onclick=loadCurrentBalance;$('addReconciliationRowBtn').onclick=()=>{state.reconciliation.rows.push({name:'New flow',role:'outflow',model_value:0,model_cv:.2,observed_value:'',observed_cv:.1});renderReconciliation();};$('runReconciliationBtn').onclick=runReconciliation;
 $('calibrationParameter').onchange=e=>state.calibration.parameter=e.target.value;$('calibrationMetric').onchange=e=>state.calibration.metric=e.target.value;$('runCalibrationBtn').onclick=runCalibration;$('applyCalibrationBtn').onclick=applyCalibration;
 $('applyFatePresetBtn').onclick=applyFatePreset;$('runFateBtn').onclick=runFate;
 $('addValidationRowBtn').onclick=()=>{state.validation.rows.push({metric:'pec.surface_water_pec_ug_L',year:A.state.mode==='dynamic_probabilistic'?A.state.dynamicSettings.end_year:null,observed:0,cv:.2});renderValidation();};$('runValidationBtn').onclick=runValidation;$('runLcaBtn').onclick=runLca;
 document.querySelectorAll('.tab[data-tab="advanced"]').forEach(el=>el.addEventListener('click',()=>{syncTradeYears();renderAll();}));
}
function init(){mergeState(window.__KNANO_PENDING_ADVANCED_STATE||null);delete window.__KNANO_PENDING_ADVANCED_STATE;syncTradeYears();if(!state.target_stock.length)generateTargetStock();bind();renderAll();}
window.KNanoAdvanced={getState,getOutputs,loadState,setFatePreset,getFatePresetNames,adjustStaticInput,adjustTrajectory,prepareDynamicRun,onModelResult};
document.addEventListener('DOMContentLoaded',init);
})();
