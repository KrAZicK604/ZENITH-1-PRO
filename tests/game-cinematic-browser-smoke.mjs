import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],outside=[];
const origin='http://127.0.0.1:8765';
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({
   viewport:mobile?{width:390,height:844}:{width:1280,height:900},
   isMobile:mobile,hasTouch:mobile
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
   if(!r.url().startsWith(origin+'/')&&!r.url().startsWith('data:'))outside.push(r.url());
  });
  const response=await page.goto(origin+'/game-4d.html?test=1');
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.__flight4DTest?.art().loaded,{timeout:12000});
  const art=await page.evaluate(()=>window.__flight4DTest.art());
  assert.equal(art.width,510);
  assert.equal(art.height,245);
  // Black, not navy: no fullscreen blue gradient in the empty upper corner.
  const pixel=await page.locator('#scene').evaluate(canvas=>
    Array.from(canvas.getContext('2d').getImageData(5,250,1,1).data));
  assert.ok(pixel[0]<25&&pixel[1]<25&&pixel[2]<25,
   'background must be nearly black: '+pixel);
  assert.equal(await page.evaluate(()=>window.__flight4DTest.snapshot().phase),'ready');
  await page.getByRole('button',{name:'Launch 3D flight'}).click();
  await page.waitForTimeout(120);
  const before=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(before.phase,'running');
  if(mobile){
   const control=page.locator('[data-axis="right"]');
   await control.evaluate(b=>b.dispatchEvent(new PointerEvent('pointerdown',{
    bubbles:true,pointerId:7,pointerType:'touch'
   })));
   await page.waitForTimeout(220);
   await control.evaluate(b=>b.dispatchEvent(new PointerEvent('pointerup',{
    bubbles:true,pointerId:7,pointerType:'touch'
   })));
  }else{
   await page.keyboard.down('KeyD');await page.waitForTimeout(220);
   await page.keyboard.up('KeyD');
  }
  const after=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.ok(after.y>before.y,'real physics should respond to steering');
  assert.ok(after.ticks>before.ticks);
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(paused.phase,'paused');
  await page.waitForTimeout(100);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks,paused.ticks);
  await page.getByRole('button',{name:'Resume'}).click();
  await page.getByRole('button',{name:'Restart'}).click();
  const restarted=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(restarted.phase,'running');
  assert.equal(restarted.boosts,3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),
   'horizontal overflow');
  await page.screenshot({path:mobile?'artifacts/cinematic-4d-mobile.png':'artifacts/cinematic-4d-desktop.png',fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(outside,[]);
 console.log('CINEMATIC_4D_PASS: real concept ship asset decoded, near-black field, desktop/mobile controls, pause/restart, no JS errors or external requests');
}finally{await browser.close();}
