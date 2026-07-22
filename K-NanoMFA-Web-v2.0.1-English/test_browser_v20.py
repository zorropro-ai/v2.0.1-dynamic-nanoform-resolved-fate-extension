"""Headless UI, dynamic fate, and responsive integration test for K-NanoMFA v2.0."""
import json
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet"[^>]*>',f'<style>{css}</style>',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)

with sync_playwright() as p:
    launch_args={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    system_chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
    if system_chromium: launch_args['executable_path']=system_chromium
    browser=p.chromium.launch(**launch_args)
    page=browser.new_page(viewport={'width':1600,'height':1200})
    errors=[]
    page.on('console',lambda msg: errors.append(f'{msg.type}: {msg.text}') if msg.type=='error' else None)
    page.on('pageerror',lambda exc: errors.append(f'pageerror: {exc}'))
    page.on('dialog',lambda dialog:dialog.accept())
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content="window.Plotly={purge(){},react(){return Promise.resolve();},newPlot(){return Promise.resolve();},downloadImage(){return Promise.resolve();},Plots:{resize(){}}};")
    for name in ['data.js','engine.js','product_inventory.js','app.js','geography.js','advanced.js','mixture.js','nanoform.js','dynamic_fate.js']:
        page.add_script_tag(path=str(ROOT/name))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(500)

    assert page.locator('[data-guide-stage]').count()==5
    page.select_option('#interfaceView','all')
    assert page.locator('.tab').count()==10
    page.select_option('#interfaceView','guided')
    assert page.input_value('#marketInputMode')=='direct_enm'
    assert not page.is_checked('#nanoformEnabled')
    assert not page.is_checked('#dynamicFateEnabled')

    # Legacy pathway remains unchanged when both optional modules are disabled.
    page.fill('#totalMass','1000')
    page.click('#calculateBtn')
    legacy_closure=page.evaluate("window.KNanoApp.state.result.mass_balance_closure_pct")
    assert abs(legacy_closure-100)<1e-8
    assert page.evaluate("window.KNanoNanoform.getOutputs()") is None
    assert page.evaluate("window.KNanoDynamicFate.getOutputs()") is None

    # Enable v1.5 state allocation and v2.0 dynamic fate.
    page.evaluate("window.KNanoApp.switchTab('quality')")
    page.check('#nanoformEnabled')
    page.select_option('#nanoformMaterialPreset','persistent_oxide')
    page.select_option('#nanoformEmbeddingPreset','surface_coating')
    page.click('#applyNanoformPresetBtn')
    page.evaluate("window.KNanoApp.switchTab('advanced')")
    page.check('#dynamicFateEnabled')
    page.select_option('#dynamicFatePreset','persistent_oxide')
    page.click('#applyDynamicFatePresetBtn')
    page.fill('#dynamicFateMaxYears','350')
    page.fill('#dynamicFateTolerance','0.000001')
    page.click('#calculateBtn')
    nf_static=page.evaluate("window.KNanoNanoform.getOutputs()")
    df_static=page.evaluate("window.KNanoDynamicFate.getOutputs()")
    assert nf_static and abs(nf_static['state_balance_closure_pct']-100)<1e-8
    assert df_static and abs(df_static['mass_balance_closure_pct']-100)<1e-7
    assert df_static['converged'] is True
    assert len(df_static['final_concentrations']['rows'])==28
    assert page.locator('#dynamicFateResultsPanel').is_visible()
    assert page.locator('#dynamicFateResultsBody').is_visible()

    # Scenario persistence includes v2.0 configuration.
    scenario=page.evaluate("window.KNanoApp.scenario()")
    assert scenario['version']=='2.0-en'
    assert scenario['nanoform']['enabled'] is True
    assert scenario['dynamic_fate']['enabled'] is True
    page.evaluate("window.KNanoApp.applyScenario(window.KNanoApp.scenario(),false)")
    assert page.is_checked('#dynamicFateEnabled')

    # Dynamic trajectory with storm pulse.
    page.evaluate("window.KNanoApp.switchTab('model')")
    page.select_option('#modelMode','dynamic_probabilistic')
    page.fill('#startYear','2024'); page.fill('#endYear','2030')
    page.click('#generateTrajectoryBtn')
    page.evaluate("window.KNanoApp.switchTab('advanced')")
    page.check('#dynamicFateStormEnabled')
    page.fill('#dynamicFateStormYears','2027')
    page.fill('#dynamicFateStormWater','5')
    page.evaluate("window.KNanoApp.calculate()")
    legacy_dynamic=page.evaluate("window.KNanoApp.state.result.final.mass_balance_closure_pct")
    df_dynamic=page.evaluate("window.KNanoDynamicFate.getOutputs()")
    assert abs(legacy_dynamic-100)<1e-8
    assert abs(df_dynamic['mass_balance_closure_pct']-100)<1e-7
    assert len(df_dynamic['annual'])==7
    assert any(k.startswith('storm_') for k in df_dynamic['cumulative_process_fluxes_kg'])

    # Correlated kinetic uncertainty remains finite.
    page.evaluate("window.KNanoApp.switchTab('advanced')")
    page.evaluate("document.querySelectorAll('.dynamic-fate-details')[1].open=true")
    page.check('#dynamicFateUncertaintyEnabled')
    page.fill('#dynamicFateIterations','12')
    page.fill('#dynamicFateCv','0.2')
    page.click('#runDynamicFateUncertaintyBtn')
    uncertainty=page.evaluate("window.KNanoDynamicFate.getUncertainty()")
    assert uncertainty['iterations']==12
    assert uncertainty['summary']['water']['P50'] is not None

    # Product-informed input and all inherited workspaces remain present.
    page.evaluate("window.KNanoApp.switchTab('model')")
    page.select_option('#modelMode','static_deterministic')
    page.select_option('#marketInputMode','product_inventory')
    page.wait_for_timeout(100)
    assert page.evaluate("window.KNanoProductInventory.isActive()") is True

    # Responsive containment is checked on a fresh page without populated result tables.
    rpage=browser.new_page(viewport={'width':1600,'height':1200})
    rpage.on('console',lambda msg: errors.append(f'responsive {msg.type}: {msg.text}') if msg.type=='error' else None)
    rpage.on('pageerror',lambda exc: errors.append(f'responsive pageerror: {exc}'))
    rpage.on('dialog',lambda dialog:dialog.accept())
    rpage.set_content(html,wait_until='domcontentloaded')
    rpage.add_script_tag(content="window.Plotly={purge(){},react(){return Promise.resolve();},newPlot(){return Promise.resolve();},downloadImage(){return Promise.resolve();},Plots:{resize(){}}};")
    for name in ['data.js','engine.js','product_inventory.js','app.js','geography.js','advanced.js','mixture.js','nanoform.js','dynamic_fate.js']:
        rpage.add_script_tag(path=str(ROOT/name))
    rpage.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    rpage.wait_for_timeout(250)
    rpage.select_option('#interfaceView','all')
    responsive=[]
    all_tabs=['model','lifecycle','treatment','environment','results','uncertainty','quality','advanced','mixture','method']
    for width in [1600,1280,1024,768,480]:
        rpage.set_viewport_size({'width':width,'height':1200})
        tabs=all_tabs if width==1024 else ['model','results','quality','advanced','mixture']
        measured=rpage.evaluate("""tabs=>{const out={};for(const tab of tabs){document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id===`tab-${tab}`));void document.body.offsetWidth;out[tab]=document.documentElement.scrollWidth-document.documentElement.clientWidth;}document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id==='tab-model'));const panel=document.querySelector('#customGeoPanel');panel.hidden=false;void panel.offsetWidth;const p=panel.getBoundingClientRect();const els=[...document.querySelectorAll('#customGeoPanel input,#customGeoPanel select,#customGeoPanel button,#customGeoPanel .geo-editor-section')].filter(e=>e.offsetParent!==null);const geo={doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,max:Math.max(0,...els.map(e=>e.getBoundingClientRect().right-p.right))};panel.hidden=true;return {tabs:out,geo};}""",tabs)
        for tab,overflow in measured['tabs'].items(): assert overflow<=1,(width,tab,overflow)
        assert measured['geo']['doc']<=1,(width,measured['geo'])
        assert measured['geo']['max']<=1,(width,measured['geo'])
        responsive.append({'width':width,'tabs':measured['tabs'],'custom_geography':measured['geo']})

    rpage.close()
    assert not errors,errors
    print(json.dumps({
      'workspaces':10,'guided_stages':5,'legacy_static_closure_pct':legacy_closure,
      'nanoform_static_closure_pct':nf_static['state_balance_closure_pct'],
      'dynamic_fate_static_closure_pct':df_static['mass_balance_closure_pct'],
      'dynamic_fate_static_iterations':df_static['iterations_years'],
      'legacy_dynamic_closure_pct':legacy_dynamic,
      'dynamic_fate_dynamic_closure_pct':df_dynamic['mass_balance_closure_pct'],
      'dynamic_years':len(df_dynamic['annual']),
      'uncertainty_iterations':uncertainty['iterations'],
      'responsive':responsive,'status':'passed'
    },indent=2))
    browser.close()
