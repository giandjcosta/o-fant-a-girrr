from playwright.sync_api import sync_playwright
import sys
bad=[]
with sync_playwright() as p:
 for browser_name in ('chromium','webkit'):
  browser=getattr(p,browser_name).launch(headless=True)
  for path in ('girrr/app.html','stadio/girrr/app.html'):
   for width in (320,390,768,1440):
    page=browser.new_page(viewport={'width':width,'height':900})
    page.add_init_script("""localStorage.setItem('fg',JSON.stringify({team:'Oranje VC',code:'TEST-QA'}))""")
    try:
     page.goto('http://127.0.0.1:8765/'+path+'#carriera',wait_until='domcontentloaded',timeout=30000)
     page.locator('.trust-visual').wait_for(timeout=14000)
     ar=page.locator('.trust-visual')
     a=ar.get_attribute('data-target')
     assert a is not None and 0<=float(a)<=100
     assert page.locator('.trust-visual circle').count()==0
     assert page.locator('#fg').input_value()=='2'
     assert page.locator('#fg option').count()>=6
     assert page.locator('#fp').count()==1
     opts=page.locator('#cteam option').all_text_contents()
     second=next(t for t in opts if t!='Oranje VC')
     page.locator('#cteam').select_option(label=second)
     page.wait_for_timeout(650)
     assert page.locator('.trust-visual').count()==1
     assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
     print('PASS',browser_name,path,width,second)
    except Exception as e:
     print('FAIL',browser_name,path,width,str(e)[:400]);bad.append((browser_name,path,width,str(e)))
    page.close()
  browser.close()
print('QA',len(bad),'failures');sys.exit(1 if bad else 0)
