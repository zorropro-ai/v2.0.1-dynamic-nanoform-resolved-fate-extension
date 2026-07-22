import re, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet"[^>]*>',f'<style>{css}</style>',html)
html=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',html)
with sync_playwright() as p:
    args={'headless':True,'args':['--no-sandbox','--disable-gpu']}
    exe=shutil.which('chromium') or shutil.which('google-chrome')
    if exe: args['executable_path']=exe
    browser=p.chromium.launch(**args)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.on('dialog',lambda d:d.accept())
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content="window.Plotly={purge(){},react(){return Promise.resolve();},newPlot(){return Promise.resolve();},downloadImage(){return Promise.resolve();},Plots:{resize(){}}};")
    for name in ['data.js','engine.js','product_inventory.js','app.js','geography.js','advanced.js','mixture.js','nanoform.js']:
        page.add_script_tag(path=str(ROOT/name))
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded'))")
    page.wait_for_timeout(350)
    page.select_option('#interfaceView','all')
    page.evaluate("window.KNanoApp.switchTab('quality')")
    page.check('#nanoformEnabled')
    page.select_option('#nanoformMaterialPreset','dissolving_metal')
    page.select_option('#nanoformEmbeddingPreset','surface_coating')
    page.click('#applyNanoformPresetBtn')
    page.locator('#tab-quality .nanoform-panel').scroll_into_view_if_needed()
    page.wait_for_timeout(100)
    page.screenshot(path=str(ROOT/'SCREENSHOT_v1.5_nanoform_configuration.png'),full_page=False)
    page.fill('#totalMass','1000')
    page.evaluate("window.KNanoApp.calculate()")
    page.wait_for_timeout(250)
    page.locator('#nanoformResultsPanel').scroll_into_view_if_needed()
    page.screenshot(path=str(ROOT/'SCREENSHOT_v1.5_nanoform_results.png'),full_page=False)
    page.set_viewport_size({'width':480,'height':900})
    page.evaluate("window.KNanoApp.switchTab('quality')")
    page.locator('#tab-quality .nanoform-panel').scroll_into_view_if_needed()
    page.screenshot(path=str(ROOT/'SCREENSHOT_v1.5_mobile.png'),full_page=False)
    browser.close()
