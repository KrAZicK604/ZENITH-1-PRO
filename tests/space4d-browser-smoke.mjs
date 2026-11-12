import {chromium} from "playwright";
import assert from "node:assert/strict";
const base="http://127.0.0.1:8765",browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const failures=[];
try{
 for(const [name,opts] of [["desktop",{viewport:{width:1280,height:900}}],["mobile",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
  const context=await browser.newContext(opts),page=await context.newPage();
  page.on("pageerror",e=>failures.push(name+": "+e.message));
  page.on("request",r=>{if(!r.url().startsWith(base+"/"))failures.push(name+" unexpected request: "+r.url());});
  const response=await page.goto(base+"/game-4d.html?test=1",{waitUntil:"load"});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>Boolean(window.__space4dTest));
  assert.equal(await page.evaluate(()=>window.__space4dTest.snapshot().status),"ready");
  await page.getByRole("button",{name:"Launch",exact:true}).click();
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__space4dTest.snapshot().status),"running");
  if(name==="desktop"){
   await page.keyboard.down("KeyW");
   await page.waitForTimeout(300);
   await page.keyboard.up("KeyW");
   const s=await page.evaluate(()=>window.__space4dTest.snapshot());
   assert.ok(s.p.x>55,"forward thrust must move ship in 3D");
   await page.keyboard.down("KeyD");await page.waitForTimeout(220);await page.keyboard.up("KeyD");
   const q=await page.evaluate(()=>window.__space4dTest.snapshot().q);
   assert.ok(Math.abs(q.z)>0.001,"yaw should rotate ship quaternion");
  }else{
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=1,"mobile overflow "+overflow);
   const touch=page.locator('[data-hold="throttle"]');
   assert.ok(await touch.isVisible());
   await touch.evaluate(e=>e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:9,pointerType:"touch"})));
   await page.waitForTimeout(250);
   await touch.evaluate(e=>e.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:9,pointerType:"touch"})));
   assert.ok((await page.evaluate(()=>window.__space4dTest.snapshot())).p.x>55);
  }
  await page.getByRole("button",{name:"Pause",exact:true}).click();
  const paused=await page.evaluate(()=>window.__space4dTest.snapshot());
  assert.equal(paused.status,"paused");
  await page.waitForTimeout(120);
  assert.equal((await page.evaluate(()=>window.__space4dTest.snapshot())).t,paused.t);
  await page.getByRole("button",{name:"Restart"}).click();
  const restarted=await page.evaluate(()=>window.__space4dTest.snapshot());
  assert.equal(restarted.boosts,3);
  assert.equal(restarted.status,"running");
  await context.close();
  console.log("4D_BROWSER_PASS",name);
 }
 assert.deepEqual(failures,[]);
}finally{await browser.close();}
