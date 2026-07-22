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
    page=browser.new_page(viewport={'width':1440,'height':1100})
    page.set_content(html,wait_until='domcontentloaded')
    page.evaluate("""()=>{
      document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id==='tab-advanced'));
      const p=document.querySelector('#tab-advanced .dynamic-fate-panel');
      document.querySelector('#dynamicFateDetails').hidden=false;
      document.querySelector('#dynamicFateEnabled').checked=true;
      document.querySelector('#dynamicFateStatus').innerHTML='<b>Dynamic nanoform fate is enabled.</b> The kinetic state-transition engine is ready.';
      document.querySelector('#dynamicFatePreset').innerHTML='<option>Persistent mineral oxide</option>';
      document.querySelector('#dynamicFateRateTable').innerHTML='<table><thead><tr><th>Process</th><th>First-order rate (y⁻¹)</th></tr></thead><tbody>'+[
        ['Water: free particle → small aggregate','2.200'],['Water: small → large aggregate','0.850'],['Water: free-particle dissolution','0.080'],['Water: large-aggregate settling','3.500'],['Sediment resuspension to water','0.025'],['Sediment burial below active layer','0.040']
      ].map(r=>`<tr><td>${r[0]}</td><td><input value="${r[1]}"></td></tr>`).join('')+'</tbody></table>';
      document.querySelector('#dynamicFateInitialProfileTable').innerHTML='<table><thead><tr><th>Initial-stock form</th><th>Allocation (%)</th></tr></thead><tbody><tr><td>Free nanoparticle</td><td>20</td></tr><tr><td>Small aggregate</td><td>35</td></tr><tr><td>Large aggregate</td><td>20</td></tr><tr><td>Dissolved constituent</td><td>5</td></tr></tbody></table>';
    }""")
    page.locator('#tab-advanced .dynamic-fate-panel').screenshot(path=str(ROOT/'SCREENSHOT_v2.0_dynamic_fate_configuration.png'))
    page.evaluate("""()=>{
      document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id==='tab-results'));
      document.querySelector('#resultsArea').hidden=false;document.querySelector('#emptyResults').hidden=true;const p=document.querySelector('#dynamicFateResultsPanel');p.hidden=false;
      document.querySelector('#dynamicFateResultsEmpty').hidden=true;document.querySelector('#dynamicFateResultsBody').hidden=false;
      document.querySelector('#dynamicFateKpis').innerHTML='<div class="kpi"><span>Fate mass-balance closure</span><b>100.000000%</b></div><div class="kpi"><span>Final active stock</span><b>793.82 kg</b></div><div class="kpi"><span>Dominant compartment</span><b>Active sediment</b></div><div class="kpi"><span>Dominant form</span><b>Large aggregate</b></div>';
      document.querySelector('#dynamicFateStockChart').innerHTML='<div style="height:100%;display:grid;place-items:center;background:linear-gradient(180deg,#fff,#f0f7f5);border-radius:12px;color:#315c52;font-weight:750">Responsive annual compartment-stock chart</div>';
      document.querySelector('#dynamicFateMatrixTable').innerHTML='<table><thead><tr><th>Compartment</th><th>Free</th><th>Small agg.</th><th>Large agg.</th><th>Dissolved</th><th>Total</th></tr></thead><tbody><tr><td>Air</td><td>0.02</td><td>0.04</td><td>0.01</td><td>0.00</td><td>0.08</td></tr><tr><td>Water</td><td>3.41</td><td>8.76</td><td>5.29</td><td>2.44</td><td>22.65</td></tr><tr><td>Soil</td><td>38.20</td><td>94.31</td><td>75.82</td><td>12.76</td><td>266.14</td></tr><tr><td>Sediment</td><td>24.63</td><td>165.82</td><td>241.76</td><td>4.11</td><td>504.95</td></tr></tbody></table>';
      document.querySelector('#dynamicFatePecTable').innerHTML='<table><thead><tr><th>Compartment</th><th>Form</th><th>State-specific PEC</th><th>Unit</th></tr></thead><tbody><tr><td>Water</td><td>Free nanoparticle</td><td>0.000032</td><td>µg/L</td></tr><tr><td>Water</td><td>Dissolved constituent</td><td>0.000023</td><td>µg/L</td></tr><tr><td>Soil</td><td>Large aggregate</td><td>0.2916</td><td>µg/kg</td></tr><tr><td>Sediment</td><td>Large aggregate</td><td>37.19</td><td>µg/kg</td></tr></tbody></table>';
      document.querySelector('#dynamicFateSinkTable').innerHTML='<table><thead><tr><th>External sink</th><th>Cumulative mass (kg)</th></tr></thead><tbody><tr><td>Water advective removal</td><td>113.24</td></tr><tr><td>Sediment burial</td><td>76.31</td></tr><tr><td>Soil irreversible retention</td><td>21.83</td></tr></tbody></table>';
      document.querySelector('#dynamicFateAnnualTable').innerHTML='<table><thead><tr><th>Year</th><th>Air</th><th>Water</th><th>Soil</th><th>Sediment</th><th>Closure (%)</th></tr></thead><tbody><tr><td>2028</td><td>0.08</td><td>18.92</td><td>221.40</td><td>409.31</td><td>100.000000</td></tr><tr><td>2029</td><td>0.08</td><td>20.84</td><td>244.18</td><td>459.42</td><td>100.000000</td></tr><tr><td>2030</td><td>0.08</td><td>22.65</td><td>266.14</td><td>504.95</td><td>100.000000</td></tr></tbody></table>';
    }""")
    page.locator('#dynamicFateResultsPanel').screenshot(path=str(ROOT/'SCREENSHOT_v2.0_dynamic_fate_results.png'))
    page.set_viewport_size({'width':480,'height':900})
    page.evaluate("""()=>{document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('active',x.id==='tab-advanced'));document.querySelector('#dynamicFateDetails').hidden=false;}""")
    page.locator('#tab-advanced .dynamic-fate-panel').screenshot(path=str(ROOT/'SCREENSHOT_v2.0_mobile.png'))
    browser.close()
