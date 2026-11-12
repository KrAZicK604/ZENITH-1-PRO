import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],unexpected=[];
mkdirSync('artifacts',{recursive:true});
const contexts=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},
   isMobile:mobile,hasTouch:mobile});
  contexts.push(context);
  const page=await context.newPage();
  const label=mobile?'mobile':'desktop';
  page.on('pageerror',e=>errors.push(label+': '+e.message));
  page.on('request',r=>{if(!r.url().startsWith(origin+'/'))unexpected.push(label+': '+r.url());});
  const response=await page.goto(origin+'/game-ace.html?test=1',{waitUntil:'load'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__realNavTest&&!!window.__aceTest);
  assert.equal(await page.locator('#navDate option').count(),32);
  let values=await page.evaluate(()=>window.__realNavTest.snapshot());
  assert.equal(values.day,'2026-11-12');
  assert.equal(values.earthMoon,'404,167 km');
  assert.equal(values.earthMars,'200,668,210 km');
  assert.equal(values.moonMars,'200,845,354 km');
  assert.ok(values.source.includes('JPL HORIZONS'));
  assert.ok(await page.locator('#moonXYZ').innerText());
  assert.ok(await page.locator('#marsXYZ').innerText());
  await page.locator('#navRoute').selectOption('moonMars');
  assert.ok((await page.locator('#navSelected').innerText()).includes('MOON → MARS'));
  assert.ok((await page.locator('#navBearing').innerText()).includes('Dec'));
  await page.locator('#navDate').selectOption('2026-11-13');
  values=await page.evaluate(()=>window.__realNavTest.snapshot());
  assert.equal(values.day,'2026-11-13');
  assert.notEqual(values.earthMars,'200,668,210 km');
  await page.locator('#navDate').selectOption('2026-11-12');
  await page.getByRole('button',{name:'Launch spacecraft'}).click();
  await page.waitForTimeout(180);
  const before=await page.evaluate(()=>window.__aceTest.snapshot());
  assert.equal(before.phase,'running');
  const firstDate=await page.locator('#navDate').inputValue();
  await page.locator('#navRoute').selectOption('earthMoon');
  assert.equal(await page.locator('#navDate').inputValue(),firstDate);
  const after=await page.evaluate(()=>window.__aceTest.snapshot());
  assert.equal(after.phase,'running');
  assert.ok(after.ticks>=before.ticks,'catalog selection must not restart/alter flight engine');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,label+' horizontal overflow: '+overflow);
  const pix=await page.locator('#navGeometry').evaluate(canvas=>{
   const c=canvas.getContext('2d'),p=c.getImageData(180,120,1,1).data;
   return p[0]+p[1]+p[2];
  });
  assert.ok(pix>0,'navigation projection canvas should be drawn');
  await page.screenshot({path:'artifacts/jpl-nav-'+label+'.png',fullPage:true});
  console.log('NAV_BROWSER_PASS '+label+': JPL 3 distances, date selection, source, vector, bearing, route, flight independence, projection, no overflow');
 }
 assert.deepEqual(errors,[],'unhandled Javascript browser errors');
 assert.deepEqual(unexpected,[],'unexpected external network requests');
 console.log('NAV_BROWSER_TOTAL_PASS 2 Chromium viewport configurations, zero page JS errors, zero third-party requests');
}finally{
 for(const c of contexts)await c.close();
 await browser.close();
}
