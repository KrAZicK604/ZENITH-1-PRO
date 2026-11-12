import {createWorld,start,pause,reset,step,STEP,LIMITS,vec,add,sub,scale,dot,cross,unit,length,rotate} from "./space4d-core.mjs";
const canvas=document.querySelector("#view"),ctx=canvas.getContext("2d",{alpha:false});
const $=id=>document.getElementById(id);
const hud={state:$("state"),clock:$("clock"),speed:$("speed"),boost:$("boosts"),distance:$("distance"),attitude:$("attitude"),message:$("message")};
let world=createWorld(),previous=null,acc=0,boost=false,camMode="chase";
const held=new Set();
const map=new Map([["KeyW","throttle"],["KeyS","reverse"],["KeyA","yawLeft"],["KeyD","yawRight"],["ArrowUp","pitchUp"],["ArrowDown","pitchDown"],["ArrowLeft","rollLeft"],["ArrowRight","rollRight"],["KeyQ","strafeLeft"],["KeyE","strafeRight"],["KeyR","liftUp"],["KeyF","liftDown"]]);
const controls=()=>{
 const has=name=>held.has(name);
 return {throttle:Number(has("throttle"))-Number(has("reverse")),
  pitchUp:has("pitchUp"),pitchDown:has("pitchDown"),yawLeft:has("yawLeft"),yawRight:has("yawRight"),
  rollLeft:has("rollLeft"),rollRight:has("rollRight"),
  strafe:Number(has("strafeRight"))-Number(has("strafeLeft")),
  lift:Number(has("liftUp"))-Number(has("liftDown")),boost};
};
function clear(){held.clear();boost=false;document.querySelectorAll(".held").forEach(e=>e.classList.remove("held"));}
function begin(){world=reset(world);clear();acc=0;previous=null;start(world);canvas.focus({preventScroll:true});update();}
$("launch").addEventListener("click",()=>{if(world.status==="ready"){start(world);canvas.focus({preventScroll:true});}else begin();update();});
$("restart").addEventListener("click",begin);
$("pause").addEventListener("click",()=>{clear();pause(world);canvas.focus({preventScroll:true});update();});
$("camera").addEventListener("click",()=>{camMode=camMode==="chase"?"orbit":"chase";$("camera").textContent=camMode==="chase"?"Camera: chase":"Camera: orbit";});
$("boostButton").addEventListener("click",()=>{if(world.status==="running")boost=true;});
document.addEventListener("keydown",e=>{
 if(e.target.closest?.("input,textarea,select,button,a"))return;
 if(map.has(e.code)){held.add(map.get(e.code));e.preventDefault();}
 else if(e.code==="Space"){if(!e.repeat&&world.status==="running")boost=true;e.preventDefault();}
 else if(e.code==="KeyP"&&!e.repeat){clear();pause(world);update();}
});
document.addEventListener("keyup",e=>{if(map.has(e.code)){held.delete(map.get(e.code));e.preventDefault();}});
for(const button of document.querySelectorAll("[data-hold]")){
 const name=button.dataset.hold;
 button.addEventListener("pointerdown",e=>{e.preventDefault();held.add(name);button.classList.add("held");try{button.setPointerCapture(e.pointerId);}catch{}});
 for(const type of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(type,()=>{held.delete(name);button.classList.remove("held");});
}
function suspend(){clear();if(world.status==="running")pause(world);acc=0;update();}
document.addEventListener("visibilitychange",()=>{if(document.hidden)suspend();});
window.addEventListener("blur",suspend);
function camera(){
 const ship=world.ship,forward=rotate(ship.q,vec(1,0,0));
 const position=camMode==="chase"?add(ship.p,add(scale(forward,-195),vec(0,95,125))):add(ship.p,vec(-250,170,230));
 const target=add(ship.p,scale(forward,camMode==="chase"?115:70));
 const f=unit(sub(target,position));
 let right=unit(cross(f,vec(0,1,0)));
 if(length(right)<.01)right=vec(0,0,1);
 const up=unit(cross(right,f));
 return {position,f,right,up};
}
function project(p,c){
 const d=sub(p,c.position),z=dot(d,c.f);
 if(z<=8)return null;
 const k=620/z;
 return {x:480+dot(d,c.right)*k,y:270-dot(d,c.up)*k,z,k};
}
function circle(p,r,color,c,glow=0){
 const a=project(p,c);if(!a)return;
 const radius=Math.min(160,Math.max(1,r*a.k));
 ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=glow;
 ctx.beginPath();ctx.arc(a.x,a.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
}
function line(a,b,c,color="#456681",width=1){
 const pa=project(a,c),pb=project(b,c);if(!pa||!pb)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
}
function shipMesh(c){
 const s=world.ship;
 const points=[
 vec(25,0,0),vec(-18,0,-13),vec(-18,0,13),vec(-11,7,0),vec(-12,-6,0),
 vec(-14,0,-24),vec(-14,0,24)];
 const p=points.map(v=>project(add(s.p,rotate(s.q,v)),c));
 const faces=[[0,1,3],[0,3,2],[0,2,4],[0,4,1],[1,5,3],[2,3,6]];
 const ordered=faces.map(ids=>({ids,z:ids.reduce((sum,i)=>sum+(p[i]?.z||0),0)/3}))
  .sort((a,b)=>b.z-a.z);
 for(const {ids} of ordered){
  if(ids.some(i=>!p[i]))continue;
  ctx.beginPath();ctx.moveTo(p[ids[0]].x,p[ids[0]].y);
  for(let i=1;i<ids.length;i++)ctx.lineTo(p[ids[i]].x,p[ids[i]].y);
  ctx.closePath();ctx.fillStyle=ids.includes(4)?"#367ba8":"#78e9f1";
  ctx.strokeStyle="#d8fdff";ctx.lineWidth=1.4;ctx.fill();ctx.stroke();
 }
 const tail=add(s.p,rotate(s.q,vec(-21,0,0)));
 const flame=add(s.p,rotate(s.q,vec(-31-length(s.v)*.045,0,0)));
 if(world.status==="running")line(tail,flame,c,"#ffb36a",4);
}
const starSeed=Array.from({length:90},(_,i)=>vec((i*127)%1100-100,((i*179)%800)-400,((i*233)%700)-350));
function draw(){
 ctx.fillStyle="#050c19";ctx.fillRect(0,0,960,540);
 const c=camera();
 for(const p of starSeed)circle(p,1.4,"#829fbb",c);
 // World-coordinate reference grid makes depth and vertical movement legible.
 for(let z=-360;z<=360;z+=90)line(vec(-50,-170,z),vec(1090,-170,z),c,"#1a3450");
 for(let x=0;x<=1080;x+=90)line(vec(x,-170,-360),vec(x,-170,360),c,"#1a3450");
 line(vec(0,0,0),world.goal.p,c,"#285f73",2);
 circle(vec(0,0,0),48,"#2269b2",c,10);
 circle(world.moon.p,world.moon.r,"#9ba8b9",c,7);
 circle(world.goal.p,world.goal.r,"#d65b39",c,14);
 const rocks=world.obstacles.map(o=>({o,p:project(o.p,c)})).filter(v=>v.p).sort((a,b)=>b.p.z-a.p.z);
 for(const {o} of rocks)circle(o.p,o.r,"#9a8fa0",c,3);
 shipMesh(c);
 // Projected target reticle and range line.
 const goal=project(world.goal.p,c);
 if(goal){ctx.strokeStyle="#ffbf79";ctx.lineWidth=2;ctx.strokeRect(goal.x-8,goal.y-8,16,16);}
 ctx.fillStyle="#c1d9ec";ctx.font="15px system-ui";ctx.fillText("3D space / simulation time t="+world.time.toFixed(2)+" s",18,30);
 if(world.status!=="running"){
  ctx.fillStyle="rgba(3,9,21,.64)";ctx.fillRect(0,0,960,540);
  ctx.fillStyle="#f0fcff";ctx.textAlign="center";ctx.font="bold 38px system-ui";
  ctx.fillText(({ready:"READY TO LAUNCH",paused:"PAUSED",crashed:"SHIP LOST",won:"MARS REACHED",timeout:"TIME EXPIRED"})[world.status],480,255);
  ctx.font="19px system-ui";ctx.fillStyle="#b6d9e8";ctx.fillText("3 spatial axes + time · 3D ship orientation",480,294);ctx.textAlign="left";
 }
}
function update(){
 hud.state.textContent=world.status.toUpperCase();hud.clock.textContent=world.time.toFixed(2)+" s";
 hud.speed.textContent=length(world.ship.v).toFixed(1)+" units/s";
 hud.boost.textContent=String(world.boosts);
 hud.distance.textContent=Math.max(0,length(sub(world.goal.p,world.ship.p))-world.goal.r).toFixed(0)+" units";
 hud.attitude.textContent=world.ship.q.w.toFixed(2)+", "+world.ship.q.x.toFixed(2)+", "+world.ship.q.y.toFixed(2)+", "+world.ship.q.z.toFixed(2);
 hud.message.textContent=({ready:"Launch to begin",running:"Fly toward Mars; avoid the Moon and asteroids",paused:"Flight paused",crashed:"Collision detected — restart to try again",won:"Mars reached! Practice score "+world.score,timeout:"Time expired — restart"})[world.status];
 $("launch").disabled=world.status==="running"||world.status==="paused";
 $("launch").textContent=world.status==="ready"?"Launch":"New flight";
 $("pause").disabled=!["running","paused"].includes(world.status);
 $("pause").textContent=world.status==="paused"?"Resume":"Pause";
}
function frame(now){
 if(previous===null)previous=now;
 const delta=Math.max(0,Math.min(.1,(now-previous)/1000));previous=now;
 if(world.status==="running"){
  acc+=delta;let n=0;
  while(acc>=STEP&&n<6&&world.status==="running"){
   step(world,controls());boost=false;acc-=STEP;n++;
  }
  if(n===6)acc=0;
 }else acc=0;
 draw();update();requestAnimationFrame(frame);
}
update();requestAnimationFrame(frame);
if(new URLSearchParams(location.search).get("test")==="1")
 window.__space4dTest=Object.freeze({snapshot:()=>({status:world.status,t:world.time,p:{...world.ship.p},q:{...world.ship.q},boosts:world.boosts}),reset:begin});
