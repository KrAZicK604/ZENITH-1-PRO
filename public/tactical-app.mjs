import {FLIGHT,createMission,start,pause,reset,step,time,telemetry,axes} from './tactical-core.mjs';
const $=id=>document.getElementById(id),canvas=$('view'),ctx=canvas.getContext('2d');
let mission=createMission(),last=null,acc=0,queued=false;
const held=Object.create(null),map={KeyW:'pitchUp',KeyS:'pitchDown',KeyA:'yawLeft',KeyD:'yawRight',KeyQ:'rollLeft',KeyE:'rollRight',KeyR:'throttleUp',KeyF:'throttleDown',ArrowLeft:'strafeLeft',ArrowRight:'strafeRight',ArrowUp:'ascend',ArrowDown:'descend'};
function clear(){for(const k in held)held[k]=false;queued=false;}
function focus(){canvas.focus({preventScroll:true});}
function launch(){start(mission);focus();}
function restart(){mission=reset(mission);clear();acc=0;last=null;start(mission);focus();}
$('launch').addEventListener('click',launch);$('restart').addEventListener('click',restart);
$('pause').addEventListener('click',()=>{clear();pause(mission);acc=0;focus();});
document.addEventListener('keydown',e=>{if(e.target.closest?.('button,input,select,textarea,a'))return;if(map[e.code]){e.preventDefault();held[map[e.code]]=true;}else if(e.code==='Space'){e.preventDefault();if(!e.repeat)queued=true;}else if(e.code==='KeyP'&&!e.repeat){e.preventDefault();clear();pause(mission);acc=0;}});
document.addEventListener('keyup',e=>{if(map[e.code])held[map[e.code]]=false;});
for(const b of document.querySelectorAll('[data-key]')){
 const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();if(k==='boost')queued=true;else held[k]=true;b.classList.add('pressed');try{b.setPointerCapture(e.pointerId);}catch{}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{if(k!=='boost')held[k]=false;b.classList.remove('pressed');});
}
function autoPause(){clear();if(mission.phase==='running')pause(mission);acc=0;}
window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function transform(point,camera,basis){
 const d={x:point.x-camera.x,y:point.y-camera.y,z:point.z-camera.z};
 const forward=d.x*basis.forward.x+d.y*basis.forward.y+d.z*basis.forward.z;
 if(forward<12)return null;
 const lateral=d.x*basis.right.x+d.y*basis.right.y+d.z*basis.right.z;
 const vertical=d.x*basis.up.x+d.y*basis.up.y+d.z*basis.up.z;
 const scale=550/forward;return{x:480+lateral*scale,y:270-vertical*scale,scale,depth:forward};
}
function circle(p,r,color,c,b){const q=transform(p,c,b);if(!q)return;ctx.beginPath();ctx.arc(q.x,q.y,Math.min(700,r*q.scale),0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
const hull=[{x:18,y:0,z:0},{x:-16,y:-22,z:-3},{x:-16,y:22,z:-3},{x:-13,y:0,z:9},{x:-18,y:-6,z:-7},{x:-18,y:6,z:-7}];
const faces=[[0,1,3],[0,3,2],[0,2,1],[1,2,3],[1,4,5],[1,5,2]];
const colors=['#81edff','#2e9dc4','#286d96','#173f68','#d3f4ff','#4286ad'];
function shipMesh(c,b){
 const p=mission.ship,orientation=axes(p.yaw,p.pitch,p.roll);
 const projected=hull.map(v=>transform({x:p.x+orientation.forward.x*v.x+orientation.right.x*v.y+orientation.up.x*v.z,y:p.y+orientation.forward.y*v.x+orientation.right.y*v.y+orientation.up.y*v.z,z:p.z+orientation.forward.z*v.x+orientation.right.z*v.y+orientation.up.z*v.z},c,b));
 for(const [i,f]of faces.entries()){
  if(f.some(j=>!projected[j]))continue;
  ctx.beginPath();ctx.moveTo(projected[f[0]].x,projected[f[0]].y);for(let j=1;j<3;j++)ctx.lineTo(projected[f[j]].x,projected[f[j]].y);ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();ctx.strokeStyle='#a5eaf9';ctx.lineWidth=1;ctx.stroke();
 }
}
function draw(){
 const p=mission.ship,b=axes(p.yaw,p.pitch,p.roll);
 // Chase camera behind ship; modest world-up offset makes polygonal hull visible.
 const c={x:p.x-b.forward.x*145+b.up.x*42,y:p.y-b.forward.y*145+b.up.y*42,z:p.z-b.forward.z*145+b.up.z*42};
 const bg=ctx.createLinearGradient(0,0,0,540);bg.addColorStop(0,'#040d22');bg.addColorStop(1,'#1d2548');ctx.fillStyle=bg;ctx.fillRect(0,0,960,540);
 // Seeded static stars avoid nondeterministic rendering and network textures.
 for(let i=0;i<150;i++){const x=(i*137+43)%960,y=(i*223+71)%540;ctx.fillStyle=i%5?'#48627c':'#bddff0';ctx.fillRect(x,y,i%5?1:2,i%5?1:2);}
 const objects=[{p:mission.target,r:mission.target.r,color:'#e77c4f'},...mission.debris.map(d=>({p:d,r:d.r,color:'#8998ae'}))];
 objects.sort((a,z)=>z.p.x-a.p.x);for(const o of objects)circle(o.p,o.r,o.color,c,b);
 shipMesh(c,b);
 const t=telemetry(mission);
 // Original tactical HUD: artificial horizon, targeting reticle and telemetry.
 ctx.strokeStyle='#77efd2';ctx.fillStyle='#8cf3df';ctx.lineWidth=1.5;ctx.font='14px monospace';
 ctx.beginPath();ctx.moveTo(452,270);ctx.lineTo(466,270);ctx.moveTo(494,270);ctx.lineTo(508,270);ctx.moveTo(480,251);ctx.lineTo(480,261);ctx.moveTo(480,279);ctx.lineTo(480,289);ctx.stroke();
 ctx.save();ctx.translate(480,270);ctx.rotate(-p.roll);
 for(let i=-2;i<=2;i++){const y=i*28+p.pitch*65;ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(-65,y);ctx.lineTo(-22,y);ctx.moveTo(22,y);ctx.lineTo(65,y);ctx.stroke();}ctx.restore();ctx.globalAlpha=1;
 const bearing=Math.max(-400,Math.min(400,t.targetBearing*5)),elevation=Math.max(-210,Math.min(210,t.targetElevation*4));
 ctx.strokeStyle='#ffcb73';ctx.strokeRect(480+bearing-15,270-elevation-15,30,30);
 ctx.fillStyle='#ffcb73';ctx.fillText('TARGET '+Math.round(t.range),Math.max(15,Math.min(785,480+bearing-35)),Math.max(24,260-elevation-25));
 ctx.fillStyle='#8cf3df';ctx.fillText('SPD '+t.speed.toFixed(0)+'  |  THR '+Math.round(t.throttle*100)+'%',20,35);
 ctx.fillText('HDG '+t.heading.toFixed(0)+'  PIT '+t.pitch.toFixed(0)+'  BNK '+t.bank.toFixed(0),20,55);
 ctx.fillText('HULL '+t.integrity+'%  |  BOOST '+mission.boosts,20,520);
 ctx.fillText('T+'+time(mission).toFixed(1)+'  |  3D FLIGHT / 4D STATE',670,520);
 if(mission.phase!=='running'){ctx.fillStyle='rgba(0,7,19,.58)';ctx.fillRect(0,0,960,540);ctx.textAlign='center';ctx.fillStyle='#eafaff';ctx.font='bold 32px system-ui';ctx.fillText(({ready:'MISSION STANDBY',paused:'FLIGHT PAUSED',won:'MISSION COMPLETE',crashed:'HULL BREACH',timeout:'MISSION TIMEOUT'})[mission.phase],480,260);ctx.textAlign='left';}
 $('mode').textContent=mission.phase.toUpperCase();$('velocity').textContent=t.speed.toFixed(0);
 $('throttle').textContent=Math.round(t.throttle*100)+'%';$('attitude').textContent=t.pitch.toFixed(0)+'° / '+t.bank.toFixed(0)+'°';$('range').textContent=t.range.toFixed(0);$('boosts').textContent=mission.boosts;$('clock').textContent=time(mission).toFixed(1)+' s';
 $('launch').disabled=mission.phase!=='ready';$('pause').disabled=!['running','paused'].includes(mission.phase);$('pause').textContent=mission.phase==='paused'?'Resume':'Pause';
 $('status').textContent=({ready:'Mission standby',running:'Fly toward orange target',paused:'Simulation paused',won:'Target reached — local score '+mission.score,crashed:'Debris impact — restart',timeout:'90 seconds elapsed'})[mission.phase];
}
function frame(now){if(last===null)last=now;const delta=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
 if(mission.phase==='running'){acc=Math.min(.1,acc+delta);let n=0;while(acc>=FLIGHT.dt&&n<6&&mission.phase==='running'){step(mission,{...held,boost:queued});queued=false;acc-=FLIGHT.dt;n++;}}else acc=0;
 draw();requestAnimationFrame(frame);}
draw();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).get('test')==='1')window.__tacticalTest=Object.freeze({snapshot:()=>({phase:mission.phase,ticks:mission.ticks,x:mission.ship.x,y:mission.ship.y,z:mission.ship.z,roll:mission.ship.roll,throttle:mission.ship.throttle,boosts:mission.boosts})});
