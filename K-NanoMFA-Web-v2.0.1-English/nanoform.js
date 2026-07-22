(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KNanoNanoform=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const VERSION='1.5';
  const STATE_KEYS=['matrix_bound','free_particulate','aggregated','dissolved','transformed_particulate','unresolved','non_nano_destroyed'];
  const EDITABLE_STATE_KEYS=STATE_KEYS.filter(k=>k!=='non_nano_destroyed');
  const STATE_LABELS={
    matrix_bound:'Matrix-bound nanoform',
    free_particulate:'Free particulate nanoform',
    aggregated:'Aggregated / agglomerated nanoform',
    dissolved:'Dissolved constituent',
    transformed_particulate:'Transformed particulate form',
    unresolved:'Unresolved form',
    non_nano_destroyed:'Non-nano / destroyed mass'
  };
  const MEDIUM_LABELS={air:'Air',surface_water:'Surface water',soil:'Soil'};
  const MATERIAL_PRESETS={
    persistent_oxide:{label:'Persistent mineral oxide',free:{air:65,surface_water:25,soil:15},dissolved:{air:15,surface_water:65,soil:30},landfill_dissolved:5,transformed_bias:15},
    dissolving_metal:{label:'Dissolving metal or metal oxide',free:{air:60,surface_water:20,soil:10},dissolved:{air:45,surface_water:88,soil:75},landfill_dissolved:22,transformed_bias:18},
    carbonaceous:{label:'Persistent carbonaceous nanomaterial',free:{air:72,surface_water:22,soil:12},dissolved:{air:0,surface_water:0,soil:0},landfill_dissolved:0,transformed_bias:5},
    biodegradable:{label:'Biodegradable nanomaterial',free:{air:55,surface_water:25,soil:15},dissolved:{air:20,surface_water:45,soil:35},landfill_dissolved:8,transformed_bias:28},
    high_aspect_ratio:{label:'High-aspect-ratio nanoform',free:{air:78,surface_water:38,soil:25},dissolved:{air:0,surface_water:0,soil:0},landfill_dissolved:0,transformed_bias:8},
    custom:{label:'Custom screening behavior',free:{air:65,surface_water:25,soil:15},dissolved:{air:15,surface_water:65,soil:30},landfill_dissolved:5,transformed_bias:15}
  };
  const EMBEDDING_PRESETS={
    bulk_matrix:{label:'Bulk matrix embedded',distribution:{matrix_bound:85,free_particulate:3,aggregated:3,dissolved:0,transformed_particulate:4,unresolved:5}},
    surface_coating:{label:'Surface coating or near-surface layer',distribution:{matrix_bound:60,free_particulate:15,aggregated:10,dissolved:0,transformed_particulate:5,unresolved:10}},
    liquid_suspension:{label:'Liquid suspension or dispersion',distribution:{matrix_bound:10,free_particulate:35,aggregated:35,dissolved:5,transformed_particulate:5,unresolved:10}},
    powder:{label:'Powder formulation',distribution:{matrix_bound:5,free_particulate:45,aggregated:35,dissolved:0,transformed_particulate:5,unresolved:10}},
    porous_matrix:{label:'Porous or weakly bound matrix',distribution:{matrix_bound:65,free_particulate:10,aggregated:10,dissolved:2,transformed_particulate:5,unresolved:8}},
    custom:{label:'Custom product-state allocation',distribution:{matrix_bound:80,free_particulate:5,aggregated:5,dissolved:0,transformed_particulate:5,unresolved:5}}
  };

  const clone=x=>JSON.parse(JSON.stringify(x));
  const num=x=>Number.isFinite(Number(x))?Number(x):0;
  const zeros=()=>Object.fromEntries(STATE_KEYS.map(k=>[k,0]));
  const sum=o=>Object.values(o||{}).reduce((a,b)=>a+num(b),0);
  function normalize(o,keys=STATE_KEYS){
    const out={};const total=keys.reduce((a,k)=>a+Math.max(0,num(o?.[k])),0);
    keys.forEach(k=>out[k]=total>0?Math.max(0,num(o?.[k]))/total*100:0);
    return out;
  }
  function addScaled(target,mass,profile){
    const p=normalize(profile);STATE_KEYS.forEach(k=>target[k]+=Math.max(0,num(mass))*p[k]/100);return target;
  }
  function addObjects(target,source){STATE_KEYS.forEach(k=>target[k]+=num(source?.[k]));return target;}
  function defaultState(){
    const material_preset='persistent_oxide',embedding_preset='bulk_matrix';
    return {
      schema:'K-NanoMFA-nanoform-state-v1',enabled:false,material_preset,embedding_preset,
      product_state_pct:clone(EMBEDDING_PRESETS[embedding_preset].distribution),
      medium_splits:{
        air:{free_within_free_agg_pct:65,dissolved_within_transformed_pct:15},
        surface_water:{free_within_free_agg_pct:25,dissolved_within_transformed_pct:65},
        soil:{free_within_free_agg_pct:15,dissolved_within_transformed_pct:30}
      },
      evidence_class:'E',source_note:'Screening state-transition assumptions; replace with nanoform- and process-specific evidence.',
      limitations:'State allocations preserve mass but do not mechanistically simulate size distributions, heteroaggregation, coating loss, or reaction kinetics.'
    };
  }
  let state=defaultState(),lastResult=null,lastContext=null,lastOutput=null,app=null,initialized=false;

  function applyPreset(materialPreset=state.material_preset,embeddingPreset=state.embedding_preset){
    state.material_preset=MATERIAL_PRESETS[materialPreset]?materialPreset:'persistent_oxide';
    state.embedding_preset=EMBEDDING_PRESETS[embeddingPreset]?embeddingPreset:'bulk_matrix';
    if(state.embedding_preset!=='custom')state.product_state_pct=clone(EMBEDDING_PRESETS[state.embedding_preset].distribution);
    const p=MATERIAL_PRESETS[state.material_preset];
    Object.keys(MEDIUM_LABELS).forEach(m=>{
      state.medium_splits[m]={free_within_free_agg_pct:p.free[m],dissolved_within_transformed_pct:p.dissolved[m]};
    });
    renderAll();
    refresh();
    return getState();
  }

  function releaseStateForMedium(total,releaseFormRow,split){
    const out=zeros(),m=Math.max(0,num(total)),r=releaseFormRow||{};
    const matrix=m*Math.max(0,num(r.matrix_associated_pct))/100;
    const freeAgg=m*Math.max(0,num(r.free_nanoform_pct))/100;
    const transformed=m*Math.max(0,num(r.transformed_dissolved_pct))/100;
    const unresolved=m*Math.max(0,num(r.unknown_pct))/100;
    const freeShare=Math.max(0,Math.min(100,num(split?.free_within_free_agg_pct)))/100;
    const dissolvedShare=Math.max(0,Math.min(100,num(split?.dissolved_within_transformed_pct)))/100;
    out.matrix_bound=matrix;
    out.free_particulate=freeAgg*freeShare;
    out.aggregated=freeAgg*(1-freeShare);
    out.dissolved=transformed*dissolvedShare;
    out.transformed_particulate=transformed*(1-dissolvedShare);
    out.unresolved=unresolved;
    return out;
  }

  function terminalProfiles(config=state){
    const material=MATERIAL_PRESETS[config.material_preset]||MATERIAL_PRESETS.persistent_oxide;
    const product=normalize(config.product_state_pct,EDITABLE_STATE_KEYS);
    product.non_nano_destroyed=0;
    const reuse=normalize({...product,matrix_bound:num(product.matrix_bound)+8,free_particulate:num(product.free_particulate)*.6,aggregated:num(product.aggregated)*.8,unresolved:num(product.unresolved)+2});
    const recovery=normalize({...product,matrix_bound:num(product.matrix_bound)*.58,free_particulate:num(product.free_particulate)*.45,aggregated:num(product.aggregated)*.8,dissolved:num(product.dissolved)*.4,transformed_particulate:num(product.transformed_particulate)+material.transformed_bias+18,unresolved:num(product.unresolved)+5});
    const landfill=normalize({...product,matrix_bound:num(product.matrix_bound)*.58,free_particulate:num(product.free_particulate)*.65,aggregated:num(product.aggregated)+18,dissolved:num(product.dissolved)+material.landfill_dissolved,transformed_particulate:num(product.transformed_particulate)+material.transformed_bias,unresolved:num(product.unresolved)+5});
    const recycledFeedstock=normalize({...recovery,matrix_bound:num(recovery.matrix_bound)+12,transformed_particulate:num(recovery.transformed_particulate)-5});
    return {
      in_use_stock:product,reuse_product_stock:reuse,landfill_stock:landfill,recovery_resource:recovery,recycled_feedstock_stock:recycledFeedstock,
      transformation_loss:{matrix_bound:0,free_particulate:0,aggregated:0,dissolved:0,transformed_particulate:0,unresolved:0,non_nano_destroyed:100},
      other_unclassified:{matrix_bound:0,free_particulate:0,aggregated:0,dissolved:0,transformed_particulate:0,unresolved:100,non_nano_destroyed:0}
    };
  }

  function environmentalStatesFromRow(row,releaseForms,config=state){
    const releases=row?.model==='static'||row?.terminal?{
      air:num(row.terminal?.air),surface_water:num(row.terminal?.surface_water),soil:num(row.terminal?.soil)
    }:{
      air:num(row?.air_release_kg_y),surface_water:num(row?.surface_water_release_kg_y),soil:num(row?.soil_release_kg_y)
    };
    const by_medium={};
    Object.keys(MEDIUM_LABELS).forEach(m=>by_medium[m]=releaseStateForMedium(releases[m],releaseForms?.[m],config.medium_splits?.[m]));
    return {releases,by_medium};
  }

  function stateSpecificPec(result,context,config=state){
    const dynamic=result?.model==='dynamic';
    const final=dynamic?result.final:result;
    const finalEnv=environmentalStatesFromRow(final,context.releaseForms,config);
    const fractions={air:normalize(finalEnv.by_medium.air),surface_water:normalize(finalEnv.by_medium.surface_water),soil:normalize(finalEnv.by_medium.soil),sediment:zeros()};
    if(dynamic){
      const soilStocks=zeros(),sedStocks=zeros();
      const soilRetention=Math.exp(-1/Math.max(num(context.environment?.soil_residence_time_y)||1,1e-9));
      const sedRetention=Math.exp(-1/Math.max(num(context.environment?.sediment_residence_time_y)||1,1e-9));
      const sedTransfer=Math.max(0,num(context.environment?.water_to_sediment_pct))/100;
      result.annual.forEach(row=>{
        const e=environmentalStatesFromRow(row,context.releaseForms,config).by_medium;
        STATE_KEYS.forEach(k=>{
          soilStocks[k]=soilStocks[k]*soilRetention+e.soil[k];
          sedStocks[k]=sedStocks[k]*sedRetention+e.surface_water[k]*sedTransfer;
        });
      });
      fractions.soil=normalize(soilStocks);fractions.sediment=normalize(sedStocks);
    }else{
      fractions.sediment=normalize(finalEnv.by_medium.surface_water);
    }
    const pec=final?.pec||{};
    const metricMap={air:'air_pec_ng_m3',surface_water:'surface_water_pec_ug_L',soil:'soil_pec_ug_kg',sediment:'active_sediment_pec_ug_kg'};
    const units={air:'ng/m³',surface_water:'µg/L',soil:'µg/kg',sediment:'µg/kg'};
    const rows=[];
    Object.entries(metricMap).forEach(([medium,key])=>STATE_KEYS.forEach(k=>rows.push({medium,state:k,value:num(pec[key])*num(fractions[medium][k])/100,unit:units[medium],base_metric:key})));
    return {fractions,rows};
  }

  function computeStatic(result,context,config=state){
    const env=environmentalStatesFromRow(result,context.releaseForms,config),profiles=terminalProfiles(config),inventory=zeros();
    Object.values(env.by_medium).forEach(x=>addObjects(inventory,x));
    addScaled(inventory,result.terminal?.recovery_resource,profiles.recovery_resource);
    addScaled(inventory,result.terminal?.reuse_product_stock,profiles.reuse_product_stock);
    addScaled(inventory,result.terminal?.landfill_stock,profiles.landfill_stock);
    addScaled(inventory,result.terminal?.transformation_loss,profiles.transformation_loss);
    addScaled(inventory,result.terminal?.other_unclassified,profiles.other_unclassified);
    const basis=num(result.terminal_total)||sum(result.terminal),total=sum(inventory);
    return {mode:'static_state_snapshot',basis_kg:basis,state_inventory_kg:inventory,total_state_mass_kg:total,state_balance_residual_kg:basis-total,state_balance_closure_pct:basis>0?total/basis*100:100,environmental:env,profiles,pec:stateSpecificPec(result,context,config)};
  }

  function computeDynamic(result,context,config=state){
    const profiles=terminalProfiles(config),inventory=zeros(),annual=[];
    result.annual.forEach(row=>{
      const env=environmentalStatesFromRow(row,context.releaseForms,config),annualStates=zeros();
      Object.values(env.by_medium).forEach(x=>addObjects(annualStates,x));
      addScaled(annualStates,row.recovery_output_kg_y,profiles.recovery_resource);
      addScaled(annualStates,row.transformation_loss_kg_y,profiles.transformation_loss);
      addScaled(annualStates,row.other_output_kg_y,profiles.other_unclassified);
      addObjects(inventory,annualStates);
      annual.push({year:row.year,external_state_flows_kg_y:annualStates,environmental:env.by_medium});
    });
    const f=result.final||{};
    addScaled(inventory,f.in_use_stock_kg,profiles.in_use_stock);
    addScaled(inventory,f.reuse_stock_kg,profiles.reuse_product_stock);
    addScaled(inventory,f.landfill_stock_kg,profiles.landfill_stock);
    addScaled(inventory,f.recycled_feedstock_stock_kg,profiles.recycled_feedstock_stock);
    const basis=num(f.cumulative_accounted_input_kg),total=sum(inventory);
    return {mode:'dynamic_cumulative_state_inventory',basis_kg:basis,state_inventory_kg:inventory,total_state_mass_kg:total,state_balance_residual_kg:basis-total,state_balance_closure_pct:basis>0?total/basis*100:100,annual,final_environmental:environmentalStatesFromRow(f,context.releaseForms,config),profiles,pec:stateSpecificPec(result,context,config)};
  }

  function compute(result,context,config=state){
    if(!config.enabled||!result)return null;
    const output=result.model==='dynamic'?computeDynamic(result,context,config):computeStatic(result,context,config);
    output.schema='K-NanoMFA-nanoform-output-v1';
    output.version=VERSION;
    output.configuration=clone(config);
    output.scientific_boundary='Screening state allocation with exact mass conservation. State-specific PECs use proportional allocation within the existing medium-specific concentration calculation; they are not mechanistic particle-fate predictions.';
    return output;
  }

  function validate(config=state){
    const errors=[],warnings=[];
    if(!config.enabled)return {errors,warnings};
    const total=EDITABLE_STATE_KEYS.reduce((a,k)=>a+num(config.product_state_pct?.[k]),0);
    if(Math.abs(total-100)>.05)errors.push(`Initial product-state allocation totals ${total.toFixed(3)}%, not 100%.`);
    Object.keys(MEDIUM_LABELS).forEach(m=>{
      const s=config.medium_splits?.[m]||{};
      for(const k of ['free_within_free_agg_pct','dissolved_within_transformed_pct'])if(num(s[k])<0||num(s[k])>100)errors.push(`${MEDIUM_LABELS[m]} state split must remain between 0 and 100%.`);
    });
    if(config.evidence_class==='E')warnings.push('Nanoform transition parameters use an expert screening evidence class.');
    return {errors,warnings};
  }

  function getState(){return clone(state);}
  function loadState(x){state={...defaultState(),...clone(x||{})};state.product_state_pct={...defaultState().product_state_pct,...clone(x?.product_state_pct||{})};state.medium_splits={...defaultState().medium_splits,...clone(x?.medium_splits||{})};renderAll();refresh();}
  function getOutputs(){return clone(lastOutput);}
  function clearResult(){lastResult=null;lastOutput=null;renderResults();}
  function onModelResult(result,context){lastResult=result;lastContext=clone(context||{});lastOutput=compute(lastResult,lastContext,state);renderResults();return lastOutput;}
  function refresh(){if(app?.state?.result)onModelResult(app.state.result,{mode:app.state.mode,releaseForms:app.deepClone(app.state.releaseForms),environment:app.deepClone(app.state.environment),region:app.deepClone(app.currentRegion()),material:app.materialDisplayName()});else renderResults();if(typeof window!=='undefined')window.KNanoDynamicFate?.refresh?.();}

  const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=(v,d=6)=>Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{maximumFractionDigits:d}):'—';
  function makeTable(headers,rows){return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}

  function renderStateTable(){
    const el=$('nanoformProductStateTable');if(!el)return;
    const total=EDITABLE_STATE_KEYS.reduce((a,k)=>a+num(state.product_state_pct[k]),0);
    el.innerHTML=makeTable(['State at product input','Allocation (%)'],[
      ...EDITABLE_STATE_KEYS.map(k=>[esc(STATE_LABELS[k]),`<input type="number" min="0" max="100" step="0.1" value="${num(state.product_state_pct[k])}" data-nf-state="${k}">`]),
      ['<b>Total</b>',`<b class="${Math.abs(total-100)<.05?'sum-ok':'sum-bad'}">${fmt(total,3)}%</b>`]
    ]);
    el.querySelectorAll('[data-nf-state]').forEach(input=>input.addEventListener('change',()=>{state.product_state_pct[input.dataset.nfState]=num(input.value);state.embedding_preset='custom';if($('nanoformEmbeddingPreset'))$('nanoformEmbeddingPreset').value='custom';renderStateTable();refresh();app?.validate?.();}));
  }
  function renderSplitTable(){
    const el=$('nanoformMediumSplitTable');if(!el)return;
    el.innerHTML=makeTable(['Environmental medium','Free share within free + aggregated (%)','Dissolved share within transformed + dissolved (%)'],Object.keys(MEDIUM_LABELS).map(m=>[
      MEDIUM_LABELS[m],`<input type="number" min="0" max="100" step="1" value="${num(state.medium_splits[m]?.free_within_free_agg_pct)}" data-nf-split="${m}.free_within_free_agg_pct">`,`<input type="number" min="0" max="100" step="1" value="${num(state.medium_splits[m]?.dissolved_within_transformed_pct)}" data-nf-split="${m}.dissolved_within_transformed_pct">`
    ]));
    el.querySelectorAll('[data-nf-split]').forEach(input=>input.addEventListener('change',()=>{const [m,k]=input.dataset.nfSplit.split('.');state.medium_splits[m][k]=num(input.value);state.material_preset='custom';if($('nanoformMaterialPreset'))$('nanoformMaterialPreset').value='custom';refresh();app?.validate?.();}));
  }
  function renderProfileTable(){
    const el=$('nanoformTransitionSummary');if(!el)return;const p=terminalProfiles(state);
    const keys=['in_use_stock','reuse_product_stock','recycled_feedstock_stock','recovery_resource','landfill_stock'];
    el.innerHTML=makeTable(['Tracked destination',...STATE_KEYS.map(k=>STATE_LABELS[k])],keys.map(key=>[esc(key.replaceAll('_',' ')),...STATE_KEYS.map(k=>`${fmt(p[key][k],1)}%`)]));
  }
  function renderStatus(){
    const box=$('nanoformStatus');if(!box)return;const v=validate();
    box.className=`notice nanoform-status ${v.errors.length?'validation bad':'validation ok'}`;
    box.innerHTML=state.enabled?`<b>Nanoform state tracking is enabled.</b> ${v.errors.length?esc(v.errors.join(' ')):'The state-allocation layer will preserve the calculated MFA mass.'}${v.warnings.length?`<span>${esc(v.warnings.join(' '))}</span>`:''}`:'<b>Legacy-compatible mode.</b> Nanoform state tracking is disabled; v1.4.1 calculation and output behavior is retained.';
  }
  function renderConfig(){
    if($('nanoformEnabled'))$('nanoformEnabled').checked=Boolean(state.enabled);
    if($('nanoformMaterialPreset'))$('nanoformMaterialPreset').value=state.material_preset;
    if($('nanoformEmbeddingPreset'))$('nanoformEmbeddingPreset').value=state.embedding_preset;
    if($('nanoformEvidenceClass'))$('nanoformEvidenceClass').value=state.evidence_class;
    if($('nanoformSourceNote'))$('nanoformSourceNote').value=state.source_note||'';
    if($('nanoformLimitations'))$('nanoformLimitations').value=state.limitations||'';
    const details=$('nanoformConfigDetails');if(details)details.hidden=!state.enabled;
    renderStateTable();renderSplitTable();renderProfileTable();renderStatus();
  }
  function dominantState(inv){return STATE_KEYS.reduce((best,k)=>num(inv[k])>num(inv[best])?k:best,STATE_KEYS[0]);}
  function renderResults(){
    const panel=$('nanoformResultsPanel');if(!panel)return;
    panel.hidden=false;
    const empty=$('nanoformResultsEmpty'),body=$('nanoformResultsBody');
    if(!state.enabled){if(empty){empty.hidden=false;empty.innerHTML='<b>Nanoform state tracking is disabled.</b> Enable it in Evidence, QA and sensitivity to generate state-resolved outputs.';}if(body)body.hidden=true;return;}
    if(!lastOutput){if(empty){empty.hidden=false;empty.textContent='Run the model to calculate state-resolved inventories and PECs.';}if(body)body.hidden=true;return;}
    if(empty)empty.hidden=true;if(body)body.hidden=false;
    const o=lastOutput,inv=o.state_inventory_kg,dom=dominantState(inv);
    if($('nanoformKpis'))$('nanoformKpis').innerHTML=`<div class="kpi"><span>State-balance closure</span><b>${fmt(o.state_balance_closure_pct,8)}%</b></div><div class="kpi"><span>Dominant tracked state</span><b>${esc(STATE_LABELS[dom])}</b></div><div class="kpi"><span>Non-nano / destroyed</span><b>${fmt(inv.non_nano_destroyed,6)} kg</b></div><div class="kpi"><span>Unresolved state</span><b>${fmt(inv.unresolved,6)} kg</b></div>`;
    const labels=STATE_KEYS.map(k=>STATE_LABELS[k]),values=STATE_KEYS.map(k=>inv[k]);
    if(typeof Plotly!=='undefined'&&$('nanoformStateChart'))Plotly.react('nanoformStateChart',[{type:'bar',x:values,y:labels,orientation:'h',hovertemplate:'%{y}<br>%{x:.6g} kg<extra></extra>'}],{margin:{l:210,r:25,t:20,b:55},xaxis:{title:'State-resolved mass (kg)',automargin:true},yaxis:{automargin:true},paper_bgcolor:'transparent',plot_bgcolor:'transparent',showlegend:false},{responsive:true,displaylogo:false});
    if($('nanoformStateTable'))$('nanoformStateTable').innerHTML=makeTable(['Nanoform state','Mass (kg)','Share of state inventory (%)'],STATE_KEYS.map(k=>[STATE_LABELS[k],fmt(inv[k],8),fmt(o.total_state_mass_kg>0?inv[k]/o.total_state_mass_kg*100:0,4)]));
    const env=o.environmental||o.final_environmental;
    if($('nanoformEnvironmentTable'))$('nanoformEnvironmentTable').innerHTML=makeTable(['Medium','Nanoform state','Mass (kg/y)'],Object.keys(MEDIUM_LABELS).flatMap(m=>STATE_KEYS.map(k=>[MEDIUM_LABELS[m],STATE_LABELS[k],fmt(env.by_medium[m][k],8)])));
    if($('nanoformPecTable'))$('nanoformPecTable').innerHTML=makeTable(['Medium','Nanoform state','State-specific PEC','Unit'],o.pec.rows.map(r=>[MEDIUM_LABELS[r.medium]||r.medium,STATE_LABELS[r.state],fmt(r.value,10),r.unit]));
    const note=$('nanoformResultNote');if(note)note.textContent=o.scientific_boundary;
  }
  function renderAll(){if(typeof document==='undefined')return;renderConfig();renderResults();}

  function csvText(){
    if(!lastOutput)return '';
    const rows=['section,medium_or_destination,state,mass_kg,value,unit'];
    STATE_KEYS.forEach(k=>rows.push(`state_inventory,,"${STATE_LABELS[k]}",${lastOutput.state_inventory_kg[k]},,kg`));
    const env=lastOutput.environmental||lastOutput.final_environmental;
    Object.keys(MEDIUM_LABELS).forEach(m=>STATE_KEYS.forEach(k=>rows.push(`environmental_release,"${MEDIUM_LABELS[m]}","${STATE_LABELS[k]}",${env.by_medium[m][k]},,kg/y`)));
    lastOutput.pec.rows.forEach(r=>rows.push(`state_specific_PEC,"${MEDIUM_LABELS[r.medium]||r.medium}","${STATE_LABELS[r.state]}",,${r.value},${r.unit}`));
    return rows.join('\n');
  }

  function initUI(application){
    if(initialized||typeof document==='undefined')return;initialized=true;app=application||(typeof window!=='undefined'?window.KNanoApp:null)||null;
    const mat=$('nanoformMaterialPreset');if(mat)mat.innerHTML=Object.entries(MATERIAL_PRESETS).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('');
    const emb=$('nanoformEmbeddingPreset');if(emb)emb.innerHTML=Object.entries(EMBEDDING_PRESETS).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('');
    $('nanoformEnabled')?.addEventListener('change',e=>{state.enabled=e.target.checked;renderAll();refresh();app?.validate?.();});
    mat?.addEventListener('change',e=>{state.material_preset=e.target.value;});
    emb?.addEventListener('change',e=>{state.embedding_preset=e.target.value;});
    $('applyNanoformPresetBtn')?.addEventListener('click',()=>{applyPreset(mat?.value,emb?.value);app?.validate?.();});
    $('resetNanoformBtn')?.addEventListener('click',()=>{state=defaultState();renderAll();refresh();app?.validate?.();});
    $('nanoformEvidenceClass')?.addEventListener('change',e=>{state.evidence_class=e.target.value;renderStatus();});
    $('nanoformSourceNote')?.addEventListener('change',e=>state.source_note=e.target.value);
    $('nanoformLimitations')?.addEventListener('change',e=>state.limitations=e.target.value);
    $('downloadNanoformCsvBtn')?.addEventListener('click',()=>{if(!lastOutput){alert('Run the model with nanoform state tracking enabled before exporting.');return;}app?.download?.('K-NanoMFA_nanoform_state_inventory_v20.csv',csvText(),'text/csv;charset=utf-8');});
    renderAll();refresh();
  }

  return {VERSION,STATE_KEYS,EDITABLE_STATE_KEYS,STATE_LABELS,MATERIAL_PRESETS,EMBEDDING_PRESETS,defaultState,normalize,applyPreset,releaseStateForMedium,terminalProfiles,environmentalStatesFromRow,stateSpecificPec,compute,validate,getState,loadState,getOutputs,clearResult,onModelResult,refresh,initUI,csvText};
});
