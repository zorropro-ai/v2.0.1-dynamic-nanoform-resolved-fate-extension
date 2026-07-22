(function(root,factory){
  const api=factory();
  root.KNanoProductInventory=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const SCHEMA='K-NanoMFA-product-inventory-v1.4';
const BASIS={
  direct_enm:{label:'Direct ENM mass',quantity:'ENM mass (kg/y)',factor:'Not used'},
  product_mass:{label:'Product mass × content',quantity:'Product mass (kg/y)',factor:'Not used'},
  unit_sales:{label:'Unit sales × unit mass',quantity:'Units sold (items/y)',factor:'Unit mass (kg/item)'},
  area_loading:{label:'Area × ENM loading',quantity:'Product area (m²/y)',factor:'ENM loading (g/m²)'},
  volume_concentration:{label:'Volume × ENM concentration',quantity:'Product volume (L/y)',factor:'ENM concentration (g/L)'}
};
const EVIDENCE=['A','B','C','D','E'];
let model={schema:SCHEMA,input_mode:'direct_enm',rows:[]};
let app=null;
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,num(v)));
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=(v,d=6)=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:d}):'–';
function defaultRow(product,legacyTotal=1000){
  const allocation=clamp(product?.allocation_pct,0,100);
  const direct=Math.max(0,num(legacyTotal))*allocation/100;
  return {
    product_category:String(product?.product_category||'Product'),input_basis:'direct_enm',
    primary_quantity:direct,conversion_factor:1,enm_content_wt_pct:1,nano_enabled_pct:100,
    market_growth_pct_y:0,content_change_pct_y:0,nano_enabled_change_pct_y:0,
    quantity_cv:0.30,content_cv:0.25,nano_enabled_cv:0.20,evidence_class:'E',
    reference_year:2024,geography_scope:'User-defined',source_note:'Initialized from the legacy ENM input and product-allocation shares.'
  };
}
function normalizeRow(row,product,legacyTotal=1000){
  const d=defaultRow(product,legacyTotal),r={...d,...clone(row||{})};
  r.product_category=String(product?.product_category||r.product_category||'Product');
  if(!BASIS[r.input_basis])r.input_basis='direct_enm';
  ['primary_quantity','conversion_factor','enm_content_wt_pct','nano_enabled_pct','market_growth_pct_y','content_change_pct_y','nano_enabled_change_pct_y','quantity_cv','content_cv','nano_enabled_cv','reference_year'].forEach(k=>r[k]=num(r[k],d[k]));
  if(!EVIDENCE.includes(r.evidence_class))r.evidence_class='E';
  r.geography_scope=String(r.geography_scope||'User-defined');r.source_note=String(r.source_note||'');
  return r;
}
function syncProducts(products,legacyTotal=1000,{reset=false}={}){
  const old=reset?[]:model.rows;
  model.rows=(products||[]).map((p,i)=>{
    const found=old.find(r=>r.product_category===p.product_category)||old[i];
    return normalizeRow(found,p,legacyTotal);
  });
  return clone(model.rows);
}
function initializeFromLegacy(products,total){model.rows=(products||[]).map(p=>defaultRow(p,total));model.input_mode='product_inventory';return clone(model.rows);}
function isActive(){return model.input_mode==='product_inventory';}
function setInputMode(mode){model.input_mode=mode==='product_inventory'?'product_inventory':'direct_enm';return model.input_mode;}
function annualFactors(row,offset){
  const market=Math.pow(Math.max(0,1+num(row.market_growth_pct_y)/100),offset);
  const content=Math.pow(Math.max(0,1+num(row.content_change_pct_y)/100),offset);
  const enabled=Math.pow(Math.max(0,1+num(row.nano_enabled_change_pct_y)/100),offset);
  return {market,content,enabled};
}
function deriveRow(row,offset=0){
  const q=Math.max(0,num(row.primary_quantity)),f=Math.max(0,num(row.conversion_factor,1));
  const af=annualFactors(row,Math.max(0,Math.round(num(offset))));
  const content=clamp(num(row.enm_content_wt_pct)*af.content,0,100)/100;
  const enabled=clamp(num(row.nano_enabled_pct)*af.enabled,0,100)/100;
  let carrier=0,enm=0;
  if(row.input_basis==='direct_enm'){carrier=q*af.market;enm=carrier;}
  else if(row.input_basis==='product_mass'){carrier=q*af.market;enm=carrier*content*enabled;}
  else if(row.input_basis==='unit_sales'){carrier=q*af.market;enm=carrier*f*content*enabled;}
  else if(row.input_basis==='area_loading'){carrier=q*af.market;enm=carrier*f/1000*enabled;}
  else if(row.input_basis==='volume_concentration'){carrier=q*af.market;enm=carrier*f/1000*enabled;}
  return {product_category:row.product_category,input_basis:row.input_basis,carrier_quantity:carrier,content_pct:content*100,nano_enabled_pct:enabled*100,enm_kg_y:Math.max(0,enm)};
}
function allocationProducts(products,byProduct){
  const total=Object.values(byProduct||{}).reduce((a,b)=>a+Math.max(0,num(b)),0);
  return clone(products||[]).map(p=>({...p,allocation_pct:total>0?Math.max(0,num(byProduct[p.product_category]))/total*100:num(p.allocation_pct)}));
}
function prepareStatic(products){
  syncProducts(products,0);
  const details=model.rows.map(r=>deriveRow(r,0));
  const by_product=Object.fromEntries(details.map(r=>[r.product_category,r.enm_kg_y]));
  const total_kg_y=details.reduce((a,r)=>a+r.enm_kg_y,0);
  return {mode:model.input_mode,total_kg_y,by_product,details,products:allocationProducts(products,by_product)};
}
function buildTrajectory(products,startYear,endYear){
  syncProducts(products,0);
  const start=Math.round(num(startYear)),end=Math.round(num(endYear));
  if(!Number.isInteger(start)||!Number.isInteger(end)||end<start)throw new Error('Product-informed trajectory years are invalid.');
  const rows=[];
  for(let year=start;year<=end;year++){
    const details=model.rows.map(r=>deriveRow(r,year-start));
    const product_inputs_kg_y=Object.fromEntries(details.map(r=>[r.product_category,r.enm_kg_y]));
    rows.push({year,primary_input_kg_y:details.reduce((a,r)=>a+r.enm_kg_y,0),product_inputs_kg_y,product_input_details:details});
  }
  return rows;
}
function combinedCv(row){
  const q=Math.max(0,num(row.quantity_cv)),c=Math.max(0,num(row.content_cv)),n=Math.max(0,num(row.nano_enabled_cv));
  if(row.input_basis==='direct_enm')return q;
  if(row.input_basis==='area_loading'||row.input_basis==='volume_concentration')return Math.sqrt(q*q+n*n);
  return Math.sqrt(q*q+c*c+n*n);
}
function uncertaintyRows(byProduct,scale=1){
  return model.rows.map(r=>({product_category:r.product_category,mass_kg_y:Math.max(0,num(byProduct?.[r.product_category]))*Math.max(0,num(scale,1)),cv:combinedCv(r),distribution:'lognormal',evidence_class:r.evidence_class,source_note:r.source_note}));
}
function validate(products,dynamicSettings=null){
  if(!isActive())return [];
  syncProducts(products,0);
  const errors=[];
  if(!model.rows.length)errors.push('At least one product-inventory row is required.');
  model.rows.forEach((r,i)=>{
    const label=r.product_category||`Product row ${i+1}`;
    if(!BASIS[r.input_basis])errors.push(`${label}: unsupported product-input basis.`);
    if(!(Number.isFinite(num(r.primary_quantity))&&num(r.primary_quantity)>=0))errors.push(`${label}: primary quantity must be finite and non-negative.`);
    if(['unit_sales','area_loading','volume_concentration'].includes(r.input_basis)&&!(Number.isFinite(num(r.conversion_factor))&&num(r.conversion_factor)>=0))errors.push(`${label}: conversion factor must be finite and non-negative.`);
    if(['product_mass','unit_sales'].includes(r.input_basis)&&!(num(r.enm_content_wt_pct)>=0&&num(r.enm_content_wt_pct)<=100))errors.push(`${label}: ENM content must be between 0 and 100 wt%.`);
    if(!(num(r.nano_enabled_pct)>=0&&num(r.nano_enabled_pct)<=100))errors.push(`${label}: nano-enabled share must be between 0 and 100%.`);
    ['market_growth_pct_y','content_change_pct_y','nano_enabled_change_pct_y'].forEach(k=>{if(!Number.isFinite(num(r[k]))||num(r[k])<-100)errors.push(`${label}: ${k} must be finite and cannot be below −100%.`);});
    ['quantity_cv','content_cv','nano_enabled_cv'].forEach(k=>{if(!Number.isFinite(num(r[k]))||num(r[k])<0)errors.push(`${label}: ${k} must be a finite non-negative coefficient of variation.`);});
  });
  const prepared=prepareStatic(products);
  if(!(prepared.total_kg_y>0))errors.push('The product-informed inventory produces zero nanomaterial input.');
  if(dynamicSettings){
    const rows=buildTrajectory(products,dynamicSettings.start_year,dynamicSettings.end_year);
    if(rows.some(r=>!(r.primary_input_kg_y>=0&&Number.isFinite(r.primary_input_kg_y))))errors.push('The product-informed dynamic trajectory contains an invalid annual input.');
  }
  return errors;
}
function getState(){return clone(model);}
function loadState(value,products,legacyTotal=1000){
  const x=value&&typeof value==='object'?clone(value):{};
  model={schema:SCHEMA,input_mode:x.input_mode==='product_inventory'?'product_inventory':'direct_enm',rows:Array.isArray(x.rows)?x.rows:[]};
  syncProducts(products,legacyTotal);
  return getState();
}
function renameProduct(index,name){if(model.rows[index])model.rows[index].product_category=String(name||'').trim();}
function removeProduct(index){model.rows.splice(index,1);}
function addProduct(product,legacyTotal=0){model.rows.push(defaultRow(product,legacyTotal));}
function setRows(rows,products){model.rows=clone(rows||[]);syncProducts(products,0);}
function rowValueInput(r,index){
  const factorNeeded=['unit_sales','area_loading','volume_concentration'].includes(r.input_basis);
  const contentNeeded=['product_mass','unit_sales'].includes(r.input_basis);
  const basisOptions=Object.entries(BASIS).map(([k,v])=>`<option value="${k}" ${r.input_basis===k?'selected':''}>${esc(v.label)}</option>`).join('');
  return `<tr data-pi-row="${index}"><td><b>${esc(r.product_category)}</b></td><td><select data-pi-key="input_basis">${basisOptions}</select></td>`+
    `<td><input type="number" min="0" step="any" value="${r.primary_quantity}" data-pi-key="primary_quantity"><small>${esc(BASIS[r.input_basis].quantity)}</small></td>`+
    `<td><input type="number" min="0" step="any" value="${r.conversion_factor}" data-pi-key="conversion_factor" ${factorNeeded?'':'disabled'}><small>${esc(BASIS[r.input_basis].factor)}</small></td>`+
    `<td><input type="number" min="0" max="100" step="0.01" value="${r.enm_content_wt_pct}" data-pi-key="enm_content_wt_pct" ${contentNeeded?'':'disabled'}></td>`+
    `<td><input type="number" min="0" max="100" step="0.01" value="${r.nano_enabled_pct}" data-pi-key="nano_enabled_pct"></td><td class="sum-ok"><b>${fmt(deriveRow(r).enm_kg_y,8)}</b></td></tr>`;
}
function renderTables(products){
  const main=document.getElementById('productInventoryTable'),unc=document.getElementById('productInventoryUncertaintyTable');if(!main||!unc)return;
  syncProducts(products,0);
  main.innerHTML=`<thead><tr><th>Product category</th><th>Input basis</th><th>Primary quantity</th><th>Conversion factor</th><th>ENM content (wt%)</th><th>Nano-enabled share (%)</th><th>Calculated ENM (kg/y)</th></tr></thead><tbody>${model.rows.map(rowValueInput).join('')}</tbody>`;
  unc.innerHTML=`<thead><tr><th>Product category</th><th>Market change (%/y)</th><th>Content change (%/y)</th><th>Nano-enabled change (%/y)</th><th>Quantity CV</th><th>Content CV</th><th>Enabled CV</th><th>Evidence</th><th>Reference year</th><th>Geographic scope</th><th>Source / limitation note</th></tr></thead><tbody>${model.rows.map((r,i)=>`<tr data-pi-row="${i}"><td><b>${esc(r.product_category)}</b></td><td><input type="number" min="-100" step="0.1" value="${r.market_growth_pct_y}" data-pi-key="market_growth_pct_y"></td><td><input type="number" min="-100" step="0.1" value="${r.content_change_pct_y}" data-pi-key="content_change_pct_y"></td><td><input type="number" min="-100" step="0.1" value="${r.nano_enabled_change_pct_y}" data-pi-key="nano_enabled_change_pct_y"></td><td><input type="number" min="0" step="0.01" value="${r.quantity_cv}" data-pi-key="quantity_cv"></td><td><input type="number" min="0" step="0.01" value="${r.content_cv}" data-pi-key="content_cv"></td><td><input type="number" min="0" step="0.01" value="${r.nano_enabled_cv}" data-pi-key="nano_enabled_cv"></td><td><select data-pi-key="evidence_class">${EVIDENCE.map(x=>`<option ${r.evidence_class===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input type="number" min="1900" max="2200" step="1" value="${r.reference_year}" data-pi-key="reference_year"></td><td><input type="text" value="${esc(r.geography_scope)}" data-pi-key="geography_scope"></td><td><input class="source-note" type="text" value="${esc(r.source_note)}" data-pi-key="source_note"></td></tr>`).join('')}</tbody>`;
  [main,unc].forEach(table=>table.querySelectorAll('[data-pi-key]').forEach(el=>el.addEventListener('change',()=>{
    const i=Number(el.closest('[data-pi-row]').dataset.piRow),key=el.dataset.piKey;
    model.rows[i][key]=el.type==='number'?num(el.value):el.value;
    syncAllocationToProducts(products);
    if(app?.state?.mode==='dynamic_probabilistic')app?.generateProductTrajectory?.();
    else app?.refreshInputViews?.();
  })));
}
function syncAllocationToProducts(products){
  if(!isActive())return products;
  const prepared=prepareStatic(products);prepared.products.forEach((p,i)=>{if(products[i])products[i].allocation_pct=p.allocation_pct;});return products;
}
function updateVisibility(){
  const active=isActive();
  const panel=document.getElementById('productInventoryPanel'),directNotice=document.getElementById('directInputCompatibilityNotice');
  if(panel)panel.classList.toggle('inventory-active',active);
  if(directNotice)directNotice.hidden=active;
  ['legacyStaticMassLabel','legacyInitialInputLabel','legacyGrowthLabel'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=active;});
  const normalize=document.getElementById('normalizeProductsBtn');if(normalize)normalize.disabled=active;
  const select=document.getElementById('marketInputMode');if(select)select.value=model.input_mode;
  const badge=document.getElementById('marketInputModeBadge');if(badge)badge.textContent=active?'Product-informed inventory':'Direct ENM input (legacy compatible)';
}
function renderSummary(products){
  const box=document.getElementById('productInventorySummary');if(!box)return;
  if(!isActive()){
    box.innerHTML='<div class="quality-badge"><span>Active input definition</span><b>Direct ENM mass</b></div><div class="quality-badge"><span>Compatibility</span><b>v1.2.1–v1.3</b></div><div class="quality-badge"><span>Product inventory</span><b>Stored but inactive</b></div>';return;
  }
  const p=prepareStatic(products),items=Object.entries(p.by_product).sort((a,b)=>b[1]-a[1]);
  const low=model.rows.filter(r=>['D','E'].includes(r.evidence_class)).length;
  box.innerHTML=`<div class="quality-badge"><span>Calculated national ENM input</span><b>${fmt(p.total_kg_y,8)} kg/y</b></div><div class="quality-badge"><span>Dominant product source</span><b>${esc(items[0]?.[0]||'–')}</b></div><div class="quality-badge"><span>Low-evidence product rows</span><b>${low} / ${model.rows.length}</b></div>`;
}
function render(products){
  updateVisibility();
  const active=isActive();
  const detail=document.getElementById('productInventoryDetails');if(detail)detail.hidden=!active;
  renderSummary(products);if(active)renderTables(products);
}
function renderTrajectory(table,trajectory,scale=1){
  if(!isActive()||!table)return false;
  let s='<thead><tr><th>Year</th><th>Entered ENM input (kg/y)</th><th>Effective domain input (kg/y)</th><th>Dominant product source</th><th>Product composition</th></tr></thead><tbody>';
  (trajectory||[]).forEach(r=>{
    const entries=Object.entries(r.product_inputs_kg_y||{}).sort((a,b)=>b[1]-a[1]);const dominant=entries[0]?.[0]||'–';
    const comp=entries.map(([k,v])=>`${k}: ${fmt(v,5)}`).join(' · ');
    s+=`<tr><td>${r.year}</td><td>${fmt(r.primary_input_kg_y,8)}</td><td>${fmt(r.primary_input_kg_y*scale,8)}</td><td>${esc(dominant)}</td><td class="pi-composition">${esc(comp)}</td></tr>`;
  });
  s+='</tbody>';table.innerHTML=s;return true;
}
function renderResult(result){
  const panel=document.getElementById('productSourcePanel'),table=document.getElementById('productSourceTable'),chart=document.getElementById('productSourceChart');if(!panel||!table||!chart)return;
  const info=result?.product_input;if(!info||info.mode!=='product_inventory'){panel.hidden=true;chart.innerHTML='';table.innerHTML='';return;}
  panel.hidden=false;
  let rows=[];
  if(Array.isArray(info.annual)&&info.annual.length){
    const final=info.annual.at(-1),cum={};info.annual.forEach(y=>Object.entries(y.by_product||{}).forEach(([k,v])=>cum[k]=(cum[k]||0)+num(v)));
    rows=Object.entries(final.by_product||{}).map(([k,v])=>[k,v,cum[k]||0]);
    table.innerHTML=app.makeTable(['Product source',`Final-year input (${final.year}, kg/y)`,'Cumulative input (kg)'],rows.map(r=>[r[0],fmt(r[1],8),fmt(r[2],8)]));
  }else{
    rows=Object.entries(info.by_product||{}).map(([k,v])=>[k,v,v]);
    table.innerHTML=app.makeTable(['Product source','Effective-domain ENM input (kg/y)','Share (%)'],rows.map(r=>[r[0],fmt(r[1],8),fmt(r[1]/Math.max(info.total_kg_y,1e-30)*100,5)]));
  }
  if(globalThis.Plotly)globalThis.Plotly.react(chart,[{type:'bar',x:rows.map(r=>r[1]),y:rows.map(r=>r[0]),orientation:'h',hovertemplate:'%{y}<br>%{x:.6g} kg/y<extra></extra>'}],{margin:{l:210,r:30,t:20,b:70},xaxis:{title:'Nanomaterial input (kg/y)'},yaxis:{autorange:'reversed'},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)'},{responsive:true,displaylogo:false});
}
function initUI(appApi){
  app=appApi;
  const sel=document.getElementById('marketInputMode');if(sel){sel.value=model.input_mode;sel.addEventListener('change',()=>{
    setInputMode(sel.value);
    if(isActive()&&prepareStatic(app.state.products).total_kg_y<=0)initializeFromLegacy(app.state.products,num(document.getElementById('totalMass')?.value,1000));
    syncAllocationToProducts(app.state.products);app.generateProductTrajectory?.();app.refreshInputViews();
  });}
  document.getElementById('initializeProductInventoryBtn')?.addEventListener('click',()=>{initializeFromLegacy(app.state.products,num(document.getElementById('totalMass')?.value,1000));syncAllocationToProducts(app.state.products);app.generateProductTrajectory?.();app.refreshInputViews();});
  document.getElementById('exportProductInventoryBtn')?.addEventListener('click',()=>app.download('K-NanoMFA_product_inventory_v20.json',JSON.stringify(getState(),null,2),'application/json'));
  document.getElementById('importProductInventory')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{loadState(JSON.parse(reader.result),app.state.products,num(document.getElementById('totalMass')?.value,1000));syncAllocationToProducts(app.state.products);app.generateProductTrajectory?.();app.refreshInputViews();}catch(err){alert(err.message);}};reader.readAsText(f);});
  render(app.state.products);
}
return {SCHEMA,BASIS,defaultRow,syncProducts,initializeFromLegacy,isActive,setInputMode,deriveRow,prepareStatic,buildTrajectory,combinedCv,uncertaintyRows,validate,getState,loadState,renameProduct,removeProduct,addProduct,setRows,syncAllocationToProducts,render,renderTrajectory,renderResult,initUI};
});
