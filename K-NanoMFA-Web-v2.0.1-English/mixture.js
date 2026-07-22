(function(){
'use strict';
const A=window.KNanoApp,D=window.KNanoData,E=window.KNanoEngine;
if(!A||!D||!E)return;
const $=id=>document.getElementById(id);
const clone=E.deepClone;
const CUSTOM='__CUSTOM__';
const CURRENT='__CURRENT__';
const MEDIUMS={
  air:{label:'Air',pec:'air_pec_ng_m3',unit:'ng/m³',release:'air'},
  surface_water:{label:'Surface water',pec:'surface_water_pec_ug_L',unit:'µg/L',release:'surface_water'},
  soil:{label:'Soil',pec:'soil_pec_ug_kg',unit:'µg/kg dry',release:'soil'},
  sediment:{label:'Active sediment',pec:'active_sediment_pec_ug_kg',unit:'µg/kg dry',release:null}
};
const TRACKING=['Selected nanoform mass','Constituent-element mass','Total mass including transformed forms','User-defined mass basis'];
const COLORS=['#0f766e','#7c3aed','#ea580c','#2563eb','#be123c','#65a30d','#9333ea','#0891b2','#a16207','#475569','#db2777','#15803d'];
const state={
  assessmentMode:'single',components:[],formulations:[],interactions:[],results:null,uncertainty:null,
  settings:{medium:'surface_water',allowIncompatibleSum:false,iterations:250,seed:52,rsd:0.25,growthSdPct:5}
};
let idCounter=1;
function uid(prefix){return `${prefix}_${Date.now().toString(36)}_${idCounter++}`;}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}
function fmt(v,d=6){return A.fmt?A.fmt(v,d):(Number(v)||0).toPrecision(d);}
function selectedCountryWaste(){return D.COUNTRY_WASTE_PRESETS?.[A.currentRegion().country_code]||D.KOREA_WASTE_PRESET;}
function applyCountryWaste(eol){
  if(!A.state.geography.apply_country_waste_preset)return clone(eol);
  const p=selectedCountryWaste();return clone(eol).map(r=>({...r,...p}));
}
function definitionFromBundled(material){
  if(!D.MATERIAL_SCENARIOS[material])throw new Error(`Unknown bundled material: ${material}`);
  return {
    material_key:material,display_name:material,description:D.MATERIAL_SCENARIOS[material].description,
    products:clone(D.MATERIAL_SCENARIOS[material].products),eol:clone(D.MATERIAL_SCENARIOS[material].eol),
    factors:clone(D.PROCESS_FACTOR_LIBRARY[material]),lifetimes:clone(D.LIFETIME_DEFAULTS[material]),
    releaseForms:clone(D.RELEASE_FORM_DEFAULTS[material]),nanoform:window.KNanoNanoform?.defaultState?.()||null,source_type:'bundled'
  };
}
function definitionFromCurrent(){
  return {
    material_key:A.state.material,display_name:A.materialDisplayName(),description:A.state.material===CUSTOM?A.state.customMaterial?.description:D.MATERIAL_SCENARIOS[A.state.material]?.description,
    customMaterial:A.state.material===CUSTOM?clone(A.state.customMaterial):null,
    products:clone(A.state.products),eol:clone(A.state.eol),factors:clone(A.state.factors),lifetimes:clone(A.state.lifetimes),releaseForms:clone(A.state.releaseForms),product_inventory:A.PI?.getState?.()||null,nanoform:window.KNanoNanoform?.getState?.()||null,source_type:'current editor'
  };
}
function defaultPnec(){return {air:{value:0,cv:.3},surface_water:{value:0,cv:.3},soil:{value:0,cv:.3},sediment:{value:0,cv:.3}};}
function makeComponent(definition,input=100){
  const start=num(A.state.dynamicSettings.start_year,2024),end=num(A.state.dynamicSettings.end_year,2035);
  return {id:uid('mat'),active:true,label:definition.display_name,definition,material_key:definition.material_key,
    input_mode:'direct',annual_input_kg_y:Math.max(0,num(input,100)),formulation_id:'',fraction_pct:0,
    annual_growth_pct:num(A.state.dynamicSettings.annual_growth_pct,0),active_start:start,active_end:end,
    tracking_basis:'Selected nanoform mass',co_use_group:'Independent',include_exposure:true,
    assessment_group:'General screening group',endpoint:'User-supplied comparable PNEC',pnec:defaultPnec(),pnec_evidence:'E',pnec_source:'User input',follow_country_waste:true};
}
function normalizeComponent(raw){
  const source=raw&&typeof raw==='object'?clone(raw):{};
  let definition=source.definition;
  if(!definition){
    if(source.material_key&&D.MATERIAL_SCENARIOS[source.material_key])definition=definitionFromBundled(source.material_key);
    else throw new Error('An imported mixture component is missing a valid material definition.');
  }
  if(!Array.isArray(definition.products)||!Array.isArray(definition.eol)||!definition.factors||!Array.isArray(definition.lifetimes))throw new Error('An imported mixture component has an incomplete material definition.');
  const base=makeComponent(clone(definition),num(source.annual_input_kg_y,100));
  const merged={...base,...source,definition:clone(definition),id:String(source.id||base.id)};
  const defaults=defaultPnec();merged.pnec={};Object.keys(MEDIUMS).forEach(m=>merged.pnec[m]={...defaults[m],...(source.pnec?.[m]||{})});
  merged.label=String(merged.label||definition.display_name||definition.material_key||'Material component');
  merged.material_key=merged.material_key||definition.material_key;merged.active=merged.active!==false;merged.include_exposure=merged.include_exposure!==false;
  return merged;
}
function normalizeFormulation(raw){const base=defaultFormulation();return {...base,...clone(raw||{}),id:String(raw?.id||base.id),name:String(raw?.name||base.name)};}
function defaultFormulation(){
  const start=num(A.state.dynamicSettings.start_year,2024),end=num(A.state.dynamicSettings.end_year,2035),p=selectedCountryWaste();
  return {id:uid('form'),name:`Formulation ${state.formulations.length+1}`,blend_input_kg_y:100,annual_growth_pct:num(A.state.dynamicSettings.annual_growth_pct,0),active_start:start,active_end:end,
    use_air_pct:.2,use_direct_water_pct:1,use_wwtp_pct:10,use_soil_pct:.1,
    incineration_pct:p.incineration_pct,landfill_pct:p.landfill_pct,recycling_pct:p.recycling_pct,reuse_pct:p.reuse_pct,biological_treatment_pct:p.biological_treatment_pct,
    mean_lifetime_y:5,weibull_shape:2.5,use_release_duration_y:4};
}
function addBundled(material){state.components.push(makeComponent(definitionFromBundled(material),100));renderAll();}
function currentEditorNationalInput(){if(A.PI?.isActive?.()){const effective=A.preparedStaticInput?.().total_kg_y||0;return effective/Math.max(A.geographicScale?.()||1,1e-30);}return num($('totalMass')?.value,100);}
function addCurrent(){state.components.push(makeComponent(definitionFromCurrent(),currentEditorNationalInput()));renderAll();}
function currentMaterialOptions(){return Object.keys(D.MATERIAL_SCENARIOS).map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('');}
function formulationOptions(selected=''){return `<option value="">—</option>`+state.formulations.map(f=>`<option value="${f.id}" ${f.id===selected?'selected':''}>${esc(f.name)}</option>`).join('');}
function renderComponents(){
  const root=$('mixtureComponentTable');if(!root)return;
  if(!state.components.length){root.innerHTML='<div class="comparison-empty">No materials added. Add a bundled material or capture the currently edited single-material scenario.</div>';return;}
  const rows=state.components.map((c,i)=>`<tr data-id="${c.id}">
    <td><input type="checkbox" data-k="active" ${c.active?'checked':''}></td>
    <td><input type="text" data-k="label" value="${esc(c.label)}"></td>
    <td><select data-k="material_key">${currentMaterialOptions()}<option value="${CURRENT}">Current edited scenario</option></select><small>${esc(c.definition.source_type)}</small></td>
    <td><select data-k="input_mode"><option value="direct" ${c.input_mode==='direct'?'selected':''}>Direct material input</option><option value="formulation" ${c.input_mode==='formulation'?'selected':''}>Formulation fraction</option></select></td>
    <td><input type="number" min="0" step="any" data-k="annual_input_kg_y" value="${c.annual_input_kg_y}" ${c.input_mode==='formulation'?'disabled':''}></td>
    <td><select data-k="formulation_id" ${c.input_mode==='direct'?'disabled':''}>${formulationOptions(c.formulation_id)}</select></td>
    <td><input type="number" min="0" max="100" step="0.01" data-k="fraction_pct" value="${c.fraction_pct}" ${c.input_mode==='direct'?'disabled':''}></td>
    <td><input type="number" step="0.1" data-k="annual_growth_pct" value="${c.annual_growth_pct}"></td>
    <td><input type="number" data-k="active_start" value="${c.active_start}"></td><td><input type="number" data-k="active_end" value="${c.active_end}"></td>
    <td><select data-k="tracking_basis">${TRACKING.map(x=>`<option ${x===c.tracking_basis?'selected':''}>${esc(x)}</option>`).join('')}</select></td>
    <td><input type="text" data-k="co_use_group" value="${esc(c.co_use_group)}"></td>
    <td><button class="ghost compact-btn" data-action="load">Load to editor</button><button class="ghost compact-btn" data-action="capture">Capture editor</button><button class="danger-btn compact-btn" data-action="remove">Remove</button></td>
  </tr>`).join('');
  root.innerHTML=`<table class="wide-table"><thead><tr><th>Use</th><th>Component label</th><th>Scenario source</th><th>Input mode</th><th>Input (kg/y)</th><th>Formulation</th><th>Fraction (%)</th><th>Growth (%/y)</th><th>Start</th><th>End</th><th>Tracking basis</th><th>Co-use group</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  state.components.forEach(c=>{const tr=root.querySelector(`tr[data-id="${c.id}"]`);const mat=tr.querySelector('[data-k="material_key"]');mat.value=c.definition.source_type==='current editor'?CURRENT:c.material_key;
    tr.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('change',()=>updateComponent(c,el.dataset.k,el)));
    tr.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>componentAction(c,b.dataset.action)));
  });
}
function updateComponent(c,k,el){
  let v=el.type==='checkbox'?el.checked:(el.type==='number'?num(el.value):el.value);
  if(k==='material_key'){
    if(v===CURRENT){c.definition=definitionFromCurrent();c.material_key=c.definition.material_key;c.label=c.definition.display_name;}
    else{c.definition=definitionFromBundled(v);c.material_key=v;c.label=v;}
  }else c[k]=v;
  if(k==='input_mode'){if(v==='formulation'&&!c.formulation_id&&state.formulations[0])c.formulation_id=state.formulations[0].id;}
  state.results=null;state.uncertainty=null;
  if(['material_key','input_mode','formulation_id','label','active'].includes(k))renderAll();
  else{renderFormulationChecks();renderInteractions();renderStatus();renderResults();}
}
function componentAction(c,action){
  if(action==='remove'){state.components=state.components.filter(x=>x.id!==c.id);state.interactions=state.interactions.filter(x=>x.a!==c.id&&x.b!==c.id);renderAll();return;}
  if(action==='capture'){c.definition=definitionFromCurrent();c.material_key=c.definition.material_key;c.label=A.materialDisplayName();if(A.PI?.isActive?.())c.annual_input_kg_y=currentEditorNationalInput();renderAll();return;}
  if(action==='load'){
    const def=c.definition;const scenario=A.scenario();scenario.material=def.material_key;scenario.material_display_name=def.display_name;scenario.customMaterial=def.customMaterial||null;scenario.products=clone(def.products);scenario.eol=clone(def.eol);scenario.factors=clone(def.factors);scenario.lifetimes=clone(def.lifetimes);scenario.releaseForms=clone(def.releaseForms);scenario.product_inventory=clone(def.product_inventory||null);scenario.nanoform=clone(def.nanoform||window.KNanoNanoform?.defaultState?.()||null);scenario.totalMass=c.annual_input_kg_y;
    try{A.applyScenario(scenario,false);A.switchTab('lifecycle');}catch(err){alert(err.message);}
  }
}
function renderFormulations(){
  const root=$('formulationTable');if(!root)return;
  if(!state.formulations.length){root.innerHTML='<div class="comparison-empty">No formulation groups. Create one when multiple nanomaterials occur in the same product or blend.</div>';return;}
  const rows=state.formulations.map(f=>`<tr data-id="${f.id}"><td><input data-k="name" value="${esc(f.name)}"></td><td><input type="number" min="0" step="any" data-k="blend_input_kg_y" value="${f.blend_input_kg_y}"></td><td><input type="number" step=".1" data-k="annual_growth_pct" value="${f.annual_growth_pct}"></td><td><input type="number" data-k="active_start" value="${f.active_start}"></td><td><input type="number" data-k="active_end" value="${f.active_end}"></td>
    ${['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct','incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct','mean_lifetime_y','weibull_shape','use_release_duration_y'].map(k=>`<td><input type="number" min="0" step="any" data-k="${k}" value="${f[k]}"></td>`).join('')}
    <td><button class="danger-btn compact-btn" data-action="remove-form">Remove</button></td></tr>`).join('');
  root.innerHTML=`<table class="wide-table"><thead><tr><th>Name</th><th>Blend input (kg/y)</th><th>Growth (%/y)</th><th>Start</th><th>End</th><th>Use→air</th><th>Use→water</th><th>Use→WWTP</th><th>Use→soil</th><th>Incineration</th><th>Landfill</th><th>Recycling</th><th>Reuse</th><th>Biological</th><th>Mean life (y)</th><th>Weibull k</th><th>Release duration (y)</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  state.formulations.forEach(f=>{const tr=root.querySelector(`tr[data-id="${f.id}"]`);tr.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('change',()=>{const k=el.dataset.k;f[k]=el.type==='number'?num(el.value):el.value;state.results=null;state.uncertainty=null;if(k==='name')renderAll();else{renderFormulationChecks();renderStatus();renderResults();}}));tr.querySelector('[data-action]').onclick=()=>{state.formulations=state.formulations.filter(x=>x.id!==f.id);state.components.forEach(c=>{if(c.formulation_id===f.id){c.formulation_id='';c.input_mode='direct';}});renderAll();};});
  renderFormulationChecks();
}
function renderFormulationChecks(){
  const box=$('formulationValidation');if(!box)return;const msgs=[];
  state.formulations.forEach(f=>{
    const fractions=state.components.filter(c=>c.active&&c.input_mode==='formulation'&&c.formulation_id===f.id).reduce((a,c)=>a+num(c.fraction_pct),0);
    const eol=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'].reduce((a,k)=>a+num(f[k]),0);
    const release=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'].reduce((a,k)=>a+num(f[k]),0);
    msgs.push(`${esc(f.name)}: material fractions ${fmt(fractions,4)}%; EoL ${fmt(eol,4)}%; use release ${fmt(release,4)}%.`);
  });
  box.innerHTML=msgs.join('<br>')||'No formulation groups.';
}
function renderHazards(){
  const root=$('mixtureHazardTable');if(!root)return;
  if(!state.components.length){root.innerHTML='<div class="comparison-empty">Add material components first.</div>';return;}
  const rows=state.components.map(c=>`<tr data-id="${c.id}"><td>${esc(c.label)}</td><td><input type="checkbox" data-k="include_exposure" ${c.include_exposure?'checked':''}></td><td><input data-k="assessment_group" value="${esc(c.assessment_group)}"></td><td><input data-k="endpoint" value="${esc(c.endpoint)}"></td>
    ${Object.keys(MEDIUMS).map(m=>`<td><input type="number" min="0" step="any" data-pnec="${m}" value="${c.pnec[m].value}"></td>`).join('')}
    <td><input type="number" min="0" step=".05" data-k="pnec_cv" value="${c.pnec.surface_water.cv}"></td><td><select data-k="pnec_evidence">${['A','B','C','D','E'].map(x=>`<option ${x===c.pnec_evidence?'selected':''}>${x}</option>`).join('')}</select></td><td><input data-k="pnec_source" value="${esc(c.pnec_source)}"></td></tr>`).join('');
  root.innerHTML=`<table class="wide-table"><thead><tr><th>Material</th><th>Include</th><th>Assessment group</th><th>Comparable endpoint</th><th>Air PNEC (ng/m³)</th><th>Water PNEC (µg/L)</th><th>Soil PNEC (µg/kg)</th><th>Sediment PNEC (µg/kg)</th><th>PNEC CV</th><th>Evidence</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`;
  state.components.forEach(c=>{const tr=root.querySelector(`tr[data-id="${c.id}"]`);tr.querySelectorAll('[data-pnec]').forEach(el=>el.addEventListener('change',()=>{c.pnec[el.dataset.pnec].value=Math.max(0,num(el.value));state.results=null;state.uncertainty=null;}));tr.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('change',()=>{const k=el.dataset.k;if(k==='pnec_cv')Object.values(c.pnec).forEach(p=>p.cv=Math.max(0,num(el.value)));else c[k]=el.type==='checkbox'?el.checked:el.value;state.results=null;state.uncertainty=null;}));});
}
function activePairs(){const c=state.components.filter(x=>x.active&&x.include_exposure);const out=[];for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++)out.push([c[i],c[j]]);return out;}
function renderInteractions(){
  const root=$('interactionTable');if(!root)return;const pairs=activePairs();
  if(!pairs.length){root.innerHTML='<div class="comparison-empty">At least two included components are required. Interaction coefficients default to zero and should be entered only with directly relevant evidence.</div>';return;}
  pairs.forEach(([a,b])=>Object.keys(MEDIUMS).forEach(m=>{if(!state.interactions.some(x=>x.a===a.id&&x.b===b.id&&x.medium===m))state.interactions.push({a:a.id,b:b.id,medium:m,beta:0,evidence:'E',source:''});}));
  state.interactions=state.interactions.filter(x=>pairs.some(([a,b])=>a.id===x.a&&b.id===x.b));
  const cmap=Object.fromEntries(state.components.map(c=>[c.id,c]));
  const rows=state.interactions.map((x,i)=>`<tr><td>${esc(cmap[x.a]?.label||x.a)}</td><td>${esc(cmap[x.b]?.label||x.b)}</td><td>${MEDIUMS[x.medium].label}</td><td><input type="number" step=".01" data-i="${i}" data-k="beta" value="${x.beta}"></td><td><select data-i="${i}" data-k="evidence">${['A','B','C','D','E'].map(e=>`<option ${e===x.evidence?'selected':''}>${e}</option>`).join('')}</select></td><td><input data-i="${i}" data-k="source" value="${esc(x.source)}"></td></tr>`).join('');
  root.innerHTML=`<table><thead><tr><th>Material A</th><th>Material B</th><th>Medium</th><th>β interaction coefficient</th><th>Evidence</th><th>Source and conditions</th></tr></thead><tbody>${rows}</tbody></table>`;
  root.querySelectorAll('[data-i]').forEach(el=>el.addEventListener('change',()=>{state.interactions[num(el.dataset.i)][el.dataset.k]=el.type==='number'?num(el.value):el.value;state.results=null;state.uncertainty=null;}));
}
function renderAll(){renderComponents();renderFormulations();renderHazards();renderInteractions();renderStatus();renderResults();}
function renderStatus(){
  const box=$('mixtureStatus');if(!box)return;const active=state.components.filter(c=>c.active);const formulations=state.formulations.length;
  box.innerHTML=active.length<2?'<b>Next action:</b> add at least two active materials.':`<b>${active.length} active materials</b> and <b>${formulations} formulation groups</b>. Review tracking bases and PNECs, then run the multi-material assessment.`;
  const mode=$('assessmentMode');if(mode)mode.value=state.assessmentMode;
  document.body.classList.toggle('multi-mode',state.assessmentMode==='multi');
  if($('calculateBtn')){$('calculateBtn').textContent=state.assessmentMode==='multi'?'Run multi-material assessment':'Run model';if(state.assessmentMode==='multi')$('calculateBtn').disabled=active.length<2;}
}
function validate(){
  const errors=[],active=state.components.filter(c=>c.active),dynamic=A.state.mode==='dynamic_probabilistic';
  if(active.length<2)errors.push('At least two active material components are required.');
  if(!(Number.isFinite(A.geographicScale())&&A.geographicScale()>0))errors.push('The shared geographic allocation factor must be positive.');
  Object.entries(A.state.environment||{}).forEach(([k,v])=>{const n=Number(v);if(k==='water_to_sediment_pct'){if(!Number.isFinite(n)||n<0||n>100)errors.push('Water-to-active-sediment transfer must be between 0 and 100%.');}else if(!Number.isFinite(n)||n<=0)errors.push(`${k} must be a finite positive environmental-capacity value.`);});
  const labels=new Set();
  active.forEach(c=>{
    const label=String(c.label||'').trim();if(!label)errors.push('Every active component needs a label.');if(labels.has(label))errors.push(`Duplicate component label: ${label}.`);labels.add(label);
    if(!Number.isInteger(Number(c.active_start))||!Number.isInteger(Number(c.active_end))||Number(c.active_end)<Number(c.active_start))errors.push(`${label||'Component'}: active years must be integers with end not earlier than start.`);
    if(!Number.isFinite(Number(c.annual_growth_pct))||Number(c.annual_growth_pct)<-100)errors.push(`${label||'Component'}: annual growth must be finite and cannot be below −100%.`);
    if(c.input_mode==='direct'&&(!Number.isFinite(Number(c.annual_input_kg_y))||Number(c.annual_input_kg_y)<0))errors.push(`${label||'Component'}: input must be a finite non-negative value.`);
    if(c.input_mode==='formulation'&&!state.formulations.some(f=>f.id===c.formulation_id))errors.push(`${label||'Component'}: select a valid formulation.`);
    if(c.input_mode==='formulation'&&(!Number.isFinite(Number(c.fraction_pct))||Number(c.fraction_pct)<0||Number(c.fraction_pct)>100))errors.push(`${label||'Component'}: formulation fraction must be between 0 and 100%.`);
    Object.entries(c.pnec||{}).forEach(([m,p])=>{if(!Number.isFinite(Number(p.value))||Number(p.value)<0)errors.push(`${label||'Component'}: ${m} PNEC must be finite and non-negative.`);if(!Number.isFinite(Number(p.cv))||Number(p.cv)<0)errors.push(`${label||'Component'}: ${m} PNEC CV must be finite and non-negative.`);});
    try{const base=componentScenario(c,dynamic);E.validateInputs(base.products,base.eol,base.factors,base.sludge,dynamic?base.lifetimes:null,dynamic?base.dynamicSettings:null).forEach(e=>errors.push(`${label||'Component'}: ${e}`));}catch(e){errors.push(`${label||'Component'}: ${e.message}`);}
  });
  state.formulations.forEach(f=>{
    const name=String(f.name||'Formulation').trim();const members=active.filter(c=>c.input_mode==='formulation'&&c.formulation_id===f.id);if(!members.length)return;
    if(!Number.isFinite(Number(f.blend_input_kg_y))||Number(f.blend_input_kg_y)<0)errors.push(`${name}: blend input must be finite and non-negative.`);
    if(!Number.isFinite(Number(f.annual_growth_pct))||Number(f.annual_growth_pct)<-100)errors.push(`${name}: annual growth must be finite and cannot be below −100%.`);
    if(!Number.isInteger(Number(f.active_start))||!Number.isInteger(Number(f.active_end))||Number(f.active_end)<Number(f.active_start))errors.push(`${name}: active years are invalid.`);
    const pctKeys=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct','incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'];
    pctKeys.forEach(k=>{if(!Number.isFinite(Number(f[k]))||Number(f[k])<0||Number(f[k])>100)errors.push(`${name}: ${k} must be between 0 and 100%.`);});
    const frac=members.reduce((a,c)=>a+Number(c.fraction_pct),0);if(Math.abs(frac-100)>.05)errors.push(`${name}: component fractions total ${frac.toFixed(3)}%, not 100%.`);
    const eol=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'].reduce((a,k)=>a+Number(f[k]),0);if(Math.abs(eol-100)>.05)errors.push(`${name}: EoL routes total ${eol.toFixed(3)}%, not 100%.`);
    const rel=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'].reduce((a,k)=>a+Number(f[k]),0);if(rel>100+1e-9)errors.push(`${name}: use releases exceed 100%.`);
    if(!(Number(f.mean_lifetime_y)>0)||!(Number(f.weibull_shape)>0)||!(Number(f.use_release_duration_y)>=1))errors.push(`${name}: lifetime parameters must be positive and release duration at least one year.`);
  });
  const groups={};active.filter(c=>c.include_exposure).forEach(c=>(groups[c.assessment_group]??=[]).push(c));Object.entries(groups).forEach(([g,cs])=>{const endpoints=new Set(cs.filter(c=>Object.values(c.pnec||{}).some(p=>Number(p.value)>0)).map(c=>String(c.endpoint||'').trim()));if(endpoints.size>1)errors.push(`Assessment group “${g}” contains non-identical endpoint descriptions.`);});
  return [...new Set(errors)];
}
function uncertaintyProfile(){return Object.fromEntries((A.state.qualityProfile||[]).map(r=>[r.key,num(r.cv,.25)]));}
function currentFormulation(id){return state.formulations.find(f=>f.id===id);}
function componentInput(c,year=null){
  let initial,growth,start,end;
  if(c.input_mode==='formulation'){const f=currentFormulation(c.formulation_id);if(!f)return 0;initial=f.blend_input_kg_y*c.fraction_pct/100;growth=f.annual_growth_pct;start=f.active_start;end=f.active_end;}
  else{initial=c.annual_input_kg_y;growth=c.annual_growth_pct;start=c.active_start;end=c.active_end;}
  initial=Number(initial);growth=Number(growth);start=Number(start);end=Number(end);
  if(year===null)return Number.isFinite(initial)?Math.max(0,initial):0;
  if(year<start||year>end)return 0;const factor=1+growth/100;return Number.isFinite(initial)&&Number.isFinite(factor)&&factor>=0?Math.max(0,initial*Math.pow(factor,year-start)):0;
}
function componentScenario(c,dynamic=false){
  const d=clone(c.definition),f=currentFormulation(c.formulation_id);
  if(c.input_mode==='formulation'&&f){const name=`Formulation: ${f.name}`;d.products=[{product_category:name,allocation_pct:100,use_air_pct:f.use_air_pct,use_direct_water_pct:f.use_direct_water_pct,use_wwtp_pct:f.use_wwtp_pct,use_soil_pct:f.use_soil_pct}];d.eol=[{product_category:name,incineration_pct:f.incineration_pct,landfill_pct:f.landfill_pct,recycling_pct:f.recycling_pct,reuse_pct:f.reuse_pct,biological_treatment_pct:f.biological_treatment_pct}];d.lifetimes=[{product_category:name,mean_lifetime_y:f.mean_lifetime_y,weibull_shape:f.weibull_shape,use_release_duration_y:f.use_release_duration_y}];}
  else if(c.follow_country_waste)d.eol=applyCountryWaste(d.eol);
  return {products:d.products,eol:d.eol,factors:d.factors,lifetimes:d.lifetimes,sludge:clone(A.state.sludge),region:A.currentRegion(),env:clone(A.state.environment),...(dynamic?{dynamicSettings:clone(A.state.dynamicSettings)}:{})};
}
function trajectoryFor(c){const start=num(A.state.dynamicSettings.start_year),end=num(A.state.dynamicSettings.end_year),scale=A.geographicScale();const rows=[];for(let y=start;y<=end;y++)rows.push({year:y,primary_input_kg_y:componentInput(c,y)*scale});return rows;}
function resultAtYear(compResult,yearIndex=null){if(compResult.result.model==='static')return compResult.result;const annual=compResult.result.annual;return annual[yearIndex===null?annual.length-1:yearIndex];}
function assessAt(compResults,yearIndex=null,pnecOverrides=null){
  const records=[],tracking=new Set();compResults.forEach(cr=>{const row=resultAtYear(cr,yearIndex);if(cr.component.include_exposure)tracking.add(cr.component.tracking_basis);Object.entries(MEDIUMS).forEach(([m,meta])=>{const pec=row.pec?.[meta.pec]??0;const pnec=pnecOverrides?.[cr.component.id]?.[m]??num(cr.component.pnec?.[m]?.value);const hq=cr.component.include_exposure&&pnec>0?pec/pnec:null;records.push({component_id:cr.component.id,label:cr.component.label,medium:m,pec,pnec,hq,unit:meta.unit,group:cr.component.assessment_group,endpoint:cr.component.endpoint,tracking_basis:cr.component.tracking_basis});});});
  const compatible=tracking.size<=1||state.settings.allowIncompatibleSum,totals={},groups={};
  Object.keys(MEDIUMS).forEach(m=>{const rs=records.filter(r=>r.medium===m);totals[m]={value:compatible?rs.filter(r=>compResults.find(c=>c.component.id===r.component_id).component.include_exposure).reduce((a,r)=>a+r.pec,0):null,compatible,tracking_bases:[...tracking]};});
  records.filter(r=>r.hq!==null).forEach(r=>{const key=`${r.medium}|||${r.group}`;(groups[key]??={medium:r.medium,group:r.group,endpoint:r.endpoint,components:[],hi:0,adjusted_hi:0,compatible:true}).components.push(r);groups[key].hi+=r.hq;if(groups[key].endpoint!==r.endpoint)groups[key].compatible=false;});
  Object.values(groups).forEach(g=>{g.adjusted_hi=g.hi;if(!g.compatible){g.hi=null;g.adjusted_hi=null;return;}const map=Object.fromEntries(g.components.map(r=>[r.component_id,r]));state.interactions.filter(x=>x.medium===g.medium&&map[x.a]&&map[x.b]).forEach(x=>g.adjusted_hi+=num(x.beta)*map[x.a].hq*map[x.b].hq);g.dominant=[...g.components].sort((a,b)=>b.hq-a.hq)[0]||null;});
  return {records,totals,groups:Object.values(groups),tracking_compatible:compatible};
}
function run(){
  const errors=validate();if(errors.length){alert(errors.join('\n'));A.switchTab('mixture');return;}
  const active=state.components.filter(c=>c.active),mode=A.state.mode,components=[];
  try{
    active.forEach(c=>{const base=componentScenario(c,mode==='dynamic_probabilistic');if(mode==='dynamic_probabilistic'){const trajectory=trajectoryFor(c);const result=E.runDynamicMFA({...base,trajectory});components.push({component:clone(c),entered_input_kg_y:componentInput(c),initial_effective_input_kg_y:trajectory[0]?.primary_input_kg_y||0,effective_input_kg_y:result.final?.primary_input_kg_y||0,final_total_product_input_kg_y:result.final?.total_product_input_kg_y||0,trajectory,result});}
      else{const total=componentInput(c)*A.geographicScale();const result=E.runStaticMFA({...base,total});components.push({component:clone(c),entered_input_kg_y:componentInput(c),effective_input_kg_y:total,result});}});
    const assessment=assessAt(components);state.results={mode,components,assessment,country:A.currentRegion().country,domain:A.currentRegion().region,geography:A.geographyMetadata(),created_at:new Date().toISOString()};state.uncertainty=null;renderResults();A.switchTab('mixture');
  }catch(err){alert(err.message);}
}
function aggregateFlows(){
  if(!state.results)return [];const flows=[],root='Multi-material input';
  const terminal=new Set(['Air','Surface water','Soil','Surface-water sink','Recovery and resource utilization','Reuse and product stock','Landfill stock','Transformation / loss','Other / unclassified']);
  state.results.components.forEach((cr,ci)=>{const label=cr.component.label,input=cr.effective_input_kg_y;flows.push({source:root,target:`${label} input`,value:input,color:COLORS[ci%COLORS.length],material:label});const row=cr.result.model==='static'?cr.result:cr.result.annual.at(-1);(row.flows||[]).forEach(f=>{let s=f.source,t=f.target;if(s==='Total nanomaterial input'||s==='Primary market input')s=`${label} input`;else if(!terminal.has(s))s=`${label} · ${s}`;if(!terminal.has(t))t=`${label} · ${t}`;flows.push({source:s,target:t,value:f.kg_y,color:COLORS[ci%COLORS.length],material:label});});});return flows;
}
function renderSankey(){const div=$('mixtureSankey');if(!div||!state.results)return;const flows=aggregateFlows(),nodes=[...new Set(flows.flatMap(f=>[f.source,f.target]))],idx=Object.fromEntries(nodes.map((n,i)=>[n,i]));Plotly.react(div,[{type:'sankey',arrangement:'snap',node:{label:nodes,pad:16,thickness:16,line:{width:.5}},link:{source:flows.map(f=>idx[f.source]),target:flows.map(f=>idx[f.target]),value:flows.map(f=>f.value),color:flows.map(f=>hexToRgba(f.color,.38)),customdata:flows.map(f=>f.material),hovertemplate:'%{customdata}<br>%{source.label} → %{target.label}<br>%{value:.5g} kg/y<extra></extra>'}}],{margin:{l:10,r:10,t:10,b:10},paper_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});}
function hexToRgba(hex,a){const h=hex.replace('#','');return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;}
function renderResults(){
  const area=$('mixtureResults');if(!area)return;if(!state.results){area.hidden=true;return;}area.hidden=false;const comps=state.results.components,ass=state.results.assessment,mode=state.results.mode;
  const totalInput=comps.reduce((a,c)=>a+c.effective_input_kg_y,0),finalRows=comps.map(c=>resultAtYear(c));const wwtp=finalRows.reduce((a,r)=>a+(r.process_input?.WWTP||r.wwtp_input_kg_y||0),0);const maxHi=Math.max(0,...ass.groups.map(g=>g.adjusted_hi??g.hi??0));
  $('mixtureKpis').innerHTML=[['Active materials',comps.length],['Effective input',`${fmt(totalInput,7)} kg/y`],['WWTP load',`${fmt(wwtp,7)} kg/y`],['Tracking-basis sum',ass.tracking_compatible?'Compatible':'Blocked'],['Maximum adjusted HI',fmt(maxHi,6)]].map(([k,v])=>`<div class="kpi"><span>${k}</span><b>${v}</b></div>`).join('');
  renderSankey();renderCooccurrence();renderHazardResults();renderDynamicResults();renderUncertainty();
  $('mixtureComponentResults').innerHTML=A.makeTable(['Material',state.results.mode==='dynamic_probabilistic'?'Final-year primary input (kg/y)':'Input (kg/y)','Air release (kg/y)','Water release (kg/y)','Soil release (kg/y)','Air PEC (ng/m³)','Water PEC (µg/L)','Soil PEC (µg/kg)','Sediment PEC (µg/kg)'],comps.map(c=>{const r=resultAtYear(c),t=r.terminal||{};return [c.component.label,fmt(c.effective_input_kg_y,7),fmt(t.air??r.air_release_kg_y,7),fmt(t.surface_water??r.surface_water_release_kg_y,7),fmt(t.soil??r.soil_release_kg_y,7),fmt(r.pec.air_pec_ng_m3,8),fmt(r.pec.surface_water_pec_ug_L,8),fmt(r.pec.soil_pec_ug_kg,8),fmt(r.pec.active_sediment_pec_ug_kg,8)];}));
}
function renderCooccurrence(){const ass=state.results.assessment,medium=state.settings.medium,meta=MEDIUMS[medium],rows=ass.records.filter(r=>r.medium===medium),total=ass.totals[medium];$('mixtureMediumSelect').value=medium;Plotly.react('mixtureCooccurrenceChart',[{type:'bar',x:rows.map(r=>r.label),y:rows.map(r=>r.pec),customdata:rows.map(r=>r.tracking_basis),hovertemplate:'%{x}<br>%{y:.6g} '+meta.unit+'<br>%{customdata}<extra></extra>'}],{margin:{l:85,r:20,t:15,b:110},xaxis:{title:{text:'Nanomaterial component'},tickangle:-25},yaxis:{title:{text:`${meta.label} concentration (${meta.unit})`}},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});$('mixtureCooccurrenceTable').innerHTML=A.makeTable(['Material',`${meta.label} PEC (${meta.unit})`,'Tracking basis','Share of compatible total (%)'],rows.map(r=>[r.label,fmt(r.pec,8),r.tracking_basis,total.value===null?'Not calculated':fmt(r.pec/Math.max(total.value,1e-30)*100,5)]).concat([['Total co-occurring material',total.value===null?'Not calculated':fmt(total.value,8),total.compatible?'Compatible basis':'Incompatible tracking bases','—']]));$('mixtureSumWarning').innerHTML=total.compatible?'The total is a physical mass-concentration sum only and does not imply toxicological equivalence.':'The concentration sum is blocked because included components use different tracking bases. Enable the explicit override only when the mass bases are scientifically commensurable.';}
function renderHazardResults(){const groups=state.results.assessment.groups;$('mixtureHiTable').innerHTML=groups.length?A.makeTable(['Medium','Assessment group','Endpoint','Components','HI','Interaction-adjusted HI','Dominant contributor'],groups.map(g=>[MEDIUMS[g.medium].label,g.group,g.endpoint,g.components.map(x=>x.label).join(', '),g.hi===null?'Blocked':fmt(g.hi,7),g.adjusted_hi===null?'Blocked':fmt(g.adjusted_hi,7),g.dominant?`${g.dominant.label} (${fmt(g.dominant.hq,5)})`:'—'])):'<div class="comparison-empty">No HI can be calculated until comparable PNECs are supplied.</div>';const valid=groups.filter(g=>g.adjusted_hi!==null);Plotly.react('mixtureHiChart',[{type:'bar',x:valid.map(g=>`${MEDIUMS[g.medium].label} · ${g.group}`),y:valid.map(g=>g.adjusted_hi),customdata:valid.map(g=>g.endpoint),hovertemplate:'%{x}<br>Adjusted HI: %{y:.5g}<br>%{customdata}<extra></extra>'}],{margin:{l:70,r:20,t:15,b:120},yaxis:{title:{text:'Screening hazard index (dimensionless)'},type:valid.some(g=>g.adjusted_hi>100)?'log':'linear'},xaxis:{tickangle:-25},shapes:[{type:'line',x0:-.5,x1:Math.max(.5,valid.length-.5),y0:1,y1:1,line:{dash:'dash'}}],paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});}
function renderDynamicResults(){const panel=$('mixtureDynamicPanel');if(state.results.mode!=='dynamic_probabilistic'){panel.hidden=true;return;}panel.hidden=false;const years=state.results.components[0].result.annual.map(r=>r.year),medium=state.settings.medium,meta=MEDIUMS[medium],traces=state.results.components.map((c,i)=>({type:'scatter',mode:'lines',name:c.component.label,x:years,y:c.result.annual.map(r=>r.pec[meta.pec]),line:{color:COLORS[i%COLORS.length]}}));const assessments=years.map((_,i)=>assessAt(state.results.components,i));if(assessments.every(a=>a.totals[medium].value!==null))traces.push({type:'scatter',mode:'lines',name:'Total co-occurring mass',x:years,y:assessments.map(a=>a.totals[medium].value),line:{dash:'dash',width:3}});Plotly.react('mixtureDynamicChart',traces,{margin:{l:85,r:20,t:15,b:60},xaxis:{title:{text:'Calendar year (year)'}},yaxis:{title:{text:`${meta.label} concentration (${meta.unit})`}},legend:{orientation:'h'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});const groupKeys=[...new Set(assessments.flatMap(a=>a.groups.map(g=>`${g.medium}|||${g.group}`)))].filter(k=>k.startsWith(medium+'|||'));const hiTraces=groupKeys.map((k,i)=>({type:'scatter',mode:'lines',name:k.split('|||')[1],x:years,y:assessments.map(a=>a.groups.find(g=>`${g.medium}|||${g.group}`===k)?.adjusted_hi??null),line:{color:COLORS[i%COLORS.length]}}));Plotly.react('mixtureDynamicHiChart',hiTraces,{margin:{l:75,r:20,t:15,b:60},xaxis:{title:{text:'Calendar year (year)'}},yaxis:{title:{text:'Interaction-adjusted hazard index (dimensionless)'}},shapes:[{type:'line',x0:years[0],x1:years.at(-1),y0:1,y1:1,line:{dash:'dash'}}],legend:{orientation:'h'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});$('mixtureDynamicTable').innerHTML=A.makeTable(['Year',...state.results.components.map(c=>`${c.component.label} (${meta.unit})`),'Total compatible mass',...groupKeys.map(k=>`HI: ${k.split('|||')[1]}`)],years.map((y,i)=>[y,...state.results.components.map(c=>fmt(c.result.annual[i].pec[meta.pec],7)),assessments[i].totals[medium].value===null?'Blocked':fmt(assessments[i].totals[medium].value,7),...groupKeys.map(k=>fmt(assessments[i].groups.find(g=>`${g.medium}|||${g.group}`===k)?.adjusted_hi??0,7))]));}
async function runUncertainty(){if(!state.results)run();if(!state.results)return;const errors=validate();if(errors.length){alert(errors.join('\n'));return;}const iterations=Math.max(50,Math.min(A.state.mode==='dynamic_probabilistic'?100:1000,num($('mixtureIterations').value,250))),seed=num($('mixtureSeed').value,52),rsd=num($('mixtureRsd').value,.25),growthSdPct=num($('mixtureGrowthSd').value,5),profile=uncertaintyProfile(),rng=E.mulberry32(seed),active=state.components.filter(c=>c.active),years=A.state.mode==='dynamic_probabilistic'?trajectoryFor(active[0]).map(r=>r.year):[num($('baseYear')?.value,2024)],mediumSamples=Object.fromEntries(Object.keys(MEDIUMS).map(m=>[m,years.map(()=>[])])),hiSamples={},dominant={};$('runMixtureMcBtn').disabled=true;$('mixtureMcStatus').textContent='Running…';await new Promise(r=>setTimeout(r,20));
  try{for(let it=0;it<iterations;it++){
    const countryCv=E.uncertaintyCv(profile,'country_domain',rsd),envCv=E.uncertaintyCv(profile,'environment_capacity',rsd),geo=E.sampleRegionAndEnvironment(A.currentRegion(),A.state.environment,rng,countryCv,envCv),marketCv=E.uncertaintyCv(profile,'market_input',rsd),groupFactors=Object.fromEntries(state.formulations.map(f=>[f.id,E.lognormalMultiplier(rng,marketCv)])),compResults=[],pnecOverrides={};
    active.forEach(c=>{const base=componentScenario(c,A.state.mode==='dynamic_probabilistic'),s=E.sampleScenario({...base,trajectory:A.state.mode==='dynamic_probabilistic'?trajectoryFor(c):null,rng,rsd,lifetimeRsd:rsd,growthSdPct,uncertaintyProfile:profile});let marketFactor=c.input_mode==='formulation'?groupFactors[c.formulation_id]:E.lognormalMultiplier(rng,marketCv);if(A.state.mode==='dynamic_probabilistic'){s.trajectory.forEach(r=>r.primary_input_kg_y=Math.max(0,r.primary_input_kg_y*marketFactor));const result=E.runDynamicMFA({...base,...s,...geo});compResults.push({component:c,result,initial_effective_input_kg_y:s.trajectory[0]?.primary_input_kg_y||0,effective_input_kg_y:result.final?.primary_input_kg_y||0,final_total_product_input_kg_y:result.final?.total_product_input_kg_y||0});}else{const total=componentInput(c)*A.geographicScale()*marketFactor;const result=E.runStaticMFA({...base,...s,...geo,total});compResults.push({component:c,result,effective_input_kg_y:total});}pnecOverrides[c.id]={};Object.keys(MEDIUMS).forEach(m=>{const p=c.pnec[m];pnecOverrides[c.id][m]=p.value>0?p.value*E.lognormalMultiplier(rng,p.cv):0;});});
    years.forEach((_,yi)=>{const ass=assessAt(compResults,A.state.mode==='dynamic_probabilistic'?yi:null,pnecOverrides);Object.keys(MEDIUMS).forEach(m=>{if(ass.totals[m].value!==null)mediumSamples[m][yi].push(ass.totals[m].value);});ass.groups.forEach(g=>{if(g.adjusted_hi===null)return;const key=`${g.medium}|||${g.group}`;(hiSamples[key]??=years.map(()=>[]))[yi].push(g.adjusted_hi);if(yi===years.length-1&&g.dominant){const dk=`${key}|||${g.dominant.component_id}`;dominant[dk]=(dominant[dk]||0)+1;}});});
  }
  state.uncertainty={iterations,years,medium:Object.fromEntries(Object.entries(mediumSamples).map(([m,arr])=>[m,arr.map(x=>x.length?E.summarizeSamples(x):null)])),hi:Object.fromEntries(Object.entries(hiSamples).map(([k,arr])=>[k,arr.map(x=>x.length?{...E.summarizeSamples(x),prob_gt_1:x.filter(v=>v>1).length/x.length}:null)])),dominant};renderUncertainty();$('mixtureMcStatus').textContent=`Completed ${iterations} joint iterations.`;
  }catch(err){alert(err.message);$('mixtureMcStatus').textContent='Error';}finally{$('runMixtureMcBtn').disabled=false;}
}
function renderUncertainty(){const panel=$('mixtureUncertaintyResults');if(!panel)return;if(!state.uncertainty){panel.innerHTML='<div class="comparison-empty">Run joint mixture uncertainty to estimate P5–P50–P95 and P(HI &gt; 1).</div>';return;}const u=state.uncertainty,medium=state.settings.medium,meta=MEDIUMS[medium],series=u.medium[medium],years=u.years;if(series&&series.some(Boolean)){const p5=series.map(x=>x?.P5??null),p50=series.map(x=>x?.P50??null),p95=series.map(x=>x?.P95??null);Plotly.react('mixtureUncertaintyChart',[{type:'scatter',x:years,y:p95,mode:'lines',line:{width:0},showlegend:false},{type:'scatter',x:years,y:p5,mode:'lines',fill:'tonexty',name:'P5–P95',line:{width:0}},{type:'scatter',x:years,y:p50,mode:'lines',name:'P50'}],{margin:{l:80,r:20,t:15,b:55},xaxis:{title:{text:A.state.mode==='dynamic_probabilistic'?'Calendar year (year)':'Base year'}},yaxis:{title:{text:`Total compatible ${meta.label.toLowerCase()} concentration (${meta.unit})`}},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});}
  const last=years.length-1,rows=Object.entries(u.hi).filter(([k])=>k.startsWith(medium+'|||')).map(([k,arr])=>{const v=arr[last];return [k.split('|||')[1],v?fmt(v.P5,6):'—',v?fmt(v.P50,6):'—',v?fmt(v.P95,6):'—',v?fmt(v.prob_gt_1*100,5)+'%':'—'];});$('mixtureUncertaintyTable').innerHTML=rows.length?A.makeTable(['Assessment group','HI P5','HI P50','HI P95','P(HI > 1)'],rows):'<div class="comparison-empty">No probabilistic HI was available for the selected medium.</div>';
}
function exportJson(){A.download('K-NanoMFA_multi_material_project_v201.json',JSON.stringify({app:'K-NanoMFA',version:'2.0.1-en',mixture:getState(),outputs:getOutputs()},null,2),'application/json');}
function exportCsv(){if(!state.results){alert('Run the multi-material assessment first.');return;}const rows=[['material','medium','pec','unit','pnec','hq','assessment_group','tracking_basis'].join(',')];state.results.assessment.records.forEach(r=>rows.push([r.label,r.medium,r.pec,r.unit,r.pnec,r.hq??'',r.group,r.tracking_basis].map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')));A.download('K-NanoMFA_multi_material_coexposure_v20.csv',rows.join('\n'),'text/csv;charset=utf-8');}
function getState(){return clone({assessmentMode:state.assessmentMode,components:state.components,formulations:state.formulations,interactions:state.interactions,settings:state.settings});}
function loadState(x){
  if(!x||typeof x!=='object')return;
  state.assessmentMode=x.assessmentMode==='multi'?'multi':'single';
  state.formulations=(Array.isArray(x.formulations)?x.formulations:[]).map(normalizeFormulation);
  state.components=(Array.isArray(x.components)?x.components:[]).map(normalizeComponent);
  const ids=new Set(state.components.map(c=>c.id));
  state.interactions=(Array.isArray(x.interactions)?clone(x.interactions):[]).filter(r=>ids.has(r.a)&&ids.has(r.b)&&MEDIUMS[r.medium]).map(r=>({...r,beta:num(r.beta),source:String(r.source||'')}));
  state.settings={...state.settings,...clone(x.settings||{})};if(!MEDIUMS[state.settings.medium])state.settings.medium='surface_water';
  state.settings.iterations=Math.max(50,num(state.settings.iterations,250));state.settings.rsd=Math.max(0,num(state.settings.rsd,.25));state.settings.growthSdPct=Math.max(0,num(state.settings.growthSdPct,5));
  state.results=null;state.uncertainty=null;renderAll();
}
function getOutputs(){return clone({results:state.results,uncertainty:state.uncertainty});}
function isMultiMode(){return state.assessmentMode==='multi';}
function setMode(v){state.assessmentMode=v==='multi'?'multi':'single';renderStatus();if(state.assessmentMode==='multi')A.switchTab('mixture');}
function bind(){
  $('assessmentMode').addEventListener('change',e=>setMode(e.target.value));$('addMixtureMaterialBtn').onclick=()=>addBundled($('mixtureMaterialPicker').value);$('addCurrentScenarioBtn').onclick=addCurrent;$('addFormulationBtn').onclick=()=>{state.formulations.push(defaultFormulation());renderAll();};$('runMixtureBtn').onclick=run;$('mixtureMediumSelect').onchange=e=>{state.settings.medium=e.target.value;renderResults();};$('allowIncompatibleSum').onchange=e=>{state.settings.allowIncompatibleSum=e.target.checked;if(state.results){state.results.assessment=assessAt(state.results.components);renderResults();}};$('runMixtureMcBtn').onclick=runUncertainty;$('exportMixtureJsonBtn').onclick=exportJson;$('exportMixtureCsvBtn').onclick=exportCsv;$('importMixtureJson').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);loadState(x.mixture||x);setMode('multi');alert('Mixture project imported. Run the assessment to regenerate outputs.');}catch(err){alert(err.message);}};r.readAsText(f);};
  ['mixtureIterations','mixtureSeed','mixtureRsd','mixtureGrowthSd'].forEach(id=>$(id).addEventListener('change',()=>{const map={mixtureIterations:'iterations',mixtureSeed:'seed',mixtureRsd:'rsd',mixtureGrowthSd:'growthSdPct'};state.settings[map[id]]=num($(id).value);}));
  document.querySelectorAll('[data-guide-tab="mixture"]').forEach(b=>b.addEventListener('click',()=>A.switchTab('mixture')));
}
function init(){
  $('mixtureMaterialPicker').innerHTML=currentMaterialOptions();$('mixtureMediumSelect').innerHTML=Object.entries(MEDIUMS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');$('mixtureMediumSelect').value=state.settings.medium;$('allowIncompatibleSum').checked=state.settings.allowIncompatibleSum;$('mixtureIterations').value=state.settings.iterations;$('mixtureSeed').value=state.settings.seed;$('mixtureRsd').value=state.settings.rsd;$('mixtureGrowthSd').value=state.settings.growthSdPct;
  if(!state.components.length){addBundled('AgNP');addBundled('nano-TiO2');}
  bind();renderAll();if(window.__KNANO_PENDING_MIXTURE_STATE){loadState(window.__KNANO_PENDING_MIXTURE_STATE);delete window.__KNANO_PENDING_MIXTURE_STATE;}
}
window.KNanoMixture={state,run,runUncertainty,getState,loadState,getOutputs,isMultiMode,setMode,renderAll};
document.addEventListener('DOMContentLoaded',init);
})();
