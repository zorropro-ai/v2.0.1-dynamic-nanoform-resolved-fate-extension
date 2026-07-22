"""Headless UI integration test for K-NanoMFA v1.4."""
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
    page=browser.new_page(viewport={'width':1600,'height':1100})
    errors=[]
    page.on('console',lambda msg: errors.append(f'{msg.type}: {msg.text}') if msg.type=='error' else None)
    page.on('pageerror',lambda exc: errors.append(f'pageerror: {exc}'))
    page.on('dialog',lambda dialog:dialog.accept())
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content="window.Plotly={purge(){},react(){return Promise.resolve();},newPlot(){return Promise.resolve();},downloadImage(){return Promise.resolve();},Plots:{resize(){}}};")
    for name in ['data.js','engine.js','product_inventory.js','app.js','geography.js','advanced.js','mixture.js']:
        page.add_script_tag(path=str(ROOT/name))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(350)

    # All original workspaces are retained and five guided stages remain available.
    assert page.locator('[data-guide-stage]').count()==5
    page.select_option('#interfaceView','all')
    assert page.locator('.tab').count()==10
    page.select_option('#interfaceView','guided')

    # Direct ENM input remains the default compatibility mode.
    assert page.input_value('#marketInputMode')=='direct_enm'
    page.fill('#totalMass','1000')
    page.click('#calculateBtn')
    direct_closure=page.evaluate("window.KNanoApp.state.result.mass_balance_closure_pct")
    assert abs(direct_closure-100)<1e-8

    # Activate product-informed input, populate two concrete sources, and zero the rest.
    page.select_option('#marketInputMode','product_inventory')
    page.wait_for_timeout(150)
    page.evaluate("window.KNanoApp.switchTab('lifecycle')")
    assert page.locator('#productInventoryDetails').is_visible()
    page.select_option('#productInventoryTable tbody tr:nth-child(1) select[data-pi-key="input_basis"]','product_mass')
    page.wait_for_timeout(80)
    assert page.evaluate("window.KNanoProductInventory.getState().rows[0].input_basis")=='product_mass'
    page.evaluate("""
      (()=>{
        const products=window.KNanoApp.state.products;
        const rows=products.map(p=>window.KNanoProductInventory.defaultRow(p,0));
        rows.forEach(r=>{r.primary_quantity=0;r.market_growth_pct_y=0;r.content_change_pct_y=0;r.nano_enabled_change_pct_y=0;});
        Object.assign(rows[0],{input_basis:'product_mass',primary_quantity:100000,enm_content_wt_pct:2,nano_enabled_pct:15,market_growth_pct_y:10,content_change_pct_y:5,nano_enabled_change_pct_y:2});
        Object.assign(rows[1],{input_basis:'unit_sales',primary_quantity:10000,conversion_factor:0.5,enm_content_wt_pct:1,nano_enabled_pct:20});
        window.KNanoProductInventory.loadState({input_mode:'product_inventory',rows},products,0);
        window.KNanoProductInventory.syncAllocationToProducts(products);
        window.KNanoApp.refreshInputViews();
      })()
    """)
    page.wait_for_timeout(150)
    calculated=page.evaluate("window.KNanoProductInventory.prepareStatic(window.KNanoApp.state.products)")
    assert abs(calculated['total_kg_y']-310)<1e-10
    allocations=[p['allocation_pct'] for p in calculated['products']]
    assert abs(sum(allocations)-100)<1e-8
    assert abs(allocations[0]-300/310*100)<1e-8
    assert abs(allocations[1]-10/310*100)<1e-8

    page.click('#calculateBtn')
    static_total=page.evaluate("window.KNanoApp.state.result.product_input.total_kg_y")
    static_closure=page.evaluate("window.KNanoApp.state.result.mass_balance_closure_pct")
    assert abs(static_total-310)<1e-8
    assert abs(static_closure-100)<1e-8
    assert page.locator('#productSourcePanel').is_visible()

    # Product inventory survives complete scenario serialization and reload.
    scenario=page.evaluate("window.KNanoApp.scenario()")
    assert scenario['version']=='1.4-en'
    assert scenario['product_inventory']['input_mode']=='product_inventory'
    assert len(scenario['product_inventory']['rows'])==len(scenario['products'])
    page.evaluate("window.KNanoApp.applyScenario(window.KNanoApp.scenario(),false)")
    assert page.input_value('#marketInputMode')=='product_inventory'
    assert abs(page.evaluate("window.KNanoProductInventory.prepareStatic(window.KNanoApp.state.products).total_kg_y")-310)<1e-8

    # Dynamic product-specific trajectory enters the existing cohort engine.
    page.evaluate("window.KNanoApp.switchTab('model')")
    page.select_option('#modelMode','dynamic_probabilistic')
    page.fill('#startYear','2024')
    page.fill('#endYear','2026')
    page.evaluate("window.KNanoApp.state.dynamicSettings.start_year=2024;window.KNanoApp.state.dynamicSettings.end_year=2026;window.KNanoApp.generateProductTrajectory();")
    trajectory=page.evaluate("window.KNanoApp.state.trajectory")
    assert [r['year'] for r in trajectory]==[2024,2025,2026]
    assert all('product_inputs_kg_y' in r for r in trajectory)
    expected_2025=300*1.10*1.05*1.02+10
    assert abs(trajectory[1]['primary_input_kg_y']-expected_2025)<1e-8
    page.click('#calculateBtn')
    dynamic_closures=page.evaluate("window.KNanoApp.state.result.annual.map(r=>r.mass_balance_closure_pct)")
    assert all(abs(x-100)<1e-8 for x in dynamic_closures)
    annual=page.evaluate("window.KNanoApp.state.result.product_input.annual")
    assert len(annual)==3 and abs(annual[1]['total_kg_y']-expected_2025)<1e-8

    # Custom geography and retained advanced/multi-material workspaces remain functional.
    page.select_option('#interfaceView','all')
    page.click('#manageCustomCountryBtn')
    values={
      '#customGeoCode':'VT','#customGeoCountryName':'Version Testland','#customGeoShortName':'Testland',
      '#customGeoReferenceYear':'2025','#customGeoBasis':'v1.4 browser integration test',
      '#customGeoDomainName':'Version Testland national','#customGeoDomainId':'VT-national',
      '#customGeoPopulation':'1000000','#customGeoArea':'5000','#customGeoSewerPopulation':'800000',
      '#customGeoWwtpFlow':'30000000','#customGeoSludgeDry':'50000','#customGeoRiverFlow':'100'
    }
    for selector,value in values.items(): page.fill(selector,value)
    page.select_option('#customGeoDomainLevel','national')
    page.click('#saveCustomGeoBtn')
    assert page.input_value('#countrySelect')=='VT'
    page.click('.tab[data-tab="advanced"]'); assert page.locator('#tab-advanced').is_visible()
    page.select_option('#assessmentMode','multi')
    page.click('.tab[data-tab="mixture"]'); assert page.locator('#tab-mixture').is_visible()
    before=page.evaluate("window.KNanoMixture.state.components.length")
    page.click('#addCurrentScenarioBtn')
    captured=page.evaluate("window.KNanoMixture.state.components.at(-1)")
    assert page.evaluate("window.KNanoMixture.state.components.length")==before+1
    assert captured['definition']['product_inventory']['input_mode']=='product_inventory'
    assert captured['annual_input_kg_y']>0

    assert not errors,errors
    print(json.dumps({
      'workspaces':10,'guided_stages':5,'direct_closure_pct':direct_closure,
      'product_static_input_kg_y':static_total,'product_static_closure_pct':static_closure,
      'dynamic_closure_min_pct':min(dynamic_closures),'dynamic_closure_max_pct':max(dynamic_closures),
      'custom_country':'VT','status':'passed'
    },indent=2))
    browser.close()
