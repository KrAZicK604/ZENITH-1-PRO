import {
 ROAM,createRoam,startRoam,pauseRoam,resetRoam,stepRoam,navState,destination,
 elapsed,velocity
} from './free-roam-core.mjs';
import {renderRoam} from './free-roam-render.mjs';
import {ASTRO_REFERENCE} from './astro-readonly-reference.mjs';

const $=id=>document.getElementById(id),canvas=$('roamScene');
const ctx=canvas.getContext('2d',{alpha:false});
let flight=createRoam(),last=null,acc=0,frameCount=0;
let controls={};
const toggles={toggleAssist:false,cycleTarget:false,toggleBeacon:false,engineCut:false};
const buttons=['pitchUp','pitchDown','yawLeft','yawRight','rollLeft','rollRight','throttleUp','throttleDown',
 'strafeLeft','strafeRight','liftUp','liftDown','afterburner','brake'];
const keys={
 KeyW:'pitchUp',KeyS:'pitchDown',KeyA:'yawLeft',KeyD:'yawRight',KeyQ:'rollLeft',KeyE:'rollRight',
 ArrowUp:'throttleUp',ArrowDown:'throttleDown',KeyJ:'strafeLeft',KeyL:'strafeRight',
 KeyU:'liftUp',KeyO:'liftDown',ShiftLeft:'afterburner',ShiftRight:'afterburner',KeyB:'brake'
};
let previousPad={pause:false,assist:false,target:false,cut:false};
function resetInput(){
 controls={};for(const key of Object.keys(toggles))toggles[key]=false;
 document.querySelectorAll('[data-hold].pressed').forEach(x=>x.classList.remove('pressed'));
}
function focus(){canvas.focus({preventScroll:true});}
function launch(){if(flight.phase==='ready')startRoam(flight);focus();}
function restart(){flight=resetRoam(flight);resetInput();last=null;acc=0;startRoam(flight);focus();}
function togglePause(){resetInput();pauseRoam(flight);acc=0;focus();}
function pauseHidden(){resetInput();if(flight.phase==='running')pauseRoam(flight);acc=0;}
function command(name){if(flight.phase==='running')toggles[name]=true;focus();}
$('launch').addEventListener('click',launch);
$('reset').addEventListener('click',restart);
$('pause').addEventListener('click',togglePause);
$('assist').addEventListener('click',()=>command('toggleAssist'));
$('target').addEventListener('click',()=>command('cycleTarget'));
$('cut').addEventListener('click',()=>command('engineCut'));
$('beacon').addEventListener('click',()=>command('toggleBeacon'));
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLElement&&e.target.closest('button,a,input,textarea,select'))return;
 const held=keys[e.code];
 if(held){e.preventDefault();controls[held]=true;return;}
 const actions={KeyF:'toggleAssist',KeyT:'cycleTarget',KeyH:'toggleBeacon',KeyC:'engineCut'};
 if(actions[e.code]){e.preventDefault();if(!e.repeat)command(actions[e.code]);}
 if(e.code==='KeyP'&&!e.repeat){e.preventDefault();togglePause();}
 if(e.code==='Enter'&&!e.repeat&&flight.phase==='ready'){e.preventDefault();launch();}
});
document.addEventListener('keyup',e=>{if(keys[e.code]){delete controls[keys[e.code]];e.preventDefault();}});
document.querySelectorAll('[data-hold]').forEach(b=>{
 const action=b.dataset.hold;
 b.addEventListener('pointerdown',e=>{
  if(flight.phase!=='running')return;
  e.preventDefault();controls[action]=true;
  b.classList.add('pressed');
  try{b.setPointerCapture(e.pointerId);}catch{}
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  b.addEventListener(name,()=>{delete controls[action];b.classList.remove('pressed');});
});
window.addEventListener('blur',pauseHidden);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseHidden();});
const dz=x=>Number.isFinite(x)?Math.abs(x)>.15?Math.max(-1,Math.min(1,x)):0:0;
function gamepad(){
 const p=typeof navigator.getGamepads==='function'?Array.from(navigator.getGamepads()).find(x=>x?.connected):null;
 if(!p){previousPad={pause:false,assist:false,target:false,cut:false};return {};}
 const pressed=i=>!!p.buttons[i]?.pressed;
 const next={pause:pressed(9),assist:pressed(3),target:pressed(2),cut:pressed(1)};
 if(next.pause&&!previousPad.pause)togglePause();
 for(const [key,to] of [['assist','toggleAssist'],['target','cycleTarget'],['cut','engineCut']])
  if(next[key]&&!previousPad[key])command(to);
 previousPad=next;
 return {pitchAxis:dz(-(p.axes[1]||0)),yawAxis:dz(p.axes[0]||0),
  rollAxis:dz(p.axes[2]||0),throttleUp:(p.axes[3]||0)<-.35,
  throttleDown:(p.axes[3]||0)>.35,afterburner:pressed(7),
  brake:pressed(6),strafeLeft:pressed(4),strafeRight:pressed(5)};
}
function showResearchEpoch(){
 const i=Number($('astroEpoch').value),row=ASTRO_REFERENCE.epochs[i];
 if(!row||!Number.isSafeInteger(i))throw Error('INVALID_REFERENCE_EPOCH');
 const fmt=x=>new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(x)+' km';
 $('realEarthMoon').textContent=fmt(row.earthMoonKm);
 $('realEarthMars').textContent=fmt(row.earthMarsKm);
 $('realMoonMars').textContent=fmt(row.moonMarsKm);
 $('astroProvenance').textContent='REFERENCE ONLY: JD(TDB) '+row.jdTdb+
  ', center-to-center. Numerical kernel comparison passed, physical custody not attested. Never mapped to the arcade ship position.';
}
$('astroEpoch').addEventListener('change',showResearchEpoch);
showResearchEpoch();
function hud(){
 const s=flight.ship,n=navState(flight);
 $('phase').textContent=flight.phase.toUpperCase();
 $('time').textContent=elapsed(flight).toFixed(1)+' s';
 $('speed').textContent=velocity(flight).toFixed(1)+' gu/s';
 $('throttle').textContent=Math.round(s.throttle*100)+'%';
 $('heat').textContent=Math.round(s.heat*100)+'%';
 $('damper').textContent=s.assist?'STABILIZED':'INERTIAL';
 $('dest').textContent=n.target.toUpperCase();
 $('distance').textContent=n.rangeGameUnits.toLocaleString('en-CA',{maximumFractionDigits:0})+' gu';
 $('attitude').textContent=[s.pitch,s.yaw,s.roll].map(a=>Math.round(a*180/Math.PI)+'°').join(' / ');
 $('position').textContent='X '+s.x.toFixed(0)+'  Y '+s.y.toFixed(0)+'  Z '+s.z.toFixed(0);
 $('assist').textContent='Dampers: '+(s.assist?'ON':'OFF');
 $('target').textContent='Target: '+n.target;
 $('beacon').textContent='Beacon: '+(flight.beaconEnabled?'ON':'OFF');
 $('pause').disabled=!['running','paused'].includes(flight.phase);
 $('pause').textContent=flight.phase==='paused'?'Resume':'Pause';
 $('launch').disabled=flight.phase!=='ready';
 for(const id of ['assist','target','beacon','cut'])$(id).disabled=flight.phase!=='running';
 const m={ready:'Ship idle. Launch whenever you wish.',running:flight.near?
  'Close flyby of '+flight.near.toUpperCase()+' — explore or depart freely.':
  'No mission required. Coast, turn, or select a navigation beacon.',
  paused:'Flight paused; all controls released.',precision_limit:'Precision safeguard reached. Restart the local session.'};
 $('message').textContent=m[flight.phase];
}
function frame(t){
 if(last===null)last=t;
 const d=Math.min(.10,Math.max(0,(t-last)/1000));last=t;
 const pad=gamepad();
 if(flight.phase==='running'){
  acc=Math.min(.10,acc+d);let i=0;
  while(acc>=ROAM.dt&&i<6&&flight.phase==='running'){
   const active={...controls,...pad,
    afterburner:!!(controls.afterburner||pad.afterburner),
    brake:!!(controls.brake||pad.brake),
    throttleUp:!!(controls.throttleUp||pad.throttleUp),
    throttleDown:!!(controls.throttleDown||pad.throttleDown),
    strafeLeft:!!(controls.strafeLeft||pad.strafeLeft),
    strafeRight:!!(controls.strafeRight||pad.strafeRight),...toggles};
   stepRoam(flight,active);
   for(const key of Object.keys(toggles))toggles[key]=false;
   acc-=ROAM.dt;i++;
  }
 }else acc=0;
 renderRoam(ctx,flight);hud();frameCount++;
 requestAnimationFrame(frame);
}
renderRoam(ctx,flight);hud();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).get('test')==='1'){
 window.__roamTest=Object.freeze({snapshot:()=>({phase:flight.phase,ticks:flight.ticks,
  x:flight.ship.x,y:flight.ship.y,z:flight.ship.z,
  vx:flight.ship.vx,vy:flight.ship.vy,vz:flight.ship.vz,
  yaw:flight.ship.yaw,throttle:flight.ship.throttle,speed:velocity(flight),
  target:destination(flight).id,assist:flight.ship.assist,beacon:flight.beaconEnabled,
  heat:flight.ship.heat}),frames:()=>frameCount});
}
