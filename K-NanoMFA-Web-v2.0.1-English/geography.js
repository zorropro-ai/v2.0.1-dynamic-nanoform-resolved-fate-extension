(function(root,factory){
  const api=factory();
  root.KNanoGeography=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const STORAGE_KEY='K-NanoMFA-v14-custom-geographies';
  const LEGACY_STORAGE_KEYS=['K-NanoMFA-v13-custom-geographies'];
  const SCHEMA='K-NanoMFA-custom-geography-v1';
  const WASTE_KEYS=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'];
  const SLUDGE_KEYS=['incineration','landfill','soil_compost','fuel_product_feedstock','other_unclassified'];
  let D=null;
  let builtInCodes=new Set();
  let definitions={};
  let callbacks={};

  const deepClone=value=>JSON.parse(JSON.stringify(value));
  const num=(value,label,{min=0,positive=false,nullable=false}={})=>{
    if(nullable&&(value===''||value===null||value===undefined))return null;
    const n=Number(value);
    if(!Number.isFinite(n)||(positive?n<=0:n<min))throw new Error(`${label} must be ${positive?'a finite positive':'a finite non-negative'} number.`);
    return n;
  };
  const codeOf=value=>String(value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const slug=value=>String(value||'domain').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'domain';
  const percentVector=(value,keys,label)=>{
    const out={};let total=0;
    keys.forEach(k=>{const n=Number(value?.[k]);if(!Number.isFinite(n)||n<0||n>100)throw new Error(`${label}: ${k} must be between 0 and 100%.`);out[k]=n;total+=n;});
    if(Math.abs(total-100)>0.05)throw new Error(`${label} totals ${total.toFixed(3)}%, not 100%.`);
    return out;
  };
  function normalizeDomain(raw,code,countryName){
    const region=String(raw?.region||'').trim();
    if(!region)throw new Error('Domain name is required.');
    const level=raw?.domain_level==='subnational'?'subnational':'national';
    const domainId=String(raw?.domain_id||`${code}-${slug(region)}`).trim();
    if(!/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(domainId))throw new Error('Domain ID must contain only letters, numbers, dots, underscores, or hyphens.');
    const population=num(raw.population,'Population',{positive:true});
    const sewerPopulation=num(raw.sewer_population,'Sewered population',{min:0});
    if(sewerPopulation>population)throw new Error('Sewered population cannot exceed total population.');
    return {
      domain_id:domainId,country_code:code,country:countryName,region,domain_level:level,
      population,area_km2:num(raw.area_km2,'Area',{positive:true}),sewer_population:sewerPopulation,
      wwtp_flow_m3_y:num(raw.wwtp_flow_m3_y,'Wastewater flow',{positive:true}),
      sludge_wet_t_y:num(raw.sludge_wet_t_y,'Wet sludge production',{nullable:true}),
      sludge_moisture_pct:num(raw.sludge_moisture_pct,'Sludge moisture',{nullable:true}),
      sludge_dry_t_y:num(raw.sludge_dry_t_y,'Dry sludge production',{positive:true}),
      river_flow_m3_s_default:num(raw.river_flow_m3_s_default,'Effective freshwater flow',{positive:true}),
      data_quality:String(raw.data_quality||'user_defined').trim()||'user_defined',
      source_note:String(raw.source_note||'User-defined geographic domain').trim()
    };
  }
  function normalizeDefinition(raw){
    if(!raw||typeof raw!=='object')throw new Error('The custom-geography definition is empty or invalid.');
    const code=codeOf(raw.code||raw.country_code);
    if(!/^[A-Z][A-Z0-9]{1,11}$/.test(code))throw new Error('Country code must contain 2–12 uppercase letters or numbers and begin with a letter.');
    const countryName=String(raw.country_name||raw.country?.country_name||'').trim();
    if(!countryName)throw new Error('Country name is required.');
    const shortName=String(raw.short_name||raw.country?.short_name||countryName).trim()||countryName;
    const referenceYear=Math.trunc(num(raw.reference_year??raw.country?.reference_year,'Reference year',{positive:true}));
    if(referenceYear<1900||referenceYear>2200)throw new Error('Reference year must be between 1900 and 2200.');
    const basis=String(raw.basis||raw.country?.basis||'User-defined geographic data').trim()||'User-defined geographic data';
    const sourceUrl=String(raw.source_url||'').trim();
    const domains=(Array.isArray(raw.domains)?raw.domains:[]).map(d=>normalizeDomain(d,code,countryName));
    if(!domains.length)throw new Error('At least one geographic domain is required.');
    const ids=domains.map(d=>d.domain_id);
    if(new Set(ids).size!==ids.length)throw new Error('Domain IDs must be unique within a country.');
    const national=domains.filter(d=>d.domain_level==='national');
    if(national.length!==1)throw new Error('A custom country must contain exactly one national domain.');
    const nationalId=String(raw.national_domain_id||raw.country?.national_domain_id||national[0].domain_id);
    if(nationalId!==national[0].domain_id)throw new Error('The national-domain ID must identify the national domain row.');
    return {
      schema:SCHEMA,code,country_name:countryName,short_name:shortName,reference_year:referenceYear,basis,source_url:sourceUrl,
      national_domain_id:nationalId,domains,
      waste_preset:percentVector(raw.waste_preset||{},WASTE_KEYS,'Country waste preset'),
      sludge_preset:percentVector(raw.sludge_preset||{},SLUDGE_KEYS,'Sewage-sludge preset')
    };
  }
  function removeRuntime(code){
    if(!D||builtInCodes.has(code))return;
    delete D.COUNTRY_DOMAINS[code];delete D.COUNTRY_WASTE_PRESETS[code];delete D.COUNTRY_SLUDGE_PRESETS[code];
    for(let i=D.REGION_DATA.length-1;i>=0;i--)if(D.REGION_DATA[i].country_code===code)D.REGION_DATA.splice(i,1);
  }
  function persist(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(definitions));}catch(e){console.warn('Custom geography storage is unavailable.',e);}
  }
  function registerDefinition(raw,{persistDefinition=true}={}){
    if(!D)throw new Error('The geography registry has not been initialized.');
    const def=normalizeDefinition(raw);
    if(builtInCodes.has(def.code)&&!definitions[def.code])throw new Error(`Country code ${def.code} is reserved by a bundled country.`);
    removeRuntime(def.code);
    definitions[def.code]=deepClone(def);
    D.COUNTRY_DOMAINS[def.code]={country_name:def.country_name,short_name:def.short_name,national_domain_id:def.national_domain_id,reference_year:def.reference_year,basis:def.basis,custom:true,source_url:def.source_url};
    D.COUNTRY_WASTE_PRESETS[def.code]=deepClone(def.waste_preset);
    D.COUNTRY_SLUDGE_PRESETS[def.code]=deepClone(def.sludge_preset);
    def.domains.forEach(row=>D.REGION_DATA.push(deepClone(row)));
    if(persistDefinition)persist();
    return deepClone(def);
  }
  function bootstrap(data){
    D=data||D;if(!D)return;
    if(!builtInCodes.size)builtInCodes=new Set(Object.keys(D.COUNTRY_DOMAINS));
    let saved={};try{const raw=localStorage.getItem(STORAGE_KEY)||LEGACY_STORAGE_KEYS.map(k=>localStorage.getItem(k)).find(Boolean)||'{}';saved=JSON.parse(raw)||{};}catch(e){console.warn('Stored custom geographies could not be read.',e);}
    Object.values(saved).forEach(raw=>{try{registerDefinition(raw,{persistDefinition:false});}catch(e){console.warn('A stored custom geography was skipped.',e);}});
  }
  function removeDefinition(code,{persistDefinition=true}={}){
    const c=codeOf(code);if(!definitions[c])return false;removeRuntime(c);delete definitions[c];if(persistDefinition)persist();return true;
  }
  function getDefinition(code){const d=definitions[codeOf(code)];return d?deepClone(d):null;}
  function listDefinitions(){return Object.values(definitions).map(deepClone);}
  function isCustomCode(code){return Boolean(definitions[codeOf(code)]);}

  function el(id){return typeof document!=='undefined'?document.getElementById(id):null;}
  function value(id){return el(id)?.value??'';}
  function setValue(id,v){if(el(id))el(id).value=v??'';}
  function setChecked(id,v){if(el(id))el(id).checked=Boolean(v);}
  function defaultDefinition(){return {schema:SCHEMA,code:'',country_name:'',short_name:'',reference_year:new Date().getFullYear(),basis:'User-defined national statistics and screening assumptions',source_url:'',national_domain_id:'',domains:[],waste_preset:{incineration_pct:20,landfill_pct:30,recycling_pct:35,reuse_pct:5,biological_treatment_pct:10},sludge_preset:{incineration:20,landfill:20,soil_compost:45,fuel_product_feedstock:10,other_unclassified:5}};}
  function defaultDomain(code='',level='national'){return {domain_id:code?`${code}-${level==='national'?'national':'region'}`:'',region:level==='national'?'National domain':'Subnational domain',domain_level:level,population:'',area_km2:'',sewer_population:'',wwtp_flow_m3_y:'',sludge_wet_t_y:'',sludge_moisture_pct:'',sludge_dry_t_y:'',river_flow_m3_s_default:'',data_quality:'user_defined',source_note:'User-defined geographic data'};}
  function renderDomainSelect(def,preferred){
    const select=el('customGeoDomainSelect');if(!select)return;select.innerHTML='';
    (def?.domains||[]).forEach(d=>select.add(new Option(`${d.region} · ${d.domain_level}`,d.domain_id)));
    select.add(new Option('＋ New subnational domain','__NEW__'));
    if(preferred&&[...select.options].some(o=>o.value===preferred))select.value=preferred;
    else if(def?.national_domain_id)select.value=def.national_domain_id;
  }
  function fillDomain(domain){
    const d=domain||defaultDomain(codeOf(value('customGeoCode')),domain?.domain_level||'national');
    setValue('customGeoDomainId',d.domain_id);setValue('customGeoDomainName',d.region);setValue('customGeoDomainLevel',d.domain_level);
    setValue('customGeoPopulation',d.population);setValue('customGeoArea',d.area_km2);setValue('customGeoSewerPopulation',d.sewer_population);
    setValue('customGeoWwtpFlow',d.wwtp_flow_m3_y);setValue('customGeoSludgeWet',d.sludge_wet_t_y);setValue('customGeoSludgeMoisture',d.sludge_moisture_pct);
    setValue('customGeoSludgeDry',d.sludge_dry_t_y);setValue('customGeoRiverFlow',d.river_flow_m3_s_default);setValue('customGeoDataQuality',d.data_quality);setValue('customGeoDomainSource',d.source_note);
  }
  function fillDefinition(definition,preferredDomain){
    const def=definition||defaultDefinition();
    setValue('customGeoCode',def.code);setValue('customGeoCountryName',def.country_name);setValue('customGeoShortName',def.short_name);setValue('customGeoReferenceYear',def.reference_year);setValue('customGeoBasis',def.basis);setValue('customGeoSourceUrl',def.source_url);
    WASTE_KEYS.forEach(k=>setValue(`customGeoWaste_${k}`,def.waste_preset[k]));SLUDGE_KEYS.forEach(k=>setValue(`customGeoSludge_${k}`,def.sludge_preset[k]));
    renderDomainSelect(def,preferredDomain);
    const domain=(def.domains||[]).find(d=>d.domain_id===preferredDomain)||(def.domains||[]).find(d=>d.domain_id===def.national_domain_id)||(def.domains||[])[0]||defaultDomain(def.code,'national');
    fillDomain(domain);updateStatus(def);
  }
  function updateStatus(def=null){
    const box=el('customGeoStatus');if(!box)return;const active=def||getDefinition(value('customGeoCode'));
    box.innerHTML=active?`<b>${active.country_name}</b> · ${active.domains.length} domain(s) · reference year ${active.reference_year}. Custom values are stored locally and embedded in exported scenario JSON.`:'Enter a new country and its national-domain statistics. Percentage vectors must total 100%.';
  }
  function readVector(prefix,keys){return Object.fromEntries(keys.map(k=>[k,Number(value(`${prefix}_${k}`))]));}
  function readDomain(){
    const code=codeOf(value('customGeoCode'));let domainId=String(value('customGeoDomainId')).trim();const level=value('customGeoDomainLevel')==='subnational'?'subnational':'national';
    if(!domainId)domainId=`${code}-${level==='national'?'national':slug(value('customGeoDomainName'))}`;
    return {domain_id:domainId,region:value('customGeoDomainName'),domain_level:level,population:value('customGeoPopulation'),area_km2:value('customGeoArea'),sewer_population:value('customGeoSewerPopulation'),wwtp_flow_m3_y:value('customGeoWwtpFlow'),sludge_wet_t_y:value('customGeoSludgeWet'),sludge_moisture_pct:value('customGeoSludgeMoisture'),sludge_dry_t_y:value('customGeoSludgeDry'),river_flow_m3_s_default:value('customGeoRiverFlow'),data_quality:value('customGeoDataQuality'),source_note:value('customGeoDomainSource')};
  }
  function readDefinition(){
    const code=codeOf(value('customGeoCode'));const existing=getDefinition(code)||defaultDefinition();
    let domains=deepClone(existing.domains||[]);const domain=readDomain();const selected=value('customGeoDomainSelect');
    const replaceId=selected&&selected!=='__NEW__'?selected:domain.domain_id;const idx=domains.findIndex(d=>d.domain_id===replaceId);
    if(idx>=0)domains[idx]=domain;else domains.push(domain);
    const national=domains.find(d=>d.domain_level==='national');
    return {schema:SCHEMA,code,country_name:value('customGeoCountryName'),short_name:value('customGeoShortName'),reference_year:value('customGeoReferenceYear'),basis:value('customGeoBasis'),source_url:value('customGeoSourceUrl'),national_domain_id:domain.domain_level==='national'?domain.domain_id:(national?.domain_id||''),domains,waste_preset:readVector('customGeoWaste',WASTE_KEYS),sludge_preset:readVector('customGeoSludge',SLUDGE_KEYS)};
  }
  function notifyChange(code,domainId){callbacks.onChange?.(code,domainId);syncSelection(code);}
  function saveFromUI(){
    try{const def=registerDefinition(readDefinition());fillDefinition(def,value('customGeoDomainId'));notifyChange(def.code,value('customGeoDomainId')||def.national_domain_id);alert('Custom geography saved. It is now available in the country selector.');}catch(e){alert(e.message);}
  }
  function newCountry(){fillDefinition(defaultDefinition());fillDomain(defaultDomain('','national'));el('customGeoPanel').hidden=false;el('customGeoCode')?.focus();}
  function addDomain(){
    const code=codeOf(value('customGeoCode'));if(!getDefinition(code)){alert('Save the national country definition before adding a subnational domain.');return;}
    if(el('customGeoDomainSelect'))el('customGeoDomainSelect').value='__NEW__';fillDomain(defaultDomain(code,'subnational'));updateStatus(getDefinition(code));
  }
  function deleteDomain(){
    const code=codeOf(value('customGeoCode')),def=getDefinition(code),id=value('customGeoDomainSelect');if(!def||id==='__NEW__')return;
    const target=def.domains.find(d=>d.domain_id===id);if(target?.domain_level==='national'){alert('The national domain cannot be deleted. Delete the entire custom country instead.');return;}
    if(!confirm(`Delete domain “${target?.region||id}”?`))return;def.domains=def.domains.filter(d=>d.domain_id!==id);const saved=registerDefinition(def);fillDefinition(saved,saved.national_domain_id);notifyChange(saved.code,saved.national_domain_id);
  }
  function deleteCountry(){
    const code=codeOf(value('customGeoCode'));const def=getDefinition(code);if(!def){alert('The current entry is not a saved custom country.');return;}
    if(!confirm(`Delete custom country “${def.country_name}” and all of its domains?`))return;removeDefinition(code);fillDefinition(defaultDefinition());callbacks.onDelete?.(code);alert('Custom country deleted.');
  }
  function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function exportCurrent(){const def=getDefinition(value('customGeoCode'));if(!def){alert('Save the custom geography before exporting it.');return;}download(`K-NanoMFA_${def.code}_custom_geography_v20.json`,JSON.stringify(def,null,2));}
  function importFile(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const def=registerDefinition(JSON.parse(r.result));fillDefinition(def,def.national_domain_id);notifyChange(def.code,def.national_domain_id);alert('Custom geography imported successfully.');}catch(e){alert(e.message);}};r.readAsText(file);}
  function syncSelection(code){
    const c=codeOf(code);const def=getDefinition(c);const btn=el('manageCustomCountryBtn');if(btn)btn.textContent=def?'Edit custom geography':'Create custom country';
    if(def&&!el('customGeoPanel')?.hidden)fillDefinition(def,callbacks.getCurrentDomain?.());
  }
  function initUI(opts={}){
    callbacks=opts;
    const panel=el('customGeoPanel');if(!panel)return;
    el('manageCustomCountryBtn').onclick=()=>{const def=getDefinition(callbacks.getCurrentCode?.());panel.hidden=false;callbacks.switchTab?.('model');fillDefinition(def||defaultDefinition(),callbacks.getCurrentDomain?.());if(!def)fillDomain(defaultDomain('','national'));};
    el('closeCustomGeoBtn').onclick=()=>{panel.hidden=true;};el('newCustomGeoBtn').onclick=newCountry;el('saveCustomGeoBtn').onclick=saveFromUI;el('addCustomDomainBtn').onclick=addDomain;el('deleteCustomDomainBtn').onclick=deleteDomain;el('deleteCustomGeoBtn').onclick=deleteCountry;el('exportCustomGeoBtn').onclick=exportCurrent;
    el('importCustomGeo').onchange=e=>{importFile(e.target.files?.[0]);e.target.value='';};
    el('customGeoDomainSelect').onchange=e=>{const def=getDefinition(value('customGeoCode'));if(e.target.value==='__NEW__')fillDomain(defaultDomain(codeOf(value('customGeoCode')),'subnational'));else fillDomain(def?.domains.find(d=>d.domain_id===e.target.value));};
    el('customGeoCode').addEventListener('input',e=>{e.target.value=codeOf(e.target.value);if(value('customGeoDomainLevel')==='national'&&!value('customGeoDomainId'))setValue('customGeoDomainId',`${e.target.value}-national`);});
    el('customGeoDomainName').addEventListener('change',()=>{if(value('customGeoDomainSelect')==='__NEW__'&&!value('customGeoDomainId'))setValue('customGeoDomainId',`${codeOf(value('customGeoCode'))}-${slug(value('customGeoDomainName'))}`);});
    syncSelection(callbacks.getCurrentCode?.());
  }
  return {SCHEMA,STORAGE_KEY,WASTE_KEYS,SLUDGE_KEYS,normalizeDefinition,registerDefinition,removeDefinition,getDefinition,listDefinitions,isCustomCode,bootstrap,initUI,syncSelection};
});
