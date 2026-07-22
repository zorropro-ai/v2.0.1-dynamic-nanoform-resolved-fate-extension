(function(root, factory){
  const api = factory();
  root.KNanoEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const pct = value => Math.max(Number(value) || 0, 0) / 100;
  const finiteNumber = value => Number.isFinite(Number(value));
  const validPercent = value => finiteNumber(value) && Number(value)>=0 && Number(value)<=100;
  const sumValues = object => Object.values(object).reduce((s,v)=>s+(Number(v)||0),0);
  const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
  function normalizeObject(object){
    const total=sumValues(object);
    if(total<=0) throw new Error('A percentage vector has a zero total.');
    return Object.fromEntries(Object.entries(object).map(([k,v])=>[k,(Number(v)||0)/total]));
  }
  function addEdge(map, source, target, value){
    const v=Number(value)||0;
    if(v<=1e-15 || source===target) return;
    const key=`${source}|||${target}`;
    map[key]=(map[key]||0)+v;
  }
  function edgesToFlows(edges){
    return Object.entries(edges).map(([key,kg_y])=>{const [source,target]=key.split('|||');return {source,target,kg_y};});
  }
  function applyProcessOutputs(inputMass, coefficients){
    return Object.fromEntries(Object.entries(coefficients).map(([k,v])=>[k,inputMass*pct(v)]));
  }
  function validateInputs(products,eol,factors,sludge,lifetimes=null,dynamicSettings=null){
    const errors=[];
    const percentFields=(row,keys,label)=>{
      keys.forEach(k=>{if(!validPercent(row?.[k]))errors.push(`${label}: ${k} must be a finite percentage from 0 to 100.`);});
    };
    if(!Array.isArray(products)||!products.length) errors.push('At least one product category is required.');
    const safeProducts=Array.isArray(products)?products:[];
    const safeEol=Array.isArray(eol)?eol:[];
    const safeFactors=factors&&typeof factors==='object'?factors:{};
    const safeSludge=sludge&&typeof sludge==='object'?sludge:{};
    const productNames=safeProducts.map(r=>String(r.product_category||'').trim());
    if(productNames.some(n=>!n)) errors.push('Every product category requires a name.');
    if(new Set(productNames).size!==productNames.length) errors.push('Product-category names must be unique.');
    const eolNames=safeEol.map(r=>String(r.product_category||'').trim());
    if(productNames.length!==eolNames.length||productNames.some((n,i)=>n!==eolNames[i])) errors.push('Product and end-of-life category rows are not aligned.');
    if(lifetimes){const lifeNames=(Array.isArray(lifetimes)?lifetimes:[]).map(r=>String(r.product_category||'').trim());if(productNames.length!==lifeNames.length||productNames.some((n,i)=>n!==lifeNames[i])) errors.push('Product and lifetime category rows are not aligned.');}
    safeProducts.forEach(r=>percentFields(r,['allocation_pct','use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'],r.product_category||'Product row'));
    safeEol.forEach(r=>percentFields(r,['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'],r.product_category||'End-of-life row'));
    const allocationTotal=safeProducts.reduce((sum,r)=>sum+(finiteNumber(r.allocation_pct)?Number(r.allocation_pct):0),0);
    if(Math.abs(allocationTotal-100)>0.05) errors.push(`Product allocation totals ${allocationTotal.toFixed(3)}%, not 100%.`);
    safeProducts.forEach(r=>{
      const t=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'].reduce((sum,k)=>sum+(finiteNumber(r[k])?Number(r[k]):0),0);
      if(t>100+1e-9) errors.push(`${r.product_category}: use-stage release totals ${t.toFixed(3)}%.`);
    });
    safeEol.forEach(r=>{
      const t=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'].reduce((sum,k)=>sum+(finiteNumber(r[k])?Number(r[k]):0),0);
      if(Math.abs(t-100)>0.05) errors.push(`${r.product_category}: end-of-life routes total ${t.toFixed(3)}%.`);
    });
    Object.entries(safeFactors).forEach(([process,values])=>{
      Object.keys(values||{}).forEach(k=>{if(!validPercent(values[k]))errors.push(`${process}: ${k} must be a finite percentage from 0 to 100.`);});
      if(process==='landfill' && dynamicSettings){
        const loss=(Number(values.leachate_to_surface_water)||0)+(Number(values.runoff_to_surface_water)||0)+(Number(values.fugitive_dust_to_air)||0)+(Number(values.transformation)||0);
        if(loss>=100) errors.push('Dynamic landfill annual loss rates must sum to less than 100%.');
      } else if(Math.abs(sumValues(values)-100)>0.05) errors.push(`${process}: transfer coefficients total ${sumValues(values).toFixed(3)}%.`);
    });
    Object.keys(safeSludge).forEach(k=>{if(!validPercent(safeSludge[k]))errors.push(`Sewage sludge: ${k} must be a finite percentage from 0 to 100.`);});
    if(Math.abs(sumValues(safeSludge)-100)>0.05) errors.push(`Sewage-sludge routes total ${sumValues(safeSludge).toFixed(3)}%.`);
    if(lifetimes){
      (Array.isArray(lifetimes)?lifetimes:[]).forEach(r=>{
        if(!(finiteNumber(r.mean_lifetime_y)&&Number(r.mean_lifetime_y)>0)) errors.push(`${r.product_category}: mean lifetime must be positive.`);
        if(!(finiteNumber(r.weibull_shape)&&Number(r.weibull_shape)>0)) errors.push(`${r.product_category}: Weibull shape must be positive.`);
        if(!(finiteNumber(r.use_release_duration_y)&&Number(r.use_release_duration_y)>=1)) errors.push(`${r.product_category}: use-release duration must be at least one year.`);
      });
    }
    if(dynamicSettings){
      const start=Number(dynamicSettings.start_year),end=Number(dynamicSettings.end_year),growth=Number(dynamicSettings.annual_growth_pct);
      if(dynamicSettings.start_year!==undefined&&!Number.isInteger(start))errors.push('Dynamic start year must be a finite integer.');
      if(dynamicSettings.end_year!==undefined&&!Number.isInteger(end))errors.push('Dynamic end year must be a finite integer.');
      if(Number.isFinite(start)&&Number.isFinite(end)&&end<start) errors.push('End year precedes start year.');
      if(Number.isFinite(start)&&Number.isFinite(end)&&end-start>80) errors.push('Dynamic horizon is limited to 81 years in the browser edition.');
      if(dynamicSettings.initial_input_kg_y!==undefined&&!(finiteNumber(dynamicSettings.initial_input_kg_y)&&Number(dynamicSettings.initial_input_kg_y)>=0))errors.push('Initial dynamic input must be a finite non-negative value.');
      if(dynamicSettings.annual_growth_pct!==undefined&&!(Number.isFinite(growth)&&growth>=-100))errors.push('Annual growth must be finite and cannot be below −100%.');
      if(!(finiteNumber(dynamicSettings.closed_loop_recycling_pct)&&validPercent(dynamicSettings.closed_loop_recycling_pct)))errors.push('Closed-loop recycling must be from 0 to 100%.');
      if(!(finiteNumber(dynamicSettings.initial_landfill_stock_kg)&&Number(dynamicSettings.initial_landfill_stock_kg)>=0))errors.push('Initial landfill stock must be a finite non-negative value.');
      if(Number(dynamicSettings.recycling_delay_y)<1||!finiteNumber(dynamicSettings.recycling_delay_y)) errors.push('Recycling delay must be at least one year.');
      if(Number(dynamicSettings.reuse_delay_y)<1||!finiteNumber(dynamicSettings.reuse_delay_y)) errors.push('Reuse delay must be at least one year.');
    }
    return errors;
  }
  function environmentalMetrics({terminal,wwtpEffluent,wwtpSludge,region,env,mediaStocks=null}){
    const soilMass=Math.max(env.soil_area_ha*10000*env.soil_depth_m*env.soil_bulk_density_kg_m3,1e-30);
    const sedimentMass=Math.max(env.sediment_area_km2*1e6*env.sediment_depth_m*env.sediment_bulk_density_kg_m3,1e-30);
    const airThroughput=Math.max(region.area_km2*1e6*env.air_mixing_height_m*env.air_turnovers_y,1e-30);
    const soilInput=Number(terminal.soil)||0;
    const sedimentInput=(Number(terminal.surface_water)||0)*pct(env.water_to_sediment_pct);
    const soilStock=mediaStocks?Math.max(Number(mediaStocks.soil_kg)||0,0):soilInput*Math.max(Number(env.soil_residence_time_y)||1,0);
    const sedimentStock=mediaStocks?Math.max(Number(mediaStocks.sediment_kg)||0,0):sedimentInput*Math.max(Number(env.sediment_residence_time_y)||1,0);
    return {
      wwtp_effluent_concentration_ug_L:(wwtpEffluent/Math.max(region.wwtp_flow_m3_y,1e-30))*1e6,
      sewage_sludge_concentration_ug_kg_dry:(wwtpSludge/Math.max(region.sludge_dry_t_y*1000,1e-30))*1e9,
      air_pec_ng_m3:((Number(terminal.air)||0)/airThroughput)*1e12,
      surface_water_pec_ug_L:((Number(terminal.surface_water)||0)/Math.max(env.river_flow_m3_s*SECONDS_PER_YEAR,1e-30))*1e6,
      soil_pec_ug_kg:(soilStock/soilMass)*1e9,
      active_sediment_pec_ug_kg:(sedimentStock/sedimentMass)*1e9,
      annual_soil_increment_ug_kg:(soilInput/soilMass)*1e9,
      annual_active_sediment_increment_ug_kg:(sedimentInput/sedimentMass)*1e9,
    };
  }
  function emptyTerminal(){return {air:0,surface_water:0,soil:0,recovery_resource:0,reuse_product_stock:0,landfill_stock:0,transformation_loss:0,other_unclassified:0};}

  function runStaticMFA({total,products,eol,factors,sludge,region,env}){
    const errors=validateInputs(products,eol,factors,sludge);
    if(!Number.isFinite(Number(total))||Number(total)<0)errors.push('Total input must be a finite non-negative value.');
    if(errors.length) throw new Error(errors.join('\n'));
    const edges={};
    const terminal=emptyTerminal();
    const processInput={WWTP:0,incineration:0,landfill:0,recycling:0,reuse:0,biological_treatment:0};
    const eolMap=Object.fromEntries(eol.map(r=>[r.product_category,r]));
    products.forEach(row=>{
      const productMass=total*pct(row.allocation_pct);
      addEdge(edges,'Total nanomaterial input',row.product_category,productMass);
      const rel={
        'Use-stage air release':productMass*pct(row.use_air_pct),
        'Use-stage direct surface-water release':productMass*pct(row.use_direct_water_pct),
        'Use-stage wastewater':productMass*pct(row.use_wwtp_pct),
        'Use-stage soil release':productMass*pct(row.use_soil_pct),
      };
      Object.entries(rel).forEach(([n,m])=>addEdge(edges,row.product_category,n,m));
      terminal.air+=rel['Use-stage air release'];
      terminal.surface_water+=rel['Use-stage direct surface-water release'];
      terminal.soil+=rel['Use-stage soil release'];
      processInput.WWTP+=rel['Use-stage wastewater'];
      const eolMass=Math.max(productMass-sumValues(rel),0);
      addEdge(edges,row.product_category,'End-of-life products',eolMass);
      const routes=eolMap[row.product_category];
      [['incineration_pct','incineration','Incineration'],['landfill_pct','landfill','Landfill'],['recycling_pct','recycling','Recycling'],['reuse_pct','reuse','Reuse'],['biological_treatment_pct','biological_treatment','Biological treatment']].forEach(([pk,k,label])=>{
        const m=eolMass*pct(routes[pk]);processInput[k]+=m;addEdge(edges,'End-of-life products',label,m);
      });
    });
    const useWastewater=processInput.WWTP;
    addEdge(edges,'Use-stage wastewater','WWTP',useWastewater);
    addEdge(edges,'Use-stage air release','Air',terminal.air);
    addEdge(edges,'Use-stage direct surface-water release','Surface water',terminal.surface_water);
    addEdge(edges,'Use-stage soil release','Soil',terminal.soil);

    const recyclingInput=processInput.recycling;
    if(recyclingInput>0){
      const o=applyProcessOutputs(recyclingInput,factors.recycling);
      Object.entries(o).forEach(([k,v])=>addEdge(edges,'Recycling',staticOutputLabel(k),v));
      terminal.recovery_resource+=o.recovered_product||0;terminal.air+=o.air||0;terminal.transformation_loss+=o.transformation||0;
      processInput.WWTP+=o.wastewater_to_wwtp||0;processInput.incineration+=o.residue_to_incineration||0;processInput.landfill+=o.residue_to_landfill||0;
      addEdge(edges,'Wastewater to WWTP','WWTP',o.wastewater_to_wwtp);addEdge(edges,'Residue to incineration','Incineration',o.residue_to_incineration);addEdge(edges,'Residue to landfill','Landfill',o.residue_to_landfill);
      addEdge(edges,'Recovered product','Recovery and resource utilization',o.recovered_product);addEdge(edges,'Transformation','Transformation / loss',o.transformation);
    }
    const reuseInput=processInput.reuse;
    if(reuseInput>0){
      const o=applyProcessOutputs(reuseInput,factors.reuse);
      Object.entries(o).forEach(([k,v])=>addEdge(edges,'Reuse',staticOutputLabel(k),v));
      terminal.reuse_product_stock+=o.extended_use_stock||0;terminal.air+=o.air||0;terminal.surface_water+=o.surface_water||0;terminal.soil+=o.soil||0;processInput.WWTP+=o.WWTP||0;
      addEdge(edges,'Extended-use stock','Reuse and product stock',o.extended_use_stock);addEdge(edges,'Surface water','Surface-water sink',o.surface_water);
    }
    const biologicalInput=processInput.biological_treatment;
    if(biologicalInput>0){
      const o=applyProcessOutputs(biologicalInput,factors.biological_treatment);
      Object.entries(o).forEach(([k,v])=>addEdge(edges,'Biological treatment',staticOutputLabel(k),v));
      terminal.soil+=o.soil_compost||0;terminal.surface_water+=o.surface_water||0;terminal.air+=o.air||0;terminal.transformation_loss+=o.biodegradation_transformation||0;
      addEdge(edges,'Soil / compost','Soil',o.soil_compost);addEdge(edges,'Surface water','Surface-water sink',o.surface_water);addEdge(edges,'Biodegradation / transformation','Transformation / loss',o.biodegradation_transformation);
    }
    const wwtpInput=processInput.WWTP;
    let wwtpEffluent=0,wwtpSludge=0,wwtpTransformed=0;
    if(wwtpInput>0){
      wwtpEffluent=wwtpInput*pct(factors.WWTP.effluent);wwtpSludge=wwtpInput*pct(factors.WWTP.sludge);wwtpTransformed=wwtpInput*pct(factors.WWTP.transformation_non_nano);
      addEdge(edges,'WWTP','Effluent',wwtpEffluent);addEdge(edges,'WWTP','Sewage sludge',wwtpSludge);addEdge(edges,'WWTP','Transformation / non-nano form',wwtpTransformed);
      addEdge(edges,'Effluent','Surface-water sink',wwtpEffluent);addEdge(edges,'Transformation / non-nano form','Transformation / loss',wwtpTransformed);
      terminal.surface_water+=wwtpEffluent;terminal.transformation_loss+=wwtpTransformed;
      const sr=normalizeObject(sludge);
      const si=wwtpSludge*(sr.incineration||0),sl=wwtpSludge*(sr.landfill||0),ss=wwtpSludge*(sr.soil_compost||0),srec=wwtpSludge*(sr.fuel_product_feedstock||0),so=wwtpSludge*(sr.other_unclassified||0);
      processInput.incineration+=si;processInput.landfill+=sl;terminal.soil+=ss;terminal.recovery_resource+=srec;terminal.other_unclassified+=so;
      [['Sludge → incineration',si],['Sludge → landfill',sl],['Sludge → soil / compost',ss],['Sludge → fuel / product feedstock',srec],['Sludge → other',so]].forEach(([n,m])=>addEdge(edges,'Sewage sludge',n,m));
      addEdge(edges,'Sludge → incineration','Incineration',si);addEdge(edges,'Sludge → landfill','Landfill',sl);addEdge(edges,'Sludge → soil / compost','Soil',ss);addEdge(edges,'Sludge → fuel / product feedstock','Recovery and resource utilization',srec);addEdge(edges,'Sludge → other','Other / unclassified',so);
    }
    const incInput=processInput.incineration;
    if(incInput>0){
      const o=applyProcessOutputs(incInput,factors.incineration);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Incineration',staticOutputLabel(k),v));
      terminal.air+=o.air||0;terminal.landfill_stock+=o.fly_ash_to_landfill||0;terminal.recovery_resource+=o.bottom_ash_recovery||0;terminal.transformation_loss+=o.thermal_transformation_loss||0;
      addEdge(edges,'Fly ash to landfill','Landfill stock',o.fly_ash_to_landfill);addEdge(edges,'Bottom ash recovery','Recovery and resource utilization',o.bottom_ash_recovery);addEdge(edges,'Thermal transformation / loss','Transformation / loss',o.thermal_transformation_loss);
    }
    const lfInput=processInput.landfill;
    if(lfInput>0){
      const o=applyProcessOutputs(lfInput,factors.landfill);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Landfill',k==='transformation'?'Landfill transformation':staticOutputLabel(k),v));
      terminal.landfill_stock+=o.landfill_stock||0;terminal.surface_water+=(o.leachate_to_surface_water||0)+(o.runoff_to_surface_water||0);terminal.air+=o.fugitive_dust_to_air||0;terminal.transformation_loss+=o.transformation||0;
      addEdge(edges,'Leachate to surface water','Surface-water sink',o.leachate_to_surface_water);addEdge(edges,'Runoff to surface water','Surface-water sink',o.runoff_to_surface_water);addEdge(edges,'Fugitive dust to air','Air',o.fugitive_dust_to_air);addEdge(edges,'Landfill transformation','Transformation / loss',o.transformation);
    }
    const terminalTotal=sumValues(terminal),residual=total-terminalTotal;
    return {model:'static',flows:edgesToFlows(edges),terminal,terminal_total:terminalTotal,mass_balance_residual:residual,mass_balance_closure_pct:total>0?(terminalTotal/total)*100:100,process_input:processInput,wwtp:{input:wwtpInput,effluent:wwtpEffluent,sludge:wwtpSludge,transformed:wwtpTransformed},pec:environmentalMetrics({terminal,wwtpEffluent,wwtpSludge,region,env})};
  }
  function staticOutputLabel(k){return ({effluent:'Effluent',sludge:'Sludge',transformation_non_nano:'Transformation / non-nano form',air:'Air',fly_ash_to_landfill:'Fly ash to landfill',bottom_ash_recovery:'Bottom ash recovery',thermal_transformation_loss:'Thermal transformation / loss',landfill_stock:'Landfill stock',leachate_to_surface_water:'Leachate to surface water',runoff_to_surface_water:'Runoff to surface water',fugitive_dust_to_air:'Fugitive dust to air',transformation:'Transformation',recovered_product:'Recovered product',wastewater_to_wwtp:'Wastewater to WWTP',residue_to_incineration:'Residue to incineration',residue_to_landfill:'Residue to landfill',extended_use_stock:'Extended-use stock',surface_water:'Surface water',soil:'Soil',soil_compost:'Soil / compost',biodegradation_transformation:'Biodegradation / transformation',fuel_product_feedstock:'Fuel / product feedstock',other_unclassified:'Other / unclassified'})[k]||k;}

  // Lanczos approximation for the gamma function.
  function gamma(z){
    const p=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
    if(z<0.5) return Math.PI/(Math.sin(Math.PI*z)*gamma(1-z));
    z-=1;let x=p[0];for(let i=1;i<p.length;i++)x+=p[i]/(z+i);const t=z+p.length-1.5;return Math.sqrt(2*Math.PI)*Math.pow(t,z+0.5)*Math.exp(-t)*x;
  }
  function weibullScaleFromMean(mean,shape){return mean/gamma(1+1/shape);}
  function weibullCdf(age,mean,shape){if(age<=0)return 0;const scale=weibullScaleFromMean(mean,shape);return 1-Math.exp(-Math.pow(age/scale,shape));}
  function buildTrajectory(settings,customTrajectory=null){
    const start=Number(settings.start_year),end=Number(settings.end_year),initial=Number(settings.initial_input_kg_y),growth=Number(settings.annual_growth_pct);
    if(!Number.isInteger(start)||!Number.isInteger(end)||end<start)throw new Error('Trajectory years must be finite integers with end year not earlier than start year.');
    if(!Number.isFinite(initial)||initial<0)throw new Error('Initial trajectory input must be a finite non-negative value.');
    if(!Number.isFinite(growth)||growth<-100)throw new Error('Annual growth must be finite and cannot be below −100%.');
    const factor=1+growth/100;
    const years=[];for(let y=start;y<=end;y++)years.push(y);
    let map={};
    if(customTrajectory&&customTrajectory.length){
      customTrajectory.forEach(r=>{
        const year=Number(r.year),value=Number(r.primary_input_kg_y);
        if(!Number.isInteger(year)||!Number.isFinite(value)||value<0)throw new Error('Custom trajectory rows require an integer year and a finite non-negative input.');
        map[year]=value;
      });
    }
    return years.map((year,i)=>({year,primary_input_kg_y:Object.prototype.hasOwnProperty.call(map,year)?map[year]:initial*Math.pow(factor,i)}));
  }
  function routeEolMass(productCategory,mass,eolMap,processByProduct,edges,sourceLabel='End-of-life products'){
    if(mass<=0)return;
    const r=eolMap[productCategory];
    const map=[['incineration_pct','incineration','Incineration'],['landfill_pct','landfill','Landfill'],['recycling_pct','recycling','Recycling'],['reuse_pct','reuse','Reuse'],['biological_treatment_pct','biological_treatment','Biological treatment']];
    map.forEach(([pk,k,label])=>{const m=mass*pct(r[pk]);processByProduct[k][productCategory]=(processByProduct[k][productCategory]||0)+m;addEdge(edges,sourceLabel,label,m);});
  }
  function sumObject(o){return Object.values(o).reduce((a,b)=>a+(Number(b)||0),0);}
  function runDynamicMFA({trajectory,products,eol,factors,sludge,lifetimes,region,env,dynamicSettings}){
    const errors=validateInputs(products,eol,factors,sludge,lifetimes,dynamicSettings);
    const expectedStart=dynamicSettings.start_year===undefined?Number(trajectory?.[0]?.year):Number(dynamicSettings.start_year),expectedEnd=dynamicSettings.end_year===undefined?Number(trajectory?.at(-1)?.year):Number(dynamicSettings.end_year);
    if(!Array.isArray(trajectory)||!trajectory.length)errors.push('A non-empty dynamic trajectory is required.');
    else{
      const names=new Set((products||[]).map(p=>String(p.product_category||'')));
      trajectory.forEach((r,i)=>{
        if(!Number.isInteger(Number(r.year))||!Number.isFinite(Number(r.primary_input_kg_y))||Number(r.primary_input_kg_y)<0)errors.push(`Trajectory row ${i+1} requires an integer year and a finite non-negative input.`);
        if(r.product_inputs_kg_y!==undefined){
          if(!r.product_inputs_kg_y||typeof r.product_inputs_kg_y!=='object'||Array.isArray(r.product_inputs_kg_y))errors.push(`Trajectory row ${i+1}: product_inputs_kg_y must be an object.`);
          else{
            let sum=0;Object.entries(r.product_inputs_kg_y).forEach(([name,value])=>{if(!names.has(name))errors.push(`Trajectory row ${i+1}: unknown product category “${name}”.`);if(!Number.isFinite(Number(value))||Number(value)<0)errors.push(`Trajectory row ${i+1}: product input for ${name} must be finite and non-negative.`);else sum+=Number(value);});
            names.forEach(name=>{if(!Object.prototype.hasOwnProperty.call(r.product_inputs_kg_y,name))errors.push(`Trajectory row ${i+1}: product input is missing for ${name}.`);});
            if(Math.abs(sum-Number(r.primary_input_kg_y))>Math.max(1e-8,Math.abs(Number(r.primary_input_kg_y))*1e-8))errors.push(`Trajectory row ${i+1}: product-specific inputs sum to ${sum}, not ${r.primary_input_kg_y}.`);
          }
        }
      });
      if(Number(trajectory[0]?.year)!==expectedStart||Number(trajectory.at(-1)?.year)!==expectedEnd)errors.push('Trajectory years must match the dynamic start and end years.');
      for(let i=1;i<trajectory.length;i++)if(Number(trajectory[i].year)!==Number(trajectory[i-1].year)+1)errors.push('Trajectory years must be consecutive and unique.');
    }
    if(errors.length) throw new Error(errors.join('\n'));
    const eolMap=Object.fromEntries(eol.map(r=>[r.product_category,r]));
    const lifeMap=Object.fromEntries(lifetimes.map(r=>[r.product_category,r]));
    const cohorts=[];
    const reuseQueue={};
    const secondaryQueue={};
    const openingLandfillStock=Math.max(Number(dynamicSettings.initial_landfill_stock_kg)||0,0);
    let landfillStock=openingLandfillStock;
    let soilMediaStock=Math.max(Number(dynamicSettings.initial_soil_media_stock_kg)||0,0);
    let sedimentMediaStock=Math.max(Number(dynamicSettings.initial_sediment_media_stock_kg)||0,0);
    const cumulative={air:0,surface_water:0,soil:0,recovery_resource:0,transformation_loss:0,other_unclassified:0};
    let cumulativePrimary=0;
    const annual=[];
    const allFlows={};
    const totalByProduct={};
    trajectory.forEach((tr,index)=>{
      const year=Number(tr.year),edges={};
      const primary=Math.max(0,Number(tr.primary_input_kg_y)||0);
      const secondary=Math.max(0,Number(secondaryQueue[year])||0);
      delete secondaryQueue[year];
      const totalInput=primary+secondary;
      const supplied=tr.product_inputs_kg_y&&typeof tr.product_inputs_kg_y==='object'?tr.product_inputs_kg_y:null;
      const primaryByProduct=Object.fromEntries(products.map(p=>[p.product_category,supplied?Math.max(0,Number(supplied[p.product_category])||0):primary*pct(p.allocation_pct)]));
      const primaryByProductTotal=sumObject(primaryByProduct);
      const secondaryShares=Object.fromEntries(products.map(p=>[p.product_category,primaryByProductTotal>0?primaryByProduct[p.product_category]/primaryByProductTotal:pct(p.allocation_pct)]));
      const totalInputByProduct={};
      cumulativePrimary+=primary;
      addEdge(edges,'Primary market input','Total product input',primary);
      addEdge(edges,'Recycled secondary input','Total product input',secondary);
      products.forEach(p=>{
        const m=primaryByProduct[p.product_category]+secondary*secondaryShares[p.product_category];
        totalInputByProduct[p.product_category]=m;
        addEdge(edges,'Total product input',p.product_category,m);
        totalByProduct[p.product_category]=(totalByProduct[p.product_category]||0)+m;
        const useTotal=pct(p.use_air_pct+p.use_direct_water_pct+p.use_wwtp_pct+p.use_soil_pct);
        const residual=Math.max(0,m*(1-useTotal));
        cohorts.push({entryYear:year,product_category:p.product_category,total:m,residualEol:residual,usePools:{air:m*pct(p.use_air_pct),surface_water:m*pct(p.use_direct_water_pct),WWTP:m*pct(p.use_wwtp_pct),soil:m*pct(p.use_soil_pct)}});
      });
      const annualUse={air:0,surface_water:0,WWTP:0,soil:0};
      const eolByProduct={};
      let inUseStock=0;
      cohorts.forEach(c=>{
        const age=year-c.entryYear;if(age<0)return;
        const life=lifeMap[c.product_category];
        const duration=Math.max(1,Math.round(Number(life.use_release_duration_y)||1));
        if(age<duration){Object.entries(c.usePools).forEach(([k,pool])=>{const m=pool/duration;annualUse[k]+=m;addEdge(edges,c.product_category,`Use-stage ${k==='WWTP'?'wastewater':k+' release'}`,m);});}
        const f0=weibullCdf(age,Number(life.mean_lifetime_y),Number(life.weibull_shape));
        const f1=weibullCdf(age+1,Number(life.mean_lifetime_y),Number(life.weibull_shape));
        const eolMass=c.residualEol*Math.max(0,f1-f0);
        eolByProduct[c.product_category]=(eolByProduct[c.product_category]||0)+eolMass;
        const remainingUse=Math.max(0,1-(age+1)/duration);
        const remainingResidual=c.residualEol*(1-f1);
        inUseStock+=Object.values(c.usePools).reduce((s,v)=>s+v*remainingUse,0)+remainingResidual;
      });
      let maturedReuse=0;
      const processByProduct={incineration:{},landfill:{},recycling:{},reuse:{},biological_treatment:{}};
      const maturedEntries=reuseQueue[year]||[];delete reuseQueue[year];
      maturedEntries.forEach(item=>{
        maturedReuse+=item.mass;
        const r=eolMap[item.product_category];
        const denom=100-Number(r.reuse_pct||0);
        if(denom<=1e-12){
          processByProduct.reuse[item.product_category]=(processByProduct.reuse[item.product_category]||0)+item.mass;
          addEdge(edges,'Matured reuse stock','Reuse',item.mass);
          return;
        }
        const keys=[['incineration_pct','incineration','Incineration'],['landfill_pct','landfill','Landfill'],['recycling_pct','recycling','Recycling'],['biological_treatment_pct','biological_treatment','Biological treatment']];
        keys.forEach(([pk,k,label])=>{
          const routed=item.mass*Number(r[pk]||0)/denom;
          processByProduct[k][item.product_category]=(processByProduct[k][item.product_category]||0)+routed;
          addEdge(edges,'Matured reuse stock',label,routed);
        });
      });
      Object.entries(eolByProduct).forEach(([p,m])=>{addEdge(edges,p,'End-of-life products',m);routeEolMass(p,m,eolMap,processByProduct,edges);});
      const annualTerminal={air:annualUse.air,surface_water:annualUse.surface_water,soil:annualUse.soil,recovery_resource:0,reuse_product_stock:0,landfill_stock:0,transformation_loss:0,other_unclassified:0};
      addEdge(edges,'Use-stage air release','Air',annualUse.air);addEdge(edges,'Use-stage surface_water release','Surface-water sink',annualUse.surface_water);addEdge(edges,'Use-stage soil release','Soil',annualUse.soil);addEdge(edges,'Use-stage wastewater','WWTP',annualUse.WWTP);
      let wwtpInput=annualUse.WWTP,incInput=0,landfillIn=0;
      // Recycling by product, retaining product identity for reuse only where needed.
      Object.entries(processByProduct.recycling).forEach(([p,m])=>{
        const o=applyProcessOutputs(m,factors.recycling);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Recycling',staticOutputLabel(k),v));
        const rec=o.recovered_product||0;const loop=rec*pct(dynamicSettings.closed_loop_recycling_pct);const external=rec-loop;
        if(loop>0){const target=year+Math.max(1,Math.round(dynamicSettings.recycling_delay_y));secondaryQueue[target]=(secondaryQueue[target]||0)+loop;addEdge(edges,'Recovered product','Delayed recycled feedstock',loop);} 
        annualTerminal.recovery_resource+=external;addEdge(edges,'Recovered product','Recovery and resource utilization',external);
        annualTerminal.air+=o.air||0;annualTerminal.transformation_loss+=o.transformation||0;wwtpInput+=o.wastewater_to_wwtp||0;incInput+=o.residue_to_incineration||0;landfillIn+=o.residue_to_landfill||0;
        addEdge(edges,'Wastewater to WWTP','WWTP',o.wastewater_to_wwtp);addEdge(edges,'Residue to incineration','Incineration',o.residue_to_incineration);addEdge(edges,'Residue to landfill','Landfill',o.residue_to_landfill);addEdge(edges,'Transformation','Transformation / loss',o.transformation);
      });
      Object.entries(processByProduct.reuse).forEach(([p,m])=>{
        const o=applyProcessOutputs(m,factors.reuse);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Reuse',staticOutputLabel(k),v));
        const stock=o.extended_use_stock||0;const target=year+Math.max(1,Math.round(dynamicSettings.reuse_delay_y));
        const holder={mass:stock,product_category:p,processByProduct:{incineration:{},landfill:{},recycling:{},reuse:{},biological_treatment:{}}};
        (reuseQueue[target]??=[]).push(holder);addEdge(edges,'Extended-use stock','Delayed reuse stock',stock);
        annualTerminal.air+=o.air||0;annualTerminal.surface_water+=o.surface_water||0;annualTerminal.soil+=o.soil||0;wwtpInput+=o.WWTP||0;
      });
      Object.entries(processByProduct.biological_treatment).forEach(([,m])=>{
        const o=applyProcessOutputs(m,factors.biological_treatment);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Biological treatment',staticOutputLabel(k),v));
        annualTerminal.soil+=o.soil_compost||0;annualTerminal.surface_water+=o.surface_water||0;annualTerminal.air+=o.air||0;annualTerminal.transformation_loss+=o.biodegradation_transformation||0;
        addEdge(edges,'Soil / compost','Soil',o.soil_compost);addEdge(edges,'Surface water','Surface-water sink',o.surface_water);addEdge(edges,'Biodegradation / transformation','Transformation / loss',o.biodegradation_transformation);
      });
      incInput+=sumObject(processByProduct.incineration);landfillIn+=sumObject(processByProduct.landfill);
      let wwtpEffluent=0,wwtpSludge=0,wwtpTransformed=0;
      if(wwtpInput>0){
        wwtpEffluent=wwtpInput*pct(factors.WWTP.effluent);wwtpSludge=wwtpInput*pct(factors.WWTP.sludge);wwtpTransformed=wwtpInput*pct(factors.WWTP.transformation_non_nano);
        addEdge(edges,'WWTP','Effluent',wwtpEffluent);addEdge(edges,'WWTP','Sewage sludge',wwtpSludge);addEdge(edges,'WWTP','Transformation / non-nano form',wwtpTransformed);
        annualTerminal.surface_water+=wwtpEffluent;annualTerminal.transformation_loss+=wwtpTransformed;addEdge(edges,'Effluent','Surface-water sink',wwtpEffluent);addEdge(edges,'Transformation / non-nano form','Transformation / loss',wwtpTransformed);
        const sr=normalizeObject(sludge),si=wwtpSludge*(sr.incineration||0),sl=wwtpSludge*(sr.landfill||0),ss=wwtpSludge*(sr.soil_compost||0),srec=wwtpSludge*(sr.fuel_product_feedstock||0),so=wwtpSludge*(sr.other_unclassified||0);
        incInput+=si;landfillIn+=sl;annualTerminal.soil+=ss;annualTerminal.recovery_resource+=srec;annualTerminal.other_unclassified+=so;
        addEdge(edges,'Sewage sludge','Sludge → incineration',si);addEdge(edges,'Sewage sludge','Sludge → landfill',sl);addEdge(edges,'Sewage sludge','Sludge → soil / compost',ss);addEdge(edges,'Sewage sludge','Sludge → fuel / product feedstock',srec);addEdge(edges,'Sewage sludge','Sludge → other',so);
        addEdge(edges,'Sludge → incineration','Incineration',si);addEdge(edges,'Sludge → landfill','Landfill',sl);addEdge(edges,'Sludge → soil / compost','Soil',ss);addEdge(edges,'Sludge → fuel / product feedstock','Recovery and resource utilization',srec);addEdge(edges,'Sludge → other','Other / unclassified',so);
      }
      if(incInput>0){
        const o=applyProcessOutputs(incInput,factors.incineration);Object.entries(o).forEach(([k,v])=>addEdge(edges,'Incineration',staticOutputLabel(k),v));
        annualTerminal.air+=o.air||0;landfillIn+=o.fly_ash_to_landfill||0;annualTerminal.recovery_resource+=o.bottom_ash_recovery||0;annualTerminal.transformation_loss+=o.thermal_transformation_loss||0;
        addEdge(edges,'Fly ash to landfill','Landfill',o.fly_ash_to_landfill);addEdge(edges,'Bottom ash recovery','Recovery and resource utilization',o.bottom_ash_recovery);addEdge(edges,'Thermal transformation / loss','Transformation / loss',o.thermal_transformation_loss);
      }
      const lfBase=landfillStock+landfillIn;
      const lfRates={leachate_to_surface_water:pct(factors.landfill.leachate_to_surface_water),runoff_to_surface_water:pct(factors.landfill.runoff_to_surface_water),fugitive_dust_to_air:pct(factors.landfill.fugitive_dust_to_air),transformation:pct(factors.landfill.transformation)};
      const lfLossRate=sumObject(lfRates);const lfOut=Object.fromEntries(Object.entries(lfRates).map(([k,r])=>[k,lfBase*r]));
      landfillStock=Math.max(0,lfBase*(1-lfLossRate));
      if(landfillIn>0)addEdge(edges,'Landfill inflow','Landfill stock',landfillIn);
      addEdge(edges,'Landfill stock','Leachate to surface water',lfOut.leachate_to_surface_water);addEdge(edges,'Landfill stock','Runoff to surface water',lfOut.runoff_to_surface_water);addEdge(edges,'Landfill stock','Fugitive dust to air',lfOut.fugitive_dust_to_air);addEdge(edges,'Landfill stock','Landfill transformation',lfOut.transformation);
      annualTerminal.surface_water+=lfOut.leachate_to_surface_water+lfOut.runoff_to_surface_water;annualTerminal.air+=lfOut.fugitive_dust_to_air;annualTerminal.transformation_loss+=lfOut.transformation;
      addEdge(edges,'Leachate to surface water','Surface-water sink',lfOut.leachate_to_surface_water);addEdge(edges,'Runoff to surface water','Surface-water sink',lfOut.runoff_to_surface_water);addEdge(edges,'Fugitive dust to air','Air',lfOut.fugitive_dust_to_air);addEdge(edges,'Landfill transformation','Transformation / loss',lfOut.transformation);
      Object.keys(cumulative).forEach(k=>cumulative[k]+=annualTerminal[k]||0);
      const reuseStock=Object.values(reuseQueue).flat().reduce((s,x)=>s+x.mass,0);
      const secondaryStock=sumObject(secondaryQueue);
      const totalStocks=inUseStock+reuseStock+landfillStock+secondaryStock;
      const cumulativeSinks=sumObject(cumulative);
      const cumulativeAccountedInput=cumulativePrimary+openingLandfillStock;
      const residual=cumulativeAccountedInput-totalStocks-cumulativeSinks;
      annualTerminal.reuse_product_stock=reuseStock;annualTerminal.landfill_stock=landfillStock;
      const soilRetention=Math.exp(-1/Math.max(Number(env.soil_residence_time_y)||1,1e-9));
      const sedimentRetention=Math.exp(-1/Math.max(Number(env.sediment_residence_time_y)||1,1e-9));
      soilMediaStock=soilMediaStock*soilRetention+annualTerminal.soil;
      sedimentMediaStock=sedimentMediaStock*sedimentRetention+annualTerminal.surface_water*pct(env.water_to_sediment_pct);
      const pec=environmentalMetrics({terminal:annualTerminal,wwtpEffluent,wwtpSludge,region,env,mediaStocks:{soil_kg:soilMediaStock,sediment_kg:sedimentMediaStock}});
      const row={year,primary_input_kg_y:primary,product_primary_input_kg_y:deepClone(primaryByProduct),secondary_input_kg_y:secondary,product_total_input_kg_y:deepClone(totalInputByProduct),total_product_input_kg_y:totalInput,use_release_kg_y:sumObject(annualUse),eol_generation_kg_y:sumObject(eolByProduct)+maturedReuse,wwtp_input_kg_y:wwtpInput,incineration_input_kg_y:incInput,landfill_inflow_kg_y:landfillIn,air_release_kg_y:annualTerminal.air,surface_water_release_kg_y:annualTerminal.surface_water,soil_release_kg_y:annualTerminal.soil,recovery_output_kg_y:annualTerminal.recovery_resource,transformation_loss_kg_y:annualTerminal.transformation_loss,other_output_kg_y:annualTerminal.other_unclassified,in_use_stock_kg:inUseStock,reuse_stock_kg:reuseStock,landfill_stock_kg:landfillStock,recycled_feedstock_stock_kg:secondaryStock,soil_media_stock_kg:soilMediaStock,sediment_media_stock_kg:sedimentMediaStock,opening_technosphere_stock_kg:openingLandfillStock,cumulative_primary_input_kg:cumulativePrimary,cumulative_accounted_input_kg:cumulativeAccountedInput,cumulative_external_sinks_kg:cumulativeSinks,mass_balance_residual_kg:residual,mass_balance_closure_pct:cumulativeAccountedInput>0?((totalStocks+cumulativeSinks)/cumulativeAccountedInput)*100:100,terminal:annualTerminal,pec,wwtp:{input:wwtpInput,effluent:wwtpEffluent,sludge:wwtpSludge,transformed:wwtpTransformed},flows:edgesToFlows(edges)};
      annual.push(row);allFlows[year]=row.flows;
    });
    return {model:'dynamic',annual,flows_by_year:allFlows,trajectory:deepClone(trajectory),final:annual[annual.length-1],lifetimes:deepClone(lifetimes),dynamic_settings:deepClone(dynamicSettings)};
  }

  function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function randNormal(rng){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
  function gammaSample(alpha,rng){if(alpha<1)return gammaSample(alpha+1,rng)*Math.pow(rng(),1/alpha);const d=alpha-1/3,c=1/Math.sqrt(9*d);while(true){const x=randNormal(rng);let v=1+c*x;if(v<=0)continue;v=v*v*v;const u=rng();if(u<1-0.0331*x*x*x*x)return d*v;if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;}}
  function dirichletPercent(values,rng,rsd){const clean=values.map(v=>Math.max(Number(v)||0,0)),total=clean.reduce((a,b)=>a+b,0);if(total<=0)return clean;const concentration=Math.max(5,1/Math.max(rsd,0.01)**2),g=clean.map(v=>gammaSample(Math.max(v/total*concentration,1e-4),rng)),gs=g.reduce((a,b)=>a+b,0);return g.map(v=>v/gs*100);}
  function quantile(values,p){const a=[...values].sort((x,y)=>x-y),pos=(a.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);}
  function cvToSigma(cv){const c=Math.max(Number(cv)||0,0);return Math.sqrt(Math.log(1+c*c));}
  function lognormalMultiplier(rng,cv){const sigma=cvToSigma(cv);return sigma===0?1:Math.exp(-0.5*sigma*sigma+sigma*randNormal(rng));}
  function uncertaintyCv(profile,key,fallback){const v=Number(profile?.[key]);return Number.isFinite(v)?Math.max(v,0):Math.max(Number(fallback)||0,0);}
  function allocationFromProductMasses(products,masses){
    const total=Object.values(masses||{}).reduce((a,b)=>a+Math.max(0,Number(b)||0),0);
    const out=deepClone(products||[]);out.forEach(p=>p.allocation_pct=total>0?Math.max(0,Number(masses[p.product_category])||0)/total*100:Number(p.allocation_pct)||0);return out;
  }
  function sampleProductInputUncertainty(rows,rng){
    const sampled={};(rows||[]).forEach(r=>{sampled[r.product_category]=Math.max(0,(Number(r.mass_kg_y)||0)*lognormalMultiplier(rng,Math.max(0,Number(r.cv)||0)));});return sampled;
  }
  function sampleProductTrajectory(trajectory,rows,rng,growthSdPct=0){
    const multipliers=Object.fromEntries((rows||[]).map(r=>[r.product_category,lognormalMultiplier(rng,Math.max(0,Number(r.cv)||0))]));
    const out=deepClone(trajectory||[]),names=Object.keys(multipliers);
    out.forEach((row,i)=>{
      const source=row.product_inputs_kg_y||{};const next={};
      names.forEach(name=>{
        if(i===0||growthSdPct<=0)next[name]=Math.max(0,(Number(source[name])||0)*multipliers[name]);
        else{
          const prevBase=Math.max(0,Number((trajectory[i-1].product_inputs_kg_y||{})[name])||0),curBase=Math.max(0,Number(source[name])||0);
          const expected=prevBase>0?curBase/prevBase-1:0;const sampledGrowth=Math.max(-1,expected+(Number(growthSdPct)||0)/100*randNormal(rng));
          next[name]=Math.max(0,Number(out[i-1].product_inputs_kg_y[name])*(1+sampledGrowth));
        }
      });
      row.product_inputs_kg_y=next;row.primary_input_kg_y=sumValues(next);
    });
    return out;
  }
  function sampleScenario({products,eol,factors,sludge,lifetimes=null,dynamicSettings=null,trajectory=null,rng,rsd=0.2,lifetimeRsd=null,growthSdPct=0,uncertaintyProfile=null}){
    const p=deepClone(products),e=deepClone(eol),f=deepClone(factors),s=deepClone(sludge),life=lifetimes?deepClone(lifetimes):null,ds=dynamicSettings?deepClone(dynamicSettings):null,tr=trajectory?deepClone(trajectory):null;
    const allocationCv=uncertaintyCv(uncertaintyProfile,'product_allocation',rsd);
    const releaseCv=uncertaintyCv(uncertaintyProfile,'use_release',rsd);
    const eolCv=uncertaintyCv(uncertaintyProfile,'eol_routes',rsd);
    const treatmentCv=uncertaintyCv(uncertaintyProfile,'treatment_factors',rsd);
    const circularityCv=uncertaintyCv(uncertaintyProfile,'circularity',eolCv);
    const lifetimeCv=uncertaintyCv(uncertaintyProfile,'lifetimes',lifetimeRsd??rsd);
    const alloc=dirichletPercent(p.map(x=>x.allocation_pct),rng,allocationCv);
    p.forEach((r,i)=>{
      r.allocation_pct=alloc[i];
      const keys=['use_air_pct','use_direct_water_pct','use_wwtp_pct','use_soil_pct'];
      keys.forEach(k=>r[k]*=lognormalMultiplier(rng,releaseCv));
      const t=keys.reduce((a,k)=>a+r[k],0);if(t>95)keys.forEach(k=>r[k]*=95/t);
    });
    const ekeys=['incineration_pct','landfill_pct','recycling_pct','reuse_pct','biological_treatment_pct'];
    e.forEach(r=>{const vals=dirichletPercent(ekeys.map(k=>r[k]),rng,eolCv);ekeys.forEach((k,i)=>r[k]=vals[i]);});
    Object.entries(f).forEach(([proc,o])=>{
      if(proc==='landfill'&&dynamicSettings){
        const keys=['leachate_to_surface_water','runoff_to_surface_water','fugitive_dust_to_air','transformation'];
        keys.forEach(k=>o[k]=Math.max(0,o[k]*lognormalMultiplier(rng,treatmentCv)));
        const loss=keys.reduce((a,k)=>a+o[k],0);if(loss>50)keys.forEach(k=>o[k]*=50/loss);
      }else{
        const keys=Object.keys(o),vals=dirichletPercent(keys.map(k=>o[k]),rng,treatmentCv);keys.forEach((k,i)=>o[k]=vals[i]);
      }
    });
    {const keys=Object.keys(s),vals=dirichletPercent(keys.map(k=>s[k]),rng,treatmentCv);keys.forEach((k,i)=>s[k]=vals[i]);}
    if(life){
      life.forEach(r=>{
        r.mean_lifetime_y=Math.max(0.2,r.mean_lifetime_y*lognormalMultiplier(rng,lifetimeCv));
        r.weibull_shape=Math.max(0.5,r.weibull_shape*lognormalMultiplier(rng,lifetimeCv/2));
      });
    }
    if(ds){ds.closed_loop_recycling_pct=clamp(ds.closed_loop_recycling_pct*lognormalMultiplier(rng,circularityCv),0,100);}
    if(tr&&growthSdPct>0){
      for(let i=1;i<tr.length;i++){
        const expected=tr[i-1].primary_input_kg_y===0?0:tr[i].primary_input_kg_y/Math.max(tr[i-1].primary_input_kg_y,1e-30)-1;
        const sampled=expected+(growthSdPct/100)*randNormal(rng);
        tr[i].primary_input_kg_y=Math.max(0,tr[i-1].primary_input_kg_y*(1+sampled));
      }
    }
    return {products:p,eol:e,factors:f,sludge:s,lifetimes:life,dynamicSettings:ds,trajectory:tr};
  }
  function sampleRegionAndEnvironment(region,env,rng,countryCv,environmentCv){
    const r=deepClone(region),e=deepClone(env);
    ['wwtp_flow_m3_y','sludge_dry_t_y'].forEach(k=>r[k]=Math.max(1e-30,(Number(r[k])||0)*lognormalMultiplier(rng,countryCv)));
    const positive=['river_flow_m3_s','soil_area_ha','soil_depth_m','soil_bulk_density_kg_m3','soil_residence_time_y','sediment_area_km2','sediment_depth_m','sediment_bulk_density_kg_m3','sediment_residence_time_y','air_mixing_height_m','air_turnovers_y'];
    positive.forEach(k=>e[k]=Math.max(1e-30,(Number(e[k])||0)*lognormalMultiplier(rng,environmentCv)));
    e.water_to_sediment_pct=clamp((Number(e.water_to_sediment_pct)||0)*lognormalMultiplier(rng,environmentCv),0,100);
    return {region:r,env:e};
  }
  function summarizeSamples(samples){return {P5:quantile(samples,0.05),P50:quantile(samples,0.5),P95:quantile(samples,0.95)};}
  function runStaticMonteCarlo({iterations,seed,rsd,uncertaintyProfile=null,baseArgs}){
    const rng=mulberry32(Number(seed)||42),terminalSamples={},pecSamples={};
    const marketCv=uncertaintyCv(uncertaintyProfile,'market_input',rsd),countryCv=uncertaintyCv(uncertaintyProfile,'country_domain',rsd),environmentCv=uncertaintyCv(uncertaintyProfile,'environment_capacity',rsd);
    const productRows=Array.isArray(baseArgs.product_input_uncertainty)?baseArgs.product_input_uncertainty:null;
    for(let i=0;i<iterations;i++){
      const s=sampleScenario({...baseArgs,rng,rsd,uncertaintyProfile});
      const geo=sampleRegionAndEnvironment(baseArgs.region,baseArgs.env,rng,countryCv,environmentCv);
      let sampledTotal,products=s.products;
      if(productRows){const masses=sampleProductInputUncertainty(productRows,rng);sampledTotal=sumValues(masses);products=allocationFromProductMasses(s.products,masses);}
      else sampledTotal=Math.max(0,baseArgs.total*lognormalMultiplier(rng,marketCv));
      const r=runStaticMFA({...baseArgs,...s,...geo,products,total:sampledTotal});
      Object.entries(r.terminal).forEach(([k,v])=>(terminalSamples[k]??=[]).push(v));
      Object.entries(r.pec).forEach(([k,v])=>(pecSamples[k]??=[]).push(v));
    }
    return {model:'static_probabilistic',iterations,input_uncertainty_mode:productRows?'product_specific':'aggregate',uncertainty_profile:deepClone(uncertaintyProfile),terminal:Object.fromEntries(Object.entries(terminalSamples).map(([k,v])=>[k,summarizeSamples(v)])),pec:Object.fromEntries(Object.entries(pecSamples).map(([k,v])=>[k,summarizeSamples(v)]))};
  }
  function runDynamicMonteCarlo({iterations,seed,rsd,lifetimeRsd,growthSdPct,uncertaintyProfile=null,baseArgs,metrics}){
    const rng=mulberry32(Number(seed)||42),samples={};metrics.forEach(m=>samples[m]=baseArgs.trajectory.map(()=>[]));
    const marketCv=uncertaintyCv(uncertaintyProfile,'market_input',rsd),countryCv=uncertaintyCv(uncertaintyProfile,'country_domain',rsd),environmentCv=uncertaintyCv(uncertaintyProfile,'environment_capacity',rsd);
    const productRows=Array.isArray(baseArgs.product_input_uncertainty)?baseArgs.product_input_uncertainty:null;
    for(let i=0;i<iterations;i++){
      const s=sampleScenario({...baseArgs,rng,rsd,lifetimeRsd,growthSdPct:productRows?0:growthSdPct,uncertaintyProfile});
      if(productRows){s.trajectory=sampleProductTrajectory(baseArgs.trajectory,productRows,rng,growthSdPct);if(s.trajectory.length)s.products=allocationFromProductMasses(s.products,s.trajectory[0].product_inputs_kg_y);}
      else{const factor=lognormalMultiplier(rng,marketCv);if(s.trajectory)s.trajectory.forEach(row=>row.primary_input_kg_y=Math.max(0,row.primary_input_kg_y*factor));}
      const geo=sampleRegionAndEnvironment(baseArgs.region,baseArgs.env,rng,countryCv,environmentCv);
      const r=runDynamicMFA({...baseArgs,...s,...geo});
      r.annual.forEach((row,idx)=>metrics.forEach(m=>samples[m][idx].push(valueAtPath(row,m))));
    }
    const years=baseArgs.trajectory.map(r=>r.year);
    return {model:'dynamic_probabilistic',iterations,input_uncertainty_mode:productRows?'product_specific':'aggregate',uncertainty_profile:deepClone(uncertaintyProfile),years,metrics:Object.fromEntries(metrics.map(m=>[m,samples[m].map(v=>summarizeSamples(v))]))};
  }
  function runStockDrivenMonteCarlo({iterations,seed,rsd,lifetimeRsd,uncertaintyProfile=null,baseArgs,targetTrajectory,metrics}){
    const rng=mulberry32(Number(seed)||42),samples={};metrics.forEach(m=>samples[m]=targetTrajectory.map(()=>[]));
    const countryCv=uncertaintyCv(uncertaintyProfile,'country_domain',rsd),environmentCv=uncertaintyCv(uncertaintyProfile,'environment_capacity',rsd);
    for(let i=0;i<iterations;i++){
      const dummy=targetTrajectory.map(r=>({year:r.year,primary_input_kg_y:0}));
      const sc=sampleScenario({...baseArgs,trajectory:dummy,rng,rsd,lifetimeRsd,uncertaintyProfile});
      if(Array.isArray(baseArgs.product_input_uncertainty)){const masses=sampleProductInputUncertainty(baseArgs.product_input_uncertainty,rng);sc.products=allocationFromProductMasses(sc.products,masses);}
      const geo=sampleRegionAndEnvironment(baseArgs.region,baseArgs.env,rng,countryCv,environmentCv);
      const sol=solveStockDrivenTrajectory({...baseArgs,...sc,...geo,targetTrajectory,maxIterations:12,toleranceRelative:5e-4});
      sol.result.annual.forEach((row,idx)=>metrics.forEach(m=>samples[m][idx].push(valueAtPath(row,m))));
    }
    return {model:'stock_driven_dynamic_probabilistic',iterations,uncertainty_profile:deepClone(uncertaintyProfile),years:targetTrajectory.map(r=>r.year),metrics:Object.fromEntries(metrics.map(m=>[m,samples[m].map(v=>summarizeSamples(v))]))};
  }

  function valueAtPath(object,path){return path.split('.').reduce((o,k)=>o?.[k],object)??0;}

  // Weighted constrained reconciliation for one balance equation.
  // Roles use +1 for inflow and -1 for outflow or stock increase.
  function reconcileBalance(rows,{mode='bayesian',minimumSigma=1e-9}={}){
    if(!Array.isArray(rows)||rows.length<2)throw new Error('At least two reconciliation rows are required.');
    const prepared=rows.map((row,index)=>{
      const model=Math.max(0,Number(row.model_value)||0);
      const modelCv=Math.max(0,Number(row.model_cv)||0.2);
      const obsRaw=row.observed_value;
      const hasObs=obsRaw!==''&&obsRaw!==null&&obsRaw!==undefined&&Number.isFinite(Number(obsRaw));
      const obs=hasObs?Math.max(0,Number(obsRaw)):null;
      const obsCv=Math.max(0,Number(row.observed_cv)||0.1);
      const modelVar=Math.max(Math.pow(Math.abs(model)*modelCv,2),minimumSigma*minimumSigma);
      const obsVar=hasObs?Math.max(Math.pow(Math.abs(obs)*obsCv,2),minimumSigma*minimumSigma):null;
      let estimate=model,variance=modelVar,source='model prior';
      if(hasObs&&mode==='observations'){
        estimate=obs;variance=obsVar;source='observation';
      }else if(hasObs){
        const pm=1/modelVar,po=1/obsVar;
        estimate=(model*pm+obs*po)/(pm+po);variance=1/(pm+po);source='posterior before closure';
      }
      const role=String(row.role||'outflow');
      const sign=role==='inflow'?1:-1;
      return {...deepClone(row),index,model_value:model,observed_value:obs,has_observation:hasObs,estimate,variance,sign,source};
    });
    const adjusted=prepared.map(r=>r.estimate);
    const free=new Set(prepared.map((_,i)=>i));
    for(let pass=0;pass<prepared.length+2;pass++){
      let residual=0,denom=0;
      prepared.forEach((r,i)=>{residual+=r.sign*adjusted[i];if(free.has(i))denom+=r.variance;});
      if(Math.abs(residual)<1e-12||denom<=0)break;
      free.forEach(i=>{const r=prepared[i];adjusted[i]-=r.sign*r.variance*residual/denom;});
      const negatives=[...free].filter(i=>adjusted[i]<0);
      if(!negatives.length)break;
      negatives.forEach(i=>{adjusted[i]=0;free.delete(i);});
    }
    const balance=prepared.reduce((s,r,i)=>s+r.sign*adjusted[i],0);
    const out=prepared.map((r,i)=>{
      const sigma=Math.sqrt(r.variance);
      const observationResidual=r.has_observation?(adjusted[i]-r.observed_value)/Math.max(Math.abs(r.observed_value)*(Number(r.observed_cv)||0.1),minimumSigma):null;
      return {...r,reconciled_value:adjusted[i],adjustment:adjusted[i]-r.estimate,standardized_adjustment:(adjusted[i]-r.estimate)/Math.max(sigma,minimumSigma),observation_z:observationResidual};
    });
    const chi2=out.reduce((s,r)=>s+r.standardized_adjustment*r.standardized_adjustment,0);
    return {mode,rows:out,balance_residual:balance,chi_square:chi2,degrees_of_freedom:1};
  }

  // Inverse cohort calculation. The required primary inflow is solved year-by-year
  // so the end-of-year in-use stock approaches an entered target trajectory.
  function solveStockDrivenTrajectory({targetTrajectory,products,eol,factors,sludge,lifetimes,region,env,dynamicSettings,toleranceRelative=1e-5,maxIterations=26}){
    if(!Array.isArray(targetTrajectory)||!targetTrajectory.length)throw new Error('A target-stock trajectory is required.');
    const sorted=[...targetTrajectory].sort((a,b)=>Number(a.year)-Number(b.year));
    const solved=[],diagnostics=[];
    const start=Number(sorted[0].year);
    for(const targetRow of sorted){
      const year=Number(targetRow.year),target=Math.max(0,Number(targetRow.target_stock_kg)||0);
      const ds={...deepClone(dynamicSettings),start_year:start,end_year:year,driver_mode:'stock_driven'};
      const evaluate=primary=>runDynamicMFA({trajectory:[...solved,{year,primary_input_kg_y:Math.max(0,primary)}],products,eol,factors,sludge,lifetimes,region,env,dynamicSettings:ds});
      const zero=evaluate(0),unavoidable=zero.final.in_use_stock_kg;
      let primary=0,result=zero,status='target below inherited stock; zero primary inflow';
      if(unavoidable<target){
        let lo=0,hi=Math.max(target-unavoidable,1);
        result=evaluate(hi);
        let guard=0;
        while(result.final.in_use_stock_kg<target&&guard++<50){hi*=2;result=evaluate(hi);}
        if(guard>=50)throw new Error(`Could not bracket the stock-driven inflow for ${year}.`);
        for(let j=0;j<maxIterations;j++){
          const mid=(lo+hi)/2,r=evaluate(mid),stock=r.final.in_use_stock_kg;
          if(stock<target)lo=mid;else{hi=mid;result=r;}
          if(Math.abs(stock-target)<=Math.max(1e-9,target*toleranceRelative))break;
        }
        primary=(lo+hi)/2;result=evaluate(primary);status='target solved';
      }
      solved.push({year,primary_input_kg_y:primary});
      diagnostics.push({year,target_stock_kg:target,achieved_stock_kg:result.final.in_use_stock_kg,stock_gap_kg:result.final.in_use_stock_kg-target,required_primary_input_kg_y:primary,status});
    }
    const ds={...deepClone(dynamicSettings),start_year:start,end_year:Number(sorted.at(-1).year),driver_mode:'stock_driven'};
    const result=runDynamicMFA({trajectory:solved,products,eol,factors,sludge,lifetimes,region,env,dynamicSettings:ds});
    result.stock_driven={target_trajectory:deepClone(sorted),diagnostics:deepClone(diagnostics)};
    result.annual.forEach((row,i)=>{row.target_in_use_stock_kg=diagnostics[i].target_stock_kg;row.stock_target_gap_kg=diagnostics[i].stock_gap_kg;});
    return {trajectory:solved,diagnostics,result};
  }

  const FATE_COMPARTMENTS=['air','water','soil','sediment'];
  function fateCapacities(region,env,fate){
    const airVolume=Math.max(region.area_km2*1e6*env.air_mixing_height_m,1e-30);
    const waterResidenceY=Math.max(Number(fate.water_residence_time_days)||30,0.01)/365.25;
    const waterVolume=Math.max(env.river_flow_m3_s*SECONDS_PER_YEAR*waterResidenceY,1e-30);
    const soilMass=Math.max(env.soil_area_ha*10000*env.soil_depth_m*env.soil_bulk_density_kg_m3,1e-30);
    const sedimentMass=Math.max(env.sediment_area_km2*1e6*env.sediment_depth_m*env.sediment_bulk_density_kg_m3,1e-30);
    return {air_volume_m3:airVolume,water_volume_m3:waterVolume,soil_mass_kg:soilMass,sediment_mass_kg:sedimentMass};
  }
  function fateConcentrations(stocks,capacities){
    return {
      air_pec_ng_m3:(stocks.air/capacities.air_volume_m3)*1e12,
      surface_water_pec_ug_L:(stocks.water/capacities.water_volume_m3)*1e6,
      soil_pec_ug_kg:(stocks.soil/capacities.soil_mass_kg)*1e9,
      active_sediment_pec_ug_kg:(stocks.sediment/capacities.sediment_mass_kg)*1e9
    };
  }
  function fateStep(stocks,emissions,rates,dt){
    const s={air:Math.max(0,Number(stocks.air)||0),water:Math.max(0,Number(stocks.water)||0),soil:Math.max(0,Number(stocks.soil)||0),sediment:Math.max(0,Number(stocks.sediment)||0)};
    FATE_COMPARTMENTS.forEach(k=>s[k]+=Math.max(0,Number(emissions[k])||0)*dt/2);
    const transfer={air:{water:'air_to_water_y',soil:'air_to_soil_y'},water:{sediment:'water_to_sediment_y',soil:'water_to_soil_y'},soil:{water:'soil_to_water_y',sediment:'soil_to_sediment_y',air:'soil_to_air_y'},sediment:{water:'sediment_to_water_y'}};
    const sink={air:{advective:'air_advective_y',transformation:'air_transformation_y'},water:{advective:'water_advective_y',transformation:'water_transformation_y'},soil:{burial:'soil_burial_y',transformation:'soil_transformation_y'},sediment:{burial:'sediment_burial_y',transformation:'sediment_transformation_y'}};
    const incoming={air:0,water:0,soil:0,sediment:0},sinkFlux={};
    FATE_COMPARTMENTS.forEach(source=>{
      const paths=[];
      Object.entries(transfer[source]||{}).forEach(([target,key])=>paths.push({kind:'transfer',target,key,rate:Math.max(0,Number(rates[key])||0)}));
      Object.entries(sink[source]||{}).forEach(([name,key])=>paths.push({kind:'sink',name,key,rate:Math.max(0,Number(rates[key])||0)}));
      const totalRate=paths.reduce((a,p)=>a+p.rate,0);if(totalRate<=0)return;
      const totalLoss=s[source]*(1-Math.exp(-totalRate*dt));s[source]-=totalLoss;
      paths.forEach(p=>{const m=totalLoss*p.rate/totalRate;if(p.kind==='transfer')incoming[p.target]+=m;else sinkFlux[`${source}_${p.name}`]=(sinkFlux[`${source}_${p.name}`]||0)+m;});
    });
    FATE_COMPARTMENTS.forEach(k=>{s[k]+=incoming[k]+Math.max(0,Number(emissions[k])||0)*dt/2;});
    return {stocks:s,sinks:sinkFlux};
  }
  function runMultimediaFateStatic({emissions,region,env,fate,initialStocks=null,maxYears=1000,tolerance=1e-8}){
    let stocks={air:0,water:0,soil:0,sediment:0,...deepClone(initialStocks||{})};
    const caps=fateCapacities(region,env,fate),substeps=Math.max(1,Math.round(Number(fate.substeps_per_year)||12));
    let annualSinks={},converged=false,years=0;
    for(years=1;years<=maxYears;years++){
      const before=deepClone(stocks);annualSinks={};
      for(let j=0;j<substeps;j++){
        const step=fateStep(stocks,emissions,fate,1/substeps);stocks=step.stocks;Object.entries(step.sinks).forEach(([k,v])=>annualSinks[k]=(annualSinks[k]||0)+v);
      }
      const delta=FATE_COMPARTMENTS.reduce((a,k)=>a+Math.abs(stocks[k]-before[k]),0),scale=Math.max(1e-12,FATE_COMPARTMENTS.reduce((a,k)=>a+Math.abs(stocks[k]),0));
      if(delta<=scale*tolerance){converged=true;break;}
    }
    const input=sumValues(emissions),sinkTotal=sumValues(annualSinks);
    return {mode:'steady_state_reduced_form',converged,iterations_years:years,stocks_kg:stocks,concentrations:fateConcentrations(stocks,caps),capacities:caps,annual_external_sinks_kg_y:annualSinks,steady_state_balance_residual_kg_y:input-sinkTotal,rates:deepClone(fate)};
  }
  function runMultimediaFateDynamic({annualEmissions,region,env,fate,initialStocks=null}){
    let stocks={air:0,water:0,soil:0,sediment:0,...deepClone(initialStocks||{})};
    const caps=fateCapacities(region,env,fate),substeps=Math.max(1,Math.round(Number(fate.substeps_per_year)||12));
    const annual=[];let cumulativeInput=0,cumulativeSinks=0;
    for(const row of annualEmissions){
      const emissions={air:Math.max(0,Number(row.air)||0),water:Math.max(0,Number(row.water)||0),soil:Math.max(0,Number(row.soil)||0),sediment:Math.max(0,Number(row.sediment)||0)};
      const sinks={};for(let j=0;j<substeps;j++){const step=fateStep(stocks,emissions,fate,1/substeps);stocks=step.stocks;Object.entries(step.sinks).forEach(([k,v])=>sinks[k]=(sinks[k]||0)+v);}
      cumulativeInput+=sumValues(emissions);cumulativeSinks+=sumValues(sinks);
      annual.push({year:Number(row.year),emissions_kg_y:emissions,stocks_kg:deepClone(stocks),concentrations:fateConcentrations(stocks,caps),external_sinks_kg_y:sinks,cumulative_mass_balance_residual_kg:cumulativeInput-cumulativeSinks-sumValues(stocks)});
    }
    return {mode:'dynamic_reduced_form',annual,final:annual.at(-1),capacities:caps,rates:deepClone(fate)};
  }

  function validationStatistics(pairs){
    const clean=(pairs||[]).filter(r=>Number.isFinite(Number(r.observed))&&Number.isFinite(Number(r.predicted)));
    if(!clean.length)return {n:0,rmse:null,mae:null,bias:null,mape_pct:null,within_95_pct:null,reduced_chi_square:null};
    let se=0,ae=0,bias=0,ape=0,apeN=0,inside=0,chi=0;
    clean.forEach(r=>{const o=Number(r.observed),p=Number(r.predicted),d=p-o;se+=d*d;ae+=Math.abs(d);bias+=d;if(Math.abs(o)>1e-30){ape+=Math.abs(d/o);apeN++;}const sigma=Math.max(Math.abs(o)*(Number(r.cv)||0.2),1e-30);chi+=(d/sigma)**2;if(Math.abs(d)<=1.96*sigma)inside++;});
    return {n:clean.length,rmse:Math.sqrt(se/clean.length),mae:ae/clean.length,bias:bias/clean.length,mape_pct:apeN?ape/apeN*100:null,within_95_pct:inside/clean.length*100,reduced_chi_square:chi/Math.max(1,clean.length-1)};
  }

  return {SECONDS_PER_YEAR,deepClone,pct,sumValues,normalizeObject,validateInputs,runStaticMFA,runDynamicMFA,buildTrajectory,weibullCdf,weibullScaleFromMean,runStaticMonteCarlo,runDynamicMonteCarlo,runStockDrivenMonteCarlo,quantile,valueAtPath,reconcileBalance,solveStockDrivenTrajectory,fateCapacities,runMultimediaFateStatic,runMultimediaFateDynamic,validationStatistics,mulberry32,lognormalMultiplier,uncertaintyCv,sampleScenario,sampleProductInputUncertainty,sampleProductTrajectory,allocationFromProductMasses,sampleRegionAndEnvironment,summarizeSamples};
});
