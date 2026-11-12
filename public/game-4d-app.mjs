import {RULES,createFlight,start,pause,reset,step,simulationTime} from './game-4d-core.mjs';
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
const starSeed=(()=>{let n=77;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};})();
const stars=Array.from({length:230},()=>({x:starSeed()*960,y:starSeed()*540,r:.5+starSeed()*1.3}));
function camera(){return{x:flight.ship.x-165,y:flight.ship.y,z:flight.ship.z+48};}
function project(p,c){
 // Camera looks along +X; perspective shrinks distant objects.
 const depth=p.x-c.x;if(depth<=9)return null;
 const k=620/depth;
 return {x:480+(p.y-c.y)*k,y:270-(p.z-c.z)*k,k,depth};
}
function sphere(p,r,color,c){
 const q=project(p,c);if(!q)return;
 const radius=Math.min(1000,r*q.k);
 ctx.beginPath();ctx.arc(q.x,q.y,radius,0,Math.PI*2);
 ctx.fillStyle=color;ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.5;ctx.stroke();
}
function line(a,b,c,color){
 const p=project(a,c),q=project(b,c);if(!p||!q)return;
 ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
}
const vertices=[
 [19,0,0],[-15,-12,-5],[-15,12,-5],[-13,0,9],[-17,-4,-6],[-17,4,-6]
];
const faces=[[0,1,3],[0,3,2],[0,2,1],[1,2,3],[1,4,5],[1,5,2]];
function shipMesh(c){
 const s=flight.ship,cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),cr=Math.cos(s.roll),sr=Math.sin(s.roll);
 const world=vertices.map(([x,y,z])=>{
  // Roll around forward X, then pitch, then yaw.
  const yr=y*cr-z*sr,zr=y*sr+z*cr;
  const xp=x*cp-zr*sp,zp=x*sp+zr*cp;
  return{x:s.x+xp*cy-yr*sy,y:s.y+xp*sy+yr*cy,z:s.z+zp};
 });
 const projected=world.map(v=>project(v,c));
 const triangles=faces.map((f,i)=>({f,i,depth:f.reduce((sum,j)=>sum+projected[j].depth,0)/3})).sort((a,b)=>b.depth-a.depth);
 for(const {f,i} of triangles){
  if(f.some(j=>!projected[j]))continue;
  ctx.beginPath();ctx.moveTo(projected[f[0]].x,projected[f[0]].y);
  for(let j=1;j<f.length;j++)ctx.lineTo(projected[f[j]].x,projected[f[j]].y);
  ctx.closePath();ctx.fillStyle=['#91edff','#4a9fbf','#286d9b','#315478','#d2edfc','#6cbfd7'][i];
  ctx.fill();ctx.strokeStyle='#d2f7ff';ctx.lineWidth=1.2;ctx.stroke();
 }
}
function render(){
 const w=canvas.width,h=canvas.height,c=camera();
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#050d21');bg.addColorStop(1,'#132343');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#d4edff';for(const p of stars){ctx.globalAlpha=.35+(p.r/2)*.45;ctx.fillRect(p.x,p.y,p.r,p.r);}ctx.globalAlpha=1;
 // Three-dimensional corridor reference, not a physical orbital trajectory.
 for(let x=200;x<=1000;x+=100){
  const corners=[{x,y:-240,z:-200},{x,y:240,z:-200},{x,y:240,z:200},{x,y:-240,z:200}];
  for(let j=0;j<4;j++)line(corners[j],corners[(j+1)%4],c,'rgba(67,173,218,.16)');
 }
 for(let y=-240;y<=240;y+=120)for(let z=-200;z<=200;z+=100)line({x:0,y,z},{x:1050,y,z},c,'rgba(64,153,198,.10)');
 const objects=[
  {p:flight.moon,r:flight.moon.r,color:'#a2a9b9',label:'MOON'},
  {p:flight.goal,r:flight.goal.r,color:'#f0784c',label:'MARS'},
  ...flight.asteroids.map(a=>({p:a,r:a.r,color:'#8795a9'}))
 ].sort((a,b)=>b.p.x-a.p.x);
 for(const o of objects){
  sphere(o.p,o.r,o.color,c);
  if(o.label){const q=project(o.p,c);if(q){ctx.fillStyle='#f5faff';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(o.label,q.x,q.y+Math.min(100,o.r*q.k)+20);}}
 }
 shipMesh(c);
 ctx.textAlign='left';ctx.font='13px monospace';ctx.fillStyle='#a5e7ff';
 ctx.fillText('3D SPACE: X • Y • Z    |    4TH COORDINATE: t',18,26);
 ctx.fillText('Perspective camera follows ship | Local practice simulation',18,45);
 if(flight.phase!=='running'){
  ctx.fillStyle='rgba(3,12,25,.55)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 32px system-ui';
  ctx.fillText(({ready:'READY TO LAUNCH',paused:'PAUSED',won:'MARS REACHED',crashed:'SHIP COLLISION',timeout:'TIME EXPIRED'})[flight.phase],w/2,h/2);
 }
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
 window.__flight4DTest=Object.freeze({snapshot:()=>({phase:flight.phase,ticks:flight.ticks,boosts:flight.boosts,x:flight.ship.x,y:flight.ship.y,z:flight.ship.z,score:flight.score}),frames:()=>frameCount});
}
