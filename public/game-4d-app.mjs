import {RULES,createFlight,start,pause,reset,step,simulationTime} from './game-4d-core.mjs';
import {renderCinematic,cinematicAssetStatus} from './game-4d-cinematic-render.mjs';
import {setupPlanetMode} from './planet-time-app.mjs';
import {createShip3DRenderer,VIEW_MODES} from './ship-3d-webgl.mjs';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const shipCanvas=$('ship3dScene');
const forcedFallback=new URLSearchParams(location.search).get('force2D')==='1';
const shipModel=createShip3DRenderer(shipCanvas,{forcedFallback});
let show3D=shipModel.status().available,wireframe=false,timeSlices=true;
const camera={az:.26,elev:.33,distance:235};
let flight=createFlight(),last=null,acc=0,boost=false,frameCount=0;
const controls={forward:false,back:false,left:false,right:false,up:false,down:false};
const mapping={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down'};
function clear(){for(const k in controls)controls[k]=false;boost=false;}
const planetarium=setupPlanetMode(ctx,clear);
function refreshShipDisplay(){
 const astro=planetarium.isActive();
 const gl=shipModel.status();
 if(!gl.available)show3D=false;
 const displaying=!astro&&show3D&&gl.available;
 shipCanvas.hidden=!displaying;
 canvas.hidden=displaying;
 $('ship3dLabel').hidden=!displaying;
 $('ship3dControls').hidden=astro;
 const art=$('ship3dArt');
 art.textContent=gl.available?(displaying?'Show original 2D art':'Return to 3D mesh'):'Original 2D art (WebGL2 unsupported)';
 art.disabled=!gl.available;
 for(const b of document.querySelectorAll('[data-ship-view]')){
  b.disabled=!gl.available||!show3D;
  b.setAttribute('aria-pressed',String(displaying&&b.dataset.shipView===gl.view));
 }
 for(const id of ['ship3dWire','ship3dSlices'])$(id).disabled=!gl.available||!show3D;
 $('ship3dWire').setAttribute('aria-pressed',String(wireframe));
 $('ship3dSlices').setAttribute('aria-pressed',String(timeSlices));
 $('ship3dWire').textContent='Wireframe: '+(wireframe?'on':'off');
 $('ship3dSlices').textContent='Time slices: '+(timeSlices?'on':'off');
 $('ship3dStatus').textContent=gl.available?
  'WEBGL2 GENUINE 3D · '+gl.triangles.toLocaleString()+
  ' solid triangles · 3 modeled engines · '+gl.view.toUpperCase()+
  ' · X/Y/Z + simulated time T · GAME UNITS':
  '2D FALLBACK · '+(gl.reason||'WEBGL2_UNSUPPORTED')+' · underlying simulation preserved';
}
function focus(){(shipCanvas.hidden?canvas:shipCanvas).focus({preventScroll:true});}
$('openPlanets').addEventListener('click',refreshShipDisplay);
$('returnFlight').addEventListener('click',refreshShipDisplay);
$('ship3dArt').addEventListener('click',()=>{
 if(shipModel.status().available)show3D=!show3D;
 refreshShipDisplay();focus();
});
for(const b of document.querySelectorAll('[data-ship-view]')){
 b.addEventListener('click',()=>{
  shipModel.setView(b.dataset.shipView);
  refreshShipDisplay();focus();
 });
}
$('ship3dWire').addEventListener('click',()=>{
 wireframe=!wireframe;shipModel.setWireframe(wireframe);refreshShipDisplay();focus();
});
$('ship3dSlices').addEventListener('click',()=>{
 timeSlices=!timeSlices;shipModel.setTimeSlices(timeSlices);refreshShipDisplay();focus();
});
let pointer=null;
shipCanvas.addEventListener('pointerdown',e=>{
 if(shipCanvas.hidden||planetarium.isActive())return;
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
 shipCanvas.classList.add('dragging');
 try{shipCanvas.setPointerCapture(e.pointerId);}catch{}
});
shipCanvas.addEventListener('pointermove',e=>{
 if(!pointer||e.pointerId!==pointer.id)return;
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
 pointer.x=e.clientX;pointer.y=e.clientY;
 camera.az+=dx*.010;
 camera.elev=Math.max(-1.28,Math.min(1.28,camera.elev-dy*.009));
 shipModel.setOrbit(camera.az,camera.elev,camera.distance);
 refreshShipDisplay();
});
function pointerEnd(){pointer=null;shipCanvas.classList.remove('dragging');}
for(const event of ['pointerup','pointercancel','lostpointercapture'])
 shipCanvas.addEventListener(event,pointerEnd);
shipCanvas.addEventListener('wheel',e=>{
 if(shipCanvas.hidden||planetarium.isActive())return;
 e.preventDefault();
 camera.distance=Math.max(155,Math.min(420,camera.distance*(e.deltaY>0?1.09:.91)));
 shipModel.setOrbit(camera.az,camera.elev,camera.distance);
 refreshShipDisplay();
},{passive:false});
refreshShipDisplay();
function launch(){if(flight.phase==='ready')start(flight);focus();}
function restart(){flight=reset(flight);clear();acc=0;last=null;start(flight);focus();}
$('start').addEventListener('click',launch);
$('reset').addEventListener('click',restart);
$('pause').addEventListener('click',()=>{clear();pause(flight);acc=0;focus();});
document.addEventListener('keydown',e=>{
 if(planetarium.isActive())return;
 if(e.target.closest?.('button,input,textarea,select,a'))return;
 if(mapping[e.code]){e.preventDefault();controls[mapping[e.code]]=true;}
 else if(e.code==='Space'){e.preventDefault();if(!e.repeat)boost=true;}
 else if(e.code==='KeyP'&&!e.repeat){e.preventDefault();clear();pause(flight);acc=0;}
});
document.addEventListener('keyup',e=>{if(planetarium.isActive())return;if(mapping[e.code])controls[mapping[e.code]]=false;});
for(const b of document.querySelectorAll('[data-axis]')){
 const axis=b.dataset.axis;
 b.addEventListener('pointerdown',e=>{if(planetarium.isActive())return;e.preventDefault();if(axis==='boost')boost=true;else controls[axis]=true;b.classList.add('pressed');try{b.setPointerCapture(e.pointerId);}catch{}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{if(axis!=='boost')controls[axis]=false;b.classList.remove('pressed');});
}
function autoPause(){clear();if(flight.phase==='running')pause(flight);acc=0;}
window.addEventListener('blur',autoPause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function render(){
 const valid3D=show3D&&shipModel.status().available&&shipModel.render(flight);
 if(!valid3D)renderCinematic(ctx,flight);
 if(show3D&&!valid3D)show3D=false;
 refreshShipDisplay();
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
 if(planetarium.isActive()){
  acc=0;planetarium.frame(delta);frameCount++;requestAnimationFrame(frame);return;
 }
 if(flight.phase==='running'){
  acc=Math.min(.1,acc+delta);let steps=0;
  while(acc>=RULES.dt&&steps<6&&flight.phase==='running'){step(flight,{...controls,boost});boost=false;acc-=RULES.dt;steps++;}
 }else acc=0;
 render();frameCount++;requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).get('test')==='1'){
 window.__flight4DTest=Object.freeze({snapshot:()=>({phase:flight.phase,ticks:flight.ticks,boosts:flight.boosts,x:flight.ship.x,y:flight.ship.y,z:flight.ship.z,score:flight.score,yaw:flight.ship.yaw,pitch:flight.ship.pitch,roll:flight.ship.roll}),frames:()=>frameCount,art:cinematicAssetStatus,planets:planetarium.snapshot,webgl:shipModel.status,visual:()=>({show3D,shipCanvasHidden:shipCanvas.hidden,planetarium:planetarium.isActive()})});
}
