import {ACE,createAce,startAce,pauseAce,resetAce,stepAce,simulationTime,speed,selectedTarget} from './ace-flight-core.mjs';
import {renderAce} from './ace-flight-render.mjs';
const $=id=>document.getElementById(id);
const canvas=$('aceScene'),ctx=canvas.getContext('2d',{alpha:false});
let flight=createAce(),last=null,acc=0,frames=0,assistQueued=false,targetQueued=false,pulseQueued=false;
let lastGamepadButtons={a:false,x:false,y:false,pause:false};
const held={pitchUp:false,pitchDown:false,yawLeft:false,yawRight:false,rollLeft:false,rollRight:false,
 throttleUp:false,throttleDown:false,afterburner:false,brake:false,strafeLeft:false,strafeRight:false,liftUp:false,liftDown:false};
const keys={KeyW:'pitchUp',KeyS:'pitchDown',KeyA:'yawLeft',KeyD:'yawRight',KeyQ:'rollLeft',KeyE:'rollRight',
 ArrowUp:'throttleUp',ArrowDown:'throttleDown',ShiftLeft:'afterburner',ShiftRight:'afterburner',
 KeyB:'brake',KeyJ:'strafeLeft',KeyL:'strafeRight',KeyU:'liftUp',KeyO:'liftDown'};
function clearHeld(){for(const k in held)held[k]=false;assistQueued=false;targetQueued=false;pulseQueued=false;document.querySelectorAll('[data-control].pressed').forEach(b=>b.classList.remove('pressed'));}
function focusGame(){canvas.focus({preventScroll:true});}
function launch(){if(flight.phase==='ready')startAce(flight);focusGame();}
function restart(){flight=resetAce(flight);clearHeld();acc=0;last=null;lastGamepadButtons={a:false,x:false,y:false,pause:false};startAce(flight);focusGame();}
function togglePause(){clearHeld();pauseAce(flight);acc=0;focusGame();}
function pauseIfHidden(){clearHeld();if(flight.phase==='running')pauseAce(flight);acc=0;}
$('launch').addEventListener('click',launch);
$('reset').addEventListener('click',restart);
$('pause').addEventListener('click',togglePause);
$('assist').addEventListener('click',()=>{if(flight.phase==='running')assistQueued=true;focusGame();});
$('target').addEventListener('click',()=>{if(flight.phase==='running')targetQueued=true;focusGame();});
$('pulse').addEventListener('click',()=>{if(flight.phase==='running')pulseQueued=true;focusGame();});
document.addEventListener('keydown',e=>{
 const active=e.target;
 if(active instanceof HTMLElement&&active.closest('input,textarea,select,button,a'))return;
 if(keys[e.code]){e.preventDefault();held[keys[e.code]]=true;}
 else if(e.code==='Space'){e.preventDefault();if(!e.repeat)pulseQueued=true;}
 else if(e.code==='KeyF'){e.preventDefault();if(!e.repeat)assistQueued=true;}
 else if(e.code==='KeyT'){e.preventDefault();if(!e.repeat)targetQueued=true;}
 else if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)togglePause();}
 else if(e.code==='Enter'&&flight.phase==='ready'){e.preventDefault();launch();}
});
document.addEventListener('keyup',e=>{if(keys[e.code]){held[keys[e.code]]=false;e.preventDefault();}});
document.querySelectorAll('[data-control]').forEach(b=>{
 const code=b.dataset.control;
 b.addEventListener('pointerdown',e=>{
  if(flight.phase!=='running')return;
  e.preventDefault();
  if(code==='target')targetQueued=true;
  else if(code==='assist')assistQueued=true;
  else if(code==='pulse')pulseQueued=true;
  else held[code]=true;
  b.classList.add('pressed');
  try{b.setPointerCapture(e.pointerId);}catch{}
 });
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{
  if(Object.hasOwn(held,code))held[code]=false;b.classList.remove('pressed');
 });
});
window.addEventListener('blur',pauseIfHidden);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseIfHidden();});
const dz=x=>Math.abs(x)<.14?0:Math.max(-1,Math.min(1,x));
function readGamepad(){
 const pads=typeof navigator.getGamepads==='function'?navigator.getGamepads():[];
 const pad=Array.from(pads||[]).find(p=>p&&p.connected);
 if(!pad){lastGamepadButtons={a:false,x:false,y:false,pause:false};return{};}
 const key=i=>Boolean(pad.buttons[i]?.pressed);
 const now={a:key(0),x:key(2),y:key(3),pause:key(9)};
 if(now.a&&!lastGamepadButtons.a)pulseQueued=true;
 if(now.x&&!lastGamepadButtons.x)targetQueued=true;
 if(now.y&&!lastGamepadButtons.y)assistQueued=true;
 if(now.pause&&!lastGamepadButtons.pause)togglePause();
 lastGamepadButtons=now;
 // Left stick controls yaw/pitch, right X banks, right Y changes throttle;
 // triggers command brake/afterburner, shoulders command 6DOF strafe.
 return {yawAxis:dz(pad.axes[0]??0),pitchAxis:dz(-(pad.axes[1]??0)),
  rollAxis:dz(pad.axes[2]??0),
  throttleUp:(pad.axes[3]??0)<-.35,throttleDown:(pad.axes[3]??0)>.35,
  afterburner:key(7),brake:key(6),strafeLeft:key(4),strafeRight:key(5)};
}
function updateHud(){
 const s=flight.ship;
 $('phase').textContent=flight.phase.toUpperCase();
 $('phase').dataset.phase=flight.phase;
 $('time').textContent=simulationTime(flight).toFixed(1)+'s';
 $('velocity').textContent=Math.round(speed(flight))+' gu/s';
 $('shield').textContent=Math.round(s.shield)+'%';
 $('thermal').textContent=Math.round(s.heat*100)+'%';
 $('throttle').textContent=Math.round(s.throttle*100)+'%';
 $('attitude').textContent=[s.pitch,s.yaw,s.roll].map(x=>Math.round(x*180/Math.PI)+'°').join(' / ');
 $('assist').textContent='Flight assist: '+(s.assist?'ON':'OFF');
 $('target').textContent='Target: '+selectedTarget(flight);
 $('pulse').textContent='Maneuver pulse ('+flight.boosts+')';
 $('pause').disabled=!['running','paused'].includes(flight.phase);
 $('pause').textContent=flight.phase==='paused'?'Resume':'Pause';
 $('launch').disabled=flight.phase!=='ready';
 $('assist').disabled=flight.phase!=='running';$('target').disabled=flight.phase!=='running';$('pulse').disabled=flight.phase!=='running';
 $('targetQuality').textContent=flight.targetStatus+' / '+Math.round(flight.targetQuality*100)+'%';
 $('position').textContent='X '+s.x.toFixed(0)+' · Y '+s.y.toFixed(0)+' · Z '+s.z.toFixed(0);
 const msgs={ready:'Systems check complete. Launch when ready.',
  running:s.shield<50?'Warning: shields reduced. Avoid contacts.':'Navigate the asteroid field and reach Mars.',
  paused:'Simulation paused. Controls released.',
  won:'Mission complete. Practice score '+flight.score+'.',crashed:'Ship lost. Restart your mission.',
  timeout:'Time expired. Restart your mission.'};
 const value=msgs[flight.phase];if($('message').textContent!==value)$('message').textContent=value;
}
function frame(t){
 if(last===null)last=t;
 const delta=Math.max(0,Math.min(.10,(t-last)/1000));last=t;
 const gamepad=readGamepad();
 if(flight.phase==='running'){
  acc=Math.min(acc+delta,.10);
  let n=0;
  while(acc>=ACE.dt&&n<6&&flight.phase==='running'){
   stepAce(flight,{...held,...gamepad,
    afterburner:held.afterburner||Boolean(gamepad.afterburner),
    brake:held.brake||Boolean(gamepad.brake),
    throttleUp:held.throttleUp||Boolean(gamepad.throttleUp),
    throttleDown:held.throttleDown||Boolean(gamepad.throttleDown),
    strafeLeft:held.strafeLeft||Boolean(gamepad.strafeLeft),
    strafeRight:held.strafeRight||Boolean(gamepad.strafeRight),
    pulse:pulseQueued,cycleTarget:targetQueued,toggleAssist:assistQueued});
   pulseQueued=false;targetQueued=false;assistQueued=false;
   acc-=ACE.dt;n++;
  }
 }else acc=0;
 renderAce(ctx,flight);
 updateHud();
 frames++;
 requestAnimationFrame(frame);
}
renderAce(ctx,flight);updateHud();requestAnimationFrame(frame);
// Read-only instrumentation for automated game tests; no network or authority.
if(new URLSearchParams(location.search).get('test')==='1'){
 window.__aceTest=Object.freeze({snapshot:()=>({phase:flight.phase,ticks:flight.ticks,x:flight.ship.x,y:flight.ship.y,z:flight.ship.z,
  yaw:flight.ship.yaw,pitch:flight.ship.pitch,roll:flight.ship.roll,speed:speed(flight),shield:flight.ship.shield,
  heat:flight.ship.heat,throttle:flight.ship.throttle,burnerLocked:flight.ship.burnerLocked,
  assist:flight.ship.assist,target:selectedTarget(flight),targetQuality:flight.targetQuality,
  boosts:flight.boosts,score:flight.score}),frames:()=>frames});
}
