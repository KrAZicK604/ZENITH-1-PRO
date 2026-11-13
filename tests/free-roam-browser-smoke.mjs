import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],outside=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 for(const mobile of [false,true]){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},
    isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(!req.url().startsWith('http://127.0.0.1:8765/'))outside.push(req.url());});
  const response=await page.goto('http://127.0.0.1:8765/free-roam.html?test=1');
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>!!window.__roamTest);
  const initial=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.equal(initial.phase,'ready');assert.equal(initial.speed,0);assert.equal(initial.throttle,0);
  await page.getByRole('button',{name:'Enter Free Roam'}).click();
  await page.waitForTimeout(160);
  const idle=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.equal(idle.phase,'running');assert.ok(idle.ticks>1);assert.equal(idle.x,340);
  assert.equal(idle.speed,0);
  if(mobile){
   const b=page.locator('[data-hold="throttleUp"]');
   await b.evaluate(x=>x.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch'})));
   await page.waitForTimeout(700);
   await b.evaluate(x=>x.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch'})));
  }else{
   await page.keyboard.down('ArrowUp');await page.waitForTimeout(700);await page.keyboard.up('ArrowUp');
  }
  const moving=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.ok(moving.throttle>0,'throttle must respond');
  assert.ok(moving.x>idle.x,'ship should advance in free space');
  await page.getByRole('button',{name:'Cut engines'}).click();
  await page.waitForTimeout(120);
  const cutting=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.equal(cutting.throttle,0);
  const x1=cutting.x;
  await page.waitForTimeout(320);
  const coasting=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.ok(coasting.x>x1,'inertial coast must persist after engine cut');
  assert.ok(Math.abs(coasting.speed-cutting.speed)<.01,'inertial velocity should be conserved');
  await page.getByRole('button',{name:'Target: Moon'}).click();
  await page.waitForTimeout(85);
  assert.equal((await page.evaluate(()=>window.__roamTest.snapshot())).target,'mars');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const stopped=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.equal(stopped.phase,'paused');
  await page.waitForTimeout(130);
  assert.equal((await page.evaluate(()=>window.__roamTest.snapshot())).ticks,stopped.ticks);
  await page.getByRole('button',{name:'Resume'}).click();
  await page.getByRole('button',{name:'Restart at Earth'}).click();
  const reset=await page.evaluate(()=>window.__roamTest.snapshot());
  assert.equal(reset.phase,'running');
  assert.equal(reset.throttle,0);
  assert.equal(reset.x,340);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(overflow<=1,'mobile/desktop overflow '+overflow);
  await page.screenshot({path:'artifacts/free-roam-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);
 assert.deepEqual(outside,[]);
 console.log('FREEROAM_BROWSER_PASS: desktop and touch, idle, powered move, coast, target selection, pause/resume, restart; no JS errors, no external requests');
}finally{await browser.close();}
