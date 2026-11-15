import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],requests=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8765/'))requests.push(r.url());});
  const response=await page.goto('http://127.0.0.1:8765/game-4d.html?test=1');
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__flight4DTest);
  assert.equal(await page.evaluate(()=>window.__flight4DTest.snapshot().phase),'ready');
  await page.getByRole('button',{name:'Launch 3D flight'}).click();
  await page.waitForTimeout(160);
  const first=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(first.phase,'running');
  assert.ok(first.ticks>1);
  if(mobile){
   const up=page.getByRole('button',{name:'Ascend +Z'});
   await up.evaluate(b=>b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch'})));
   await page.waitForTimeout(260);
   await up.evaluate(b=>b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch'})));
   assert.ok((await page.evaluate(()=>window.__flight4DTest.snapshot())).z>0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'mobile horizontal overflow');
  }else{
   await page.keyboard.down('KeyD');
   await page.waitForTimeout(200);
   await page.keyboard.up('KeyD');
   assert.ok((await page.evaluate(()=>window.__flight4DTest.snapshot())).y>0);
  }
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const paused=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(paused.phase,'paused');
  await page.waitForTimeout(150);
  assert.equal((await page.evaluate(()=>window.__flight4DTest.snapshot())).ticks,paused.ticks);
  await page.getByRole('button',{name:'Resume'}).click();
  await page.getByRole('button',{name:'Restart'}).click();
  const restarted=await page.evaluate(()=>window.__flight4DTest.snapshot());
  assert.equal(restarted.boosts,3);
  assert.equal(restarted.phase,'running');
  await page.screenshot({path:mobile?'artifacts/4d-mobile.png':'artifacts/4d-desktop.png',fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(requests,[]);
 console.log('4D_BROWSER_PASS desktop keyboard, mobile altitude touch, pause, restart, no JS errors, no external requests');
}finally{await browser.close();}
