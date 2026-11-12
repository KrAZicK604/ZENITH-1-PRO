import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],external=[];
try{
 for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8765/'))external.push(r.url());});
  const response=await page.goto('http://127.0.0.1:8765/game-ace.html',{waitUntil:'load'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.getElementById('astroEM').textContent.includes('km'));
  const em=await page.locator('#astroEM').textContent();
  const er=await page.locator('#astroER').textContent();
  const mr=await page.locator('#astroMR').textContent();
  assert.match(em,/404,141 km/);
  assert.match(er,/200,669,748 km/);
  assert.match(mr,/200,846,504 km/);
  await page.locator('#astroEpoch').selectOption('2026-11-26T00:00:00Z');
  assert.match(await page.locator('#astroEM').textContent(),/359,348 km/);
  assert.match(await page.locator('#astroER').textContent(),/182,682,984 km/);
  assert.match(await page.locator('#astroMR').textContent(),/182,541,904 km/);
  assert.match(await page.locator('#astroStatus').textContent(),/Moshier analytic/);
  assert.equal(await page.locator('#astroEpoch option').count(),5);
  if(mobile)assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
  await page.screenshot({path:mobile?'artifacts/astro-mobile.png':'artifacts/astro-desktop.png',fullPage:true});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log('ASTRO_BROWSER_PASS: date selection, 3 distances, mobile, offline and no runtime errors');
}finally{await browser.close();}
