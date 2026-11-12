/** ACE Vector original software polygon renderer, no external assets or shaders.
 * All meshes and colors authored for ZENITH; retro arcade-inspired, not a copy.
 */
import { basis,selectedTarget,speed,simulationTime } from './ace-flight-core.mjs';
const TAU=Math.PI*2, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const random=rng(771993);
const stars=Array.from({length:270},()=>({x:random()*960,y:random()*540,r:.4+random()*1.4,a:.35+random()*.6}));
const SHIP=[
 [34,0,-1],[8,0,12],[-13,0,12],[-35,0,3],[-7,-13,0],[-7,13,0],
 [-20,-52,-4],[-20,52,-4],[-43,-36,-6],[-43,36,-6],[-13,0,-12],
 [-31,-12,-1],[-31,12,-1],[-40,-17,19],[-40,17,19]
];
const FACES=[
 {v:[0,4,1],c:'#d9f9ff'},{v:[0,1,5],c:'#90d9f2'},
 {v:[4,10,0],c:'#3f80ac'},{v:[0,10,5],c:'#2b658e'},
 {v:[4,6,8],c:'#ecf6fb'},{v:[4,8,11],c:'#5b9eae'},
 {v:[5,9,7],c:'#7ccce5'},{v:[5,12,9],c:'#316b94'},
 {v:[1,2,4],c:'#46aac8'},{v:[1,5,2],c:'#1678a1'},
 {v:[2,3,4],c:'#d3eeec'},{v:[2,5,3],c:'#629cb4'},
 {v:[3,13,11],c:'#f69268'},{v:[3,12,14],c:'#ffce89'},
 {v:[3,11,10],c:'#345c87'},{v:[3,10,12],c:'#27517f'}
];
function transform(ship,model){
 const b=basis(ship);
 const [x,y,z]=model;
 return {
  x:ship.x+b.forward.x*x+b.right.x*y+b.up.x*z,
  y:ship.y+b.forward.y*x+b.right.y*y+b.up.y*z,
  z:ship.z+b.forward.z*x+b.right.z*y+b.up.z*z
 };
}
function camera(ship){
 const yaw=ship.yaw*.72,pitch=ship.pitch*.57,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const forward={x:cy*cp,y:sy*cp,z:sp},right={x:-sy,y:cy,z:0},up={x:-cy*sp,y:-sy*sp,z:cp};
 return {pos:{x:ship.x-forward.x*220,y:ship.y-forward.y*220,z:ship.z-forward.z*220+40},forward,right,up};
}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
export function projection(point,cam){
 const rel={x:point.x-cam.pos.x,y:point.y-cam.pos.y,z:point.z-cam.pos.z};
 const depth=dot(rel,cam.forward);
 if(depth<=8)return null;
 const zoom=620/depth;
 return {x:480+dot(rel,cam.right)*zoom,y:270-dot(rel,cam.up)*zoom,k:zoom,d:depth};
}
function line(ctx,a,b,color,width=1){
 if(!a||!b)return;
 ctx.strokeStyle=color;ctx.lineWidth=width;
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
function circle(ctx,x,y,r,fill){
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();
}
function poly(ctx,points,fill,stroke=null){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let j=1;j<points.length;j++)ctx.lineTo(points[j].x,points[j].y);
 ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function ship(ctx,s,cam,t){
 const verts=SHIP.map(v=>projection(transform(s,v),cam));
 const faces=FACES.map((f,i)=>({...f,i,points:f.v.map(j=>verts[j])}))
  .filter(f=>f.points.every(Boolean))
  .sort((a,b)=>b.points.reduce((sum,p)=>sum+p.d,0)-a.points.reduce((sum,p)=>sum+p.d,0));
 ctx.save();
 ctx.shadowBlur=10;ctx.shadowColor='#51d9ff';
 for(const f of faces)poly(ctx,f.points,f.c,'#a5dcf3');
 ctx.shadowBlur=0;
 const canopy=[1,2,4,5].map(j=>verts[j]).filter(Boolean);
 if(canopy.length===4)poly(ctx,[canopy[0],canopy[2],canopy[1]],'#092d4f','#34e3fb');
 for(const y of [-11,11]){
  const nozzle=projection(transform(s,[-35,y,-2]),cam);
  if(!nozzle)continue;
  const r=clamp(nozzle.k*5,3,22);
  ctx.shadowColor=s.burning?'#ffb347':'#4be1ff';ctx.shadowBlur=s.burning?36:16;
  circle(ctx,nozzle.x,nozzle.y,r*(s.burning?1.4:1),'#36eaff');
  circle(ctx,nozzle.x,nozzle.y,r*.55,'#ffffff');
 }
 ctx.restore();
}
function rock(ctx,a,cam,t,i){
 const q=projection(a,cam);
 if(!q)return;
 const r=clamp(a.r*q.k,1,200);if(r<.8)return;
 const n=7,points=[];
 for(let j=0;j<n;j++){
  const ang=j*TAU/n+i*1.38+t*.13,rad=r*(j%2?.81:1.12);
  points.push({x:q.x+Math.cos(ang)*rad,y:q.y+Math.sin(ang)*rad});
 }
 poly(ctx,points,'#647e9d','#bbc9d8');
 const middle={x:q.x-r*.09,y:q.y-r*.11};
 for(let j=0;j<n;j++){
  poly(ctx,[middle,points[j],points[(j+1)%n]],j%2?'#576c89':'#8da3b3');
 }
}
function planet(ctx,p,cam,kind){
 const q=projection(p,cam);if(!q)return;
 const r=clamp(p.r*q.k,2,420);
 const palette=kind==='mars'?['#f19d62','#f16c53','#a93d47']:['#c6d8dd','#8ba3bf','#516883'];
 ctx.save();ctx.shadowColor=kind==='mars'?'#fa6a53':'#a7dcfa';ctx.shadowBlur=kind==='mars'?45:12;
 const gr=ctx.createRadialGradient(q.x-r*.35,q.y-r*.4,r*.1,q.x,q.y,r);
 gr.addColorStop(0,palette[0]);gr.addColorStop(.55,palette[1]);gr.addColorStop(1,palette[2]);
 circle(ctx,q.x,q.y,r,gr);ctx.shadowBlur=0;
 if(r>15){
  for(let i=0;i<6;i++){
   const theta=i*2.39;circle(ctx,q.x+Math.cos(theta)*r*.55,q.y+Math.sin(theta)*r*.4,Math.max(3,r*(.04+i%3*.03)),kind==='mars'?'rgba(99,29,31,.22)':'rgba(51,72,99,.27)');
  }
 }
 ctx.restore();
}
function crosshair(ctx,x,y,size,color){
 const r=clamp(size,12,80);ctx.strokeStyle=color;ctx.lineWidth=2;
 for(const dx of [-1,1])for(const dy of [-1,1]){
  ctx.beginPath();ctx.moveTo(x+dx*r,y+dy*r*.5);ctx.lineTo(x+dx*r,y+dy*r);
  ctx.lineTo(x+dx*r*.5,y+dy*r);ctx.stroke();
 }
}
function cockpitHud(ctx,f,cam){
 const s=f.ship,sel=f.targetIndex===0?f.goal:f.asteroids[f.targetIndex-1];
 const target=sel&&projection(sel,cam);
 ctx.save();
 // Reticle aligned to camera, not a simulated ballistic firing solution.
 ctx.strokeStyle='rgba(115,242,242,.85)';ctx.lineWidth=2;
 line(ctx,{x:464,y:270},{x:475,y:270},'#80eaff',2);
 line(ctx,{x:485,y:270},{x:496,y:270},'#80eaff',2);
 line(ctx,{x:480,y:255},{x:480,y:266},'#80eaff',2);
 line(ctx,{x:480,y:274},{x:480,y:286},'#80eaff',2);
 if(target&&target.x>-200&&target.x<1160&&target.y>-200&&target.y<740){
  const locked=f.targetStatus==='LOCK',color=locked?'#70ffc7':'#ffd07e';
  crosshair(ctx,target.x,target.y,locked?25:34,color);
  ctx.font='bold 14px monospace';ctx.fillStyle=color;
  ctx.fillText(selectedTarget(f)+' / '+f.targetStatus,clamp(target.x+28,10,750),clamp(target.y-27,20,500));
 }
 const bar=(x,y,w,percent,color,label)=>{
  ctx.fillStyle='#0d253f';ctx.fillRect(x,y,w,12);
  ctx.fillStyle=color;ctx.fillRect(x,y,w*clamp(percent,0,1),12);
  ctx.strokeStyle='#5c88a7';ctx.lineWidth=1;ctx.strokeRect(x,y,w,12);
  ctx.font='bold 12px monospace';ctx.fillStyle='#c6eaf8';ctx.fillText(label,x,y-5);
 };
 bar(22,70,170,s.shield/100,s.shield<40?'#ff665e':'#64e4cc','SHIELD '+Math.round(s.shield));
 bar(22,115,170,s.heat,s.heat>.8?'#fa745a':'#ffbb63','THERMAL '+Math.round(s.heat*100)+'%');
 bar(22,160,170,s.throttle,'#67c7ff','THROTTLE '+Math.round(s.throttle*100)+'%');
 ctx.font='bold 13px monospace';ctx.fillStyle='#a1eafb';
 ctx.fillText('AUX '+(s.assist?'STABILIZED':'INERTIAL'),22,201);
 ctx.fillText('VECTOR '+Math.round(speed(f))+' GU/S',22,224);
 ctx.fillText('MANEUVER PULSES '+f.boosts,22,247);
 // Spherical contact radar: lateral Y and vertical Z relative to player.
 const cx=839,cy=110,rr=77;
 circle(ctx,cx,cy,rr,'rgba(5,30,52,.82)');
 ctx.strokeStyle='#3b98ba';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.arc(cx,cy,rr,0,TAU);ctx.stroke();
 for(const r of [25,50]){ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.stroke();}
 line(ctx,{x:cx-rr,y:cy},{x:cx+rr,y:cy},'#387b91');
 line(ctx,{x:cx,y:cy-rr},{x:cx,y:cy+rr},'#387b91');
 const plot=(p,color,radius)=>{
  const dy=clamp((p.y-s.y)/3.5,-rr+6,rr-6);
  const dz=clamp((p.z-s.z)/3.5,-rr+6,rr-6);
  circle(ctx,cx+dy,cy-dz,radius,color);
 };
 plot(f.goal,'#ff9767',4);
 for(const a of f.asteroids)plot(a,'#d7dee9',2);
 circle(ctx,cx,cy,3,'#48e8ee');
 ctx.fillStyle='#b2e9f9';ctx.font='bold 12px monospace';ctx.fillText('CONTACT RADAR / Y-Z',761,210);
 ctx.fillStyle='#b9cee1';ctx.font='12px monospace';
 ctx.fillText('MISSION: REACH MARS / NO COMBAT',22,510);
 ctx.fillText('X '+s.x.toFixed(0)+'  Y '+s.y.toFixed(0)+'  Z '+s.z.toFixed(0)+'  t '+simulationTime(f).toFixed(1),520,510);
 ctx.restore();
}
export function renderAce(ctx,f,options={}){
 const time=simulationTime(f),W=ctx.canvas.width,H=ctx.canvas.height;
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#03071b');bg.addColorStop(.55,'#101f45');bg.addColorStop(1,'#271836');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 const cam=camera(f.ship);
 // Speed-streak parallax and a jewel-toned nebula made from original polygons.
 ctx.save();
 ctx.globalAlpha=.14;
 poly(ctx,[{x:0,y:410},{x:180,y:140},{x:410,y:315},{x:600,y:70},{x:890,y:360},{x:960,y:540},{x:0,y:540}],'#7b48ad');
 poly(ctx,[{x:200,y:540},{x:430,y:250},{x:690,y:490},{x:960,y:140},{x:960,y:540}],'#356bc4');
 ctx.restore();
 const movement=speed(f);
 for(const st of stars){
  const sx=(st.x-time*movement*.11)%W;
  const x=sx<0?sx+W:sx;
  ctx.fillStyle='rgba(221,238,255,'+st.a+')';
  ctx.fillRect(x,st.y,st.r+(f.ship.burning?7:0),st.r);
 }
 ctx.save();
 for(let x=160;x<1100;x+=145){
  const corners=[{x,y:-280,z:-240},{x,y:280,z:-240},{x,y:280,z:240},{x,y:-280,z:240}];
  for(let i=0;i<4;i++)line(ctx,projection(corners[i],cam),projection(corners[(i+1)%4],cam),'rgba(73,196,225,.13)');
 }
 ctx.restore();
 const objects=[
  {kind:'moon',pos:f.moon,depth:projection(f.moon,cam)?.d??-1000},
  {kind:'mars',pos:f.goal,depth:projection(f.goal,cam)?.d??-1000},
  ...f.asteroids.map((a,i)=>({kind:'rock',pos:a,i,depth:projection(a,cam)?.d??-1000}))
 ].filter(o=>o.depth>8).sort((a,b)=>b.depth-a.depth);
 for(const o of objects){
  if(o.kind==='rock')rock(ctx,o.pos,cam,time,o.i);
  else planet(ctx,o.pos,cam,o.kind);
 }
 ship(ctx,f.ship,cam,time);
 cockpitHud(ctx,f,cam);
 if(f.phase!=='running'){
  ctx.fillStyle='rgba(2,8,20,.42)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.font='900 38px system-ui';ctx.fillStyle='#e9fbff';
  ctx.fillText(({ready:'VECTOR SYSTEMS READY',paused:'FLIGHT PAUSED',won:'MARS APPROACH COMPLETE',crashed:'SHIP LOST',timeout:'MISSION CLOCK EXPIRED'})[f.phase],W/2,H/2-10);
  ctx.font='bold 16px system-ui';ctx.fillStyle='#afdeef';
  ctx.fillText(f.phase==='ready'?'Launch to begin 4D arcade flight':'Restart to fly again',W/2,H/2+23);
 }
}
