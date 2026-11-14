import {RULES,createFlight,start,pause,reset,step,simulationTime} from './game-4d-core.mjs';
import {renderCinematic,cinematicAssetStatus} from './game-4d-cinematic-render.mjs';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
let flight=createFlight(),last=null,acc=0,boost=false,frameCount=0;
const controls={forward:false,back:false,left:false,right:false,up:false,down:false};
const mapping={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down'};
function clear(){for(const k in controls)controls[k]=false;boost=false;}
function focus(){canvas.focus({preventScroll:true});}
function launch(){if(flight.phase==='ready')start(flight);focus();}
function restart(){flight=reset(flight);clear();acc=0;last=null;start(flight);focus();}
$('start').addEventListener('click',launch);
$('reset').addEventListener('click',restart);
$('pause').addEventListener('click',()=>{clear();pause(flight);acc=0;focus();});
document.addEventListener('keydown',e=>{
 if(e.target.closest?.('button,input,textarea,select,a'))return;
 if(mapping[e.code]){e.preventDefault();controls[mapping[e.code]]=true;}
 else if(e.code==='Space'){e.preventDefault();if(!e.repeat)boost=true;}
 else if(e.code==='KeyP'&&!e.repeat){e.preventDefault();clear();pause(flight);acc=0;}
});
document.addEventListener('keyup',e=>{if(mapping[e.code])controls[mapping[e.code]]=false;});
for(const b of document.querySelectorAll('[data-axis]')){
 const axis=b.dataset.axis;
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(axis==='boost')boost=true;else controls[axis]=true;b.classList.add('pressed');try{b.setPointerCapture(e.pointerId);}catch{}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{if(axis!=='boost')controls[axis]=false;b.classList.remove('pressed');});
}
function autoPause(){clear();if(flight.phase==='running')pause(flight);acc=0;}
window.addEventListener('blur',autoPause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function render(){
 renderCinematic(ctx,flight);
 $('status').textContent=flight.phase.toUpperCase();
 $('time').textContent=simulationTime(flight).toFixed(2)+' s';
 for(const axis of ['x','y','z'])$(axis).textContent=flight.ship[axis].toFixed(1);
 $('score').textContent=flight.boosts+' / '+flight.score;
 $('start').disabled=flight.phase!=='ready';$('pause').disabled=!['running','paused'].includes(flight.phase);
 $('pause').textContent=flight.phase==='paused'?'Resume':'Pause';
 const msg={ready:'Ready to launch',running:'Fly in 3 spatial dimensions',paused:'Simulation paused',won:'Mars reached — local practice score',crashed:'Collision — restart to try again',timeout:'90 seconds elapsed'};
 $('message').textContent=msg[flight.phase];
}
function frame(t){
 if(last===null)last=t;const delta=Math.min(.1,Math.max(0,(t-last)/1000));last=t;
 if(flight.phase==='running'){
  acc=Math.min(.1,acc+delta);let steps=0;
  while(acc>=RULES.dt&&steps<6&&flight.phase==='running'){step(flight,{...controls,boost});boost=false;acc-=RULES.dt;steps++;}
 }else acc=0;
 render();frameCount++;requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).get('test')==='1'){
 window.__flight4DTest=Object.freeze({snapshot:()=>({phase:flight.phase,ticks:flight.ticks,boosts:flight.boosts,x:flight.ship.x,y:flight.ship.y,z:flight.ship.z,score:flight.score,yaw:flight.ship.yaw,pitch:flight.ship.pitch,roll:flight.ship.roll}),frames:()=>frameCount,art:cinematicAssetStatus});
}
