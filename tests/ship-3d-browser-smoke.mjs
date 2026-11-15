import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader'
]});
const errors=[],foreign=[];
const origin='http://127.0.0.1:8765';
async function clickCamera(page,mode){
 await page.locator('[data-ship-view="'+mode+'"]').click();
 const data=await page.evaluate(()=>window.__flight4DTest.webgl());
 assert.equal(data.view,mode);
}
try{
 for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},
    isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',req=>{if(!req.url().startsWith(origin+'/')&&!req.url().startsWith('data:'))foreign.push(req.url());});
  const response=await page.goto(origin+'/game-4d.html?test=1');
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__flight4DTest?.webgl);
  await page.waitForFunction(()=>window.__flight4DTest.webgl().frameCount>2,{timeout:15000});
  const initial=await page.evaluate(()=>window.__flight4DTest.webgl());
  assert.equal(initial.available,true,'actual WebGL2 is required in the test environment');
  assert.equal(initial.genuine3d,true);
  assert.equal(initial.thrusters,3);
  assert.ok(initial.triangles>800);
  assert.ok(initial.exhaustTriangles>300);
  assert.equal(initial.timeDimension,'simulation_time_seconds');
  assert.ok(!await page.locator('#ship3dScene').isHidden());
  assert.ok(await page.locator('#scene').isHidden());
  assert.ok((await page.locator('#ship3dStatus').textContent()).includes('GENUINE 3D'));
  await page.screenshot({path:mobile?'artifacts/ship3d-mobile-rear.png':'artifacts/ship3d-desktop-rear.png',fullPage:true});
  await clickCamera(page,'top');
  await clickCamera(page,'side');
  await clickCamera(page,'front');
  await clickCamera(page,'orbit');
  await page.locator('#ship3dWire').click();
  assert.equal((await page.evaluate(()=>window.__flight4DTest.webgl())).wireframe,true);
  await page.locator('#ship3dSlices').click();
  assert.equal((await page.evaluate(()=>window.__flight4DTest.webgl())).timeSlices,false);
  await page.locator('#ship3dSlices').click();
  await page.locator('#ship3dWire').click();
  await page.screenshot({path:mobile?'artifacts/ship3d-mobile-orbit.png':'artifacts/ship3d-desktop-orbit.png',fullPage:true});
  await page.getByRole('button',{name:'Launch 3D flight'}).click();
  await page.waitForTimeout(170);
  const before=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(before.phase,'running');
  if(mobile){
   const control=page.locator('[data-axis="right"]');
   await control.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{
    pointerId:3,pointerType:'touch',bubbles:true
   })));
   await page.waitForTimeout(360);
   await control.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{
    pointerId:3,pointerType:'touch',bubbles:true
   })));
  }else{
   await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');
  }
  const after=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.ok(after.y>before.y);
  assert.ok(after.ticks>before.ticks);
  // Camera/inspection buttons must not change the underlying physics state.
  const sim=await page.evaluate(()=>window.__flight4DTest.snapshot());
  await clickCamera(page,'chase');
  const afterButton=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(afterButton.boosts,sim.boosts);
  assert.equal(afterButton.phase,sim.phase);
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await page.evaluate(()=>window.__flight4DTest.snapshot());
  await page.waitForTimeout(145);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks,paused.ticks);
  await page.getByRole('button',{name:'Explore real planetary system'}).click();
  await page.waitForFunction(()=>window.__flight4DTest.planets().loaded,{timeout:15000});
  assert.equal((await page.evaluate(()=>window.__flight4DTest.planets())).active,true);
  assert.ok(await page.locator('#ship3dScene').isHidden());
  assert.ok(!await page.locator('#scene').isHidden());
  await page.locator('#planetDate').fill('2026-11-15T00:00');
  await page.getByRole('button',{name:'Set UTC'}).click();
  assert.equal((await page.evaluate(()=>window.__flight4DTest.planets())).status,'VERIFIED_SOURCE_INTERPOLATED');
  await page.getByRole('button',{name:'Return to 4D spaceship flight'}).click();
  assert.ok(!await page.locator('#ship3dScene').isHidden());
  assert.ok(await page.locator('#scene').isHidden());
  await page.locator('#ship3dArt').click();
  assert.ok(await page.locator('#ship3dScene').isHidden());
  assert.ok(!await page.locator('#scene').isHidden());
  await page.locator('#ship3dArt').click();
  assert.ok(!await page.locator('#ship3dScene').isHidden());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,'unexpected horizontal overflow '+overflow);
  const ok=await page.evaluate(()=>window.__flight4DTest.webgl());
  assert.ok(ok.frameCount>20);
  assert.equal(ok.available,true);
  await ctx.close();
 }
 // Fallback test on explicitly disabled WebGL2: legacy cinematic ship remains.
 const ctx=await browser.newContext({viewport:{width:1140,height:800}});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/game-4d.html?test=1&force2D=1');
 await page.waitForFunction(()=>!!window.__flight4DTest);
 assert.equal((await page.evaluate(()=>window.__flight4DTest.webgl())).available,false);
 assert.ok(await page.locator('#ship3dScene').isHidden());
 assert.ok(!await page.locator('#scene').isHidden());
 await page.waitForFunction(()=>window.__flight4DTest.art().loaded,{timeout:15000});
 await page.getByRole('button',{name:'Launch 3D flight'}).click();
 await page.waitForTimeout(120);
 assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).phase,'running');
 await ctx.close();
 assert.deepEqual(errors,[],'no JS/runtime/console errors');
 assert.deepEqual(foreign,[],'no external network requests');
 console.log('Genuine 3D WebGL2 ship: desktop/mobile triangles, 3 engines, 5 cameras, time/wire views, arcade/planetarium isolation, no overflow or remote resources; fallback OK');
}finally{await browser.close();}
