import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],foreign=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({
   viewport:mobile?{width:390,height:844}:{width:1280,height:900},
   isMobile:mobile,hasTouch:mobile
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
   if(!r.url().startsWith('http://127.0.0.1:8765/'))foreign.push(r.url());
  });
  const response=await page.goto('http://127.0.0.1:8765/game-4d.html?test=1');
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__flight4DTest);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).phase,'ready');
  await page.getByRole('button',{name:'Launch 3D flight'}).click();
  await page.waitForTimeout(180);
  const pre=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.ok(pre.ticks>0);
  await page.getByRole('button',{name:'Explore real planetary system'}).click();
  await page.waitForFunction(()=>window.__flight4DTest.planets().loaded,{timeout:15000});
  const astro=await page.evaluate(()=>window.__flight4DTest.planets());
  assert.equal(astro.active,true);
  assert.equal(astro.sampleCount,241);
  const flightTicks=(await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks;
  await page.waitForTimeout(180);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks,flightTicks,
    'arcade flight must not continue behind planet map');
  await page.locator('#planetDate').fill('2026-11-14T00:00');
  await page.getByRole('button',{name:'Set UTC'}).click();
  let a=await page.evaluate(()=>window.__flight4DTest.planets());
  assert.equal(a.status,'VERIFIED_SOURCE_INTERPOLATED');
  assert.ok(a.distances.earthMoon>340000&&a.distances.earthMoon<410000);
  assert.match(await page.locator('#planetRanges').textContent(),/Earth–Mars.*km/);
  await page.locator('#planetDate').fill('2026-12-14T00:00');
  await page.getByRole('button',{name:'Set UTC'}).click();
  const b=await page.evaluate(()=>window.__flight4DTest.planets());
  assert.ok(Math.abs(b.distances.earthMars-a.distances.earthMars)>1e7,
    'positions must vary with real UTC');
  await page.locator('#planetView').selectOption('earthMoon');
  await page.locator('#planetFocus').selectOption('moon');
  await page.locator('#planetTrueRadius').check();
  await page.waitForTimeout(90);
  const map=await page.evaluate(()=>window.__flight4DTest.planets());
  assert.equal(map.view,'earthMoon');assert.equal(map.focus,'moon');
  assert.equal(map.trueSize,true);
  await page.screenshot({path:mobile?'artifacts/planet-time-mobile.png':'artifacts/planet-time-desktop.png',fullPage:true});
  await page.locator('#planetWarp').selectOption('86400');
  await page.getByRole('button',{name:'Advance astronomical time'}).click();
  const before=await page.evaluate(()=>window.__flight4DTest.planets().epochMs);
  await page.waitForTimeout(250);
  const after=await page.evaluate(()=>window.__flight4DTest.planets().epochMs);
  assert.ok(after>before+1000000,'time should accelerate by actual UTC seconds');
  await page.getByRole('button',{name:'Pause astronomical time'}).click();
  await page.locator('#planetDate').fill('2027-04-01T00:00');
  await page.getByRole('button',{name:'Set UTC'}).click();
  await page.waitForTimeout(90);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.planets())).status,
    'ABSTAIN_OUTSIDE_VERIFIED_EPOCHS');
  await page.getByRole('button',{name:'Return to 4D spaceship flight'}).click();
  assert.equal((await page.evaluate(()=>window.__flight4DTest.planets())).active,false);
  await page.waitForTimeout(150);
  assert.ok((await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks>flightTicks,
    'arcade should resume on return');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,'viewport overflow '+overflow);
  await context.close();
 }
 assert.deepEqual(errors,[],'all browser JS errors');
 assert.deepEqual(foreign,[],'no external network calls');
 console.log('JPL_PLANET_BROWSER_PASS desktop/mobile, real time, 10 bodies, 1:1 scale, time warp, no extrapolation, ship pause and resume, no JS/network errors');
}finally{await browser.close();}
