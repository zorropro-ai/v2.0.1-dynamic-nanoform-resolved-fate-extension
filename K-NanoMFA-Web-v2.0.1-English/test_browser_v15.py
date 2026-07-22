"""Headless UI, nanoform, and responsive integration test for K-NanoMFA v1.5."""
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
    for name in ['data.js','engine.js','product_inventory.js','app.js','geography.js','advanced.js','mixture.js','nanoform.js']:
        page.add_script_tag(path=str(ROOT/name))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(450)

    assert page.locator('[data-guide-stage]').count()==5
    page.select_option('#interfaceView','all')
    assert page.locator('.tab').count()==10
    page.select_option('#interfaceView','guided')
    assert page.input_value('#marketInputMode')=='direct_enm'
    assert not page.is_checked('#nanoformEnabled')

    # Legacy-compatible calculation remains unchanged with nanoform disabled.
    page.fill('#totalMass','1000')
    page.click('#calculateBtn')
    base_closure=page.evaluate("window.KNanoApp.state.result.mass_balance_closure_pct")
    assert abs(base_closure-100)<1e-8
    assert page.evaluate("window.KNanoNanoform.getOutputs()") is None

    # Enable state tracking and run the same static scenario.
    page.evaluate("window.KNanoApp.switchTab('quality')")
    page.check('#nanoformEnabled')
    page.select_option('#nanoformMaterialPreset','persistent_oxide')
    page.select_option('#nanoformEmbeddingPreset','surface_coating')
    page.click('#applyNanoformPresetBtn')
    product_state_total=page.evaluate("Object.values(window.KNanoNanoform.getState().product_state_pct).reduce((a,b)=>a+Number(b||0),0)")
    assert abs(product_state_total-100)<1e-8
    page.click('#calculateBtn')
    nf_static=page.evaluate("window.KNanoNanoform.getOutputs()")
    assert nf_static and abs(nf_static['state_balance_closure_pct']-100)<1e-8
    assert len(nf_static['state_inventory_kg'])==7
    assert page.locator('#nanoformResultsPanel').is_visible()
    assert page.locator('#nanoformResultsBody').is_visible()

    # Scenario persistence includes the optional v1.5 state configuration.
    scenario=page.evaluate("window.KNanoApp.scenario()")
    assert scenario['version']=='1.5-en'
    assert scenario['nanoform']['enabled'] is True
    page.evaluate("window.KNanoApp.applyScenario(window.KNanoApp.scenario(),false)")
    assert page.is_checked('#nanoformEnabled')

    # Dynamic cumulative state inventory closes against cumulative accounted input.
    page.evaluate("window.KNanoApp.switchTab('model')")
    page.select_option('#modelMode','dynamic_probabilistic')
    page.fill('#startYear','2024'); page.fill('#endYear','2030')
    page.click('#generateTrajectoryBtn')
    assert not page.is_disabled('#calculateBtn'),page.locator('#validationBox').inner_text()
    page.evaluate("window.KNanoApp.calculate()")
    base_dynamic=page.evaluate("window.KNanoApp.state.result.final.mass_balance_closure_pct")
    nf_dynamic=page.evaluate("window.KNanoNanoform.getOutputs()")
    assert abs(base_dynamic-100)<1e-8
    assert abs(nf_dynamic['state_balance_closure_pct']-100)<1e-7
    assert len(nf_dynamic['annual'])==7

    # Product-informed mode remains available.
    page.evaluate("window.KNanoApp.switchTab('model')")
    page.select_option('#modelMode','static_deterministic')
    page.select_option('#marketInputMode','product_inventory')
    page.wait_for_timeout(100)
    assert page.evaluate("window.KNanoProductInventory.isActive()") is True

    # Responsive containment: no document-level horizontal overflow on key workspaces.
    page.select_option('#interfaceView','all')
    responsive=[]
    key_tabs=['model','lifecycle','results','quality','advanced','mixture']
    for width in [1600,1440,1280,1024,768,480]:
        page.set_viewport_size({'width':width,'height':1200})
        width_result={'width':width,'tabs':{}}
        for tab in key_tabs:
            page.evaluate(f"window.KNanoApp.switchTab('{tab}')")
            page.wait_for_timeout(60)
            overflow=page.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            width_result['tabs'][tab]=overflow
            assert overflow<=1,(width,tab,overflow)
        page.evaluate("window.KNanoApp.switchTab('model')")
        page.click('#manageCustomCountryBtn')
        page.wait_for_timeout(60)
        geo=page.evaluate("""()=>{const p=document.querySelector('#customGeoPanel').getBoundingClientRect();const els=[...document.querySelectorAll('#customGeoPanel input,#customGeoPanel select,#customGeoPanel button,#customGeoPanel .geo-editor-section')].filter(e=>e.offsetParent!==null);return {doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,max:Math.max(0,...els.map(e=>e.getBoundingClientRect().right-p.right))};}""")
        assert geo['doc']<=1,(width,geo)
        assert geo['max']<=1,(width,geo)
        width_result['custom_geography']=geo
        page.click('#closeCustomGeoBtn')
        responsive.append(width_result)

    assert not errors,errors
    print(json.dumps({
      'workspaces':10,'guided_stages':5,'legacy_static_closure_pct':base_closure,
      'nanoform_static_closure_pct':nf_static['state_balance_closure_pct'],
      'legacy_dynamic_closure_pct':base_dynamic,
      'nanoform_dynamic_closure_pct':nf_dynamic['state_balance_closure_pct'],
      'responsive':responsive,'status':'passed'
    },indent=2))
    browser.close()
