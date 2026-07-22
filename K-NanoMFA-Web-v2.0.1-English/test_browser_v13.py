"""Headless UI integration test for K-NanoMFA v1.3.

Requires Python Playwright and a Chromium executable. The test injects local assets
into an isolated page, stubs graph drawing, and verifies navigation, custom-country
creation, subnational-domain creation, deterministic calculation, scenario roundtrip,
and access to the retained mixture and advanced workspaces.
"""
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
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('console',lambda msg: errors.append(f'{msg.type}: {msg.text}') if msg.type=='error' else None)
    page.on('pageerror',lambda exc: errors.append(f'pageerror: {exc}'))
    page.on('dialog',lambda dialog:dialog.accept())
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content="window.Plotly={purge(){},react(){return Promise.resolve();},newPlot(){return Promise.resolve();},downloadImage(){return Promise.resolve();},Plots:{resize(){}}};")
    for name in ['data.js','engine.js','app.js','geography.js','advanced.js','mixture.js']:
        page.add_script_tag(path=str(ROOT/name))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(300)

    assert page.locator('[data-guide-stage]').count()==5
    page.select_option('#interfaceView','all')
    assert page.locator('.tab').count()==10
    page.select_option('#interfaceView','guided')
    page.click('#manageCustomCountryBtn')

    national={
      '#customGeoCode':'TT','#customGeoCountryName':'Test Territory','#customGeoShortName':'Test Territory',
      '#customGeoReferenceYear':'2025','#customGeoBasis':'Headless integration test',
      '#customGeoDomainName':'Test Territory national','#customGeoDomainId':'TT-national',
      '#customGeoPopulation':'1000000','#customGeoArea':'5000','#customGeoSewerPopulation':'800000',
      '#customGeoWwtpFlow':'30000000','#customGeoSludgeDry':'50000','#customGeoRiverFlow':'100'
    }
    for selector,value in national.items(): page.fill(selector,value)
    page.select_option('#customGeoDomainLevel','national')
    page.click('#saveCustomGeoBtn')
    assert page.input_value('#countrySelect')=='TT'
    assert page.input_value('#regionSelect')=='TT-national'

    page.click('#addCustomDomainBtn')
    subnational={
      '#customGeoDomainName':'Test Metro','#customGeoDomainId':'TT-metro',
      '#customGeoPopulation':'300000','#customGeoArea':'800','#customGeoSewerPopulation':'270000',
      '#customGeoWwtpFlow':'11000000','#customGeoSludgeDry':'18000','#customGeoRiverFlow':'25'
    }
    for selector,value in subnational.items(): page.fill(selector,value)
    page.select_option('#customGeoDomainLevel','subnational')
    page.click('#saveCustomGeoBtn')
    assert page.input_value('#regionSelect')=='TT-metro'

    page.fill('#totalMass','1000')
    page.evaluate("document.getElementById('calculateBtn').click()")
    closure=page.evaluate("window.KNanoApp.state.result.mass_balance_closure_pct")
    assert abs(closure-100)<1e-8
    scenario=page.evaluate("window.KNanoApp.scenario()")
    assert scenario['custom_geography']['code']=='TT'
    assert len(scenario['custom_geography']['domains'])==2
    page.evaluate("window.KNanoApp.applyScenario(window.KNanoApp.scenario(),false)")
    assert page.input_value('#countrySelect')=='TT'
    assert page.input_value('#regionSelect')=='TT-metro'

    page.select_option('#interfaceView','all')
    page.select_option('#assessmentMode','multi')
    page.click('.tab[data-tab="mixture"]')
    assert page.locator('#tab-mixture').is_visible()
    page.click('.tab[data-tab="advanced"]')
    assert page.locator('#tab-advanced').is_visible()
    assert not errors,errors
    print(json.dumps({'workspaces':10,'custom_domains':2,'mass_balance_closure_pct':closure,'status':'passed'},indent=2))
    browser.close()
