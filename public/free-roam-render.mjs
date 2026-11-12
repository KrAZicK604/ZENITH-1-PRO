/** Perspective 3D renderer for the original ACE Vector craft in free space.
 * Positions and radii are game units, NOT real planet size or distance.
 */
import {basis} from './ace-flight-core.mjs';
import {DESTINATIONS,navState,velocity,elapsed} from './free-roam-core.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
function rand(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const rng=rand(420131),stars=Array.from({length:640},()=>{
 const az=rng()*Math.PI*2,u=rng()*2-1,rad=Math.sqrt(1-u*u);
 return{x:Math.cos(az)*rad,y:Math.sin(az)*rad,z:u,r:.3+1.4*rng(),a:.2+.6*rng()};
});
const MESH=[
 [40,0,0], [8,0,13],[-23,0,13],[-43,0,5],
 [-4,-15,0],[-4,15,0],[-20,-60,-6],[-20,60,-6],
 [-47,-36,-7],[-47,36,-7],[-15,0,-11],
 [-34,-12,3],[-34,12,3],[-45,-16,18],[-45,16,18]
];
const FACES=[
 [[0,4,1],'#c6f4ff'],[[0,1,5],'#6fb2e0'],[[0,10,4],'#3189bc'],
 [[0,5,10],'#0a659a'],[[4,6,8],'#e6f5ff'],[[5,9,7],'#50b5d8'],
 [[8,11,4],'#527793'],[[9,5,12],'#2c7299'],
 [[1,4,2],'#377ca5'],[[1,2,5],'#8ec8db'],[[2,4,3],'#98d9ea'],
 [[2,3,5],'#296d9f'],[[3,11,13],'#ef854d'],[[3,14,12],'#ffc185']
];
function camera(ship){
 const b=basis(ship),follow=260;
 return {pos:{x:ship.x-b.forward.x*follow+b.up.x*75,
              y:ship.y-b.forward.y*follow+b.up.y*75,
              z:ship.z-b.forward.z*follow+b.up.z*75},
         forward:b.forward,right:b.right,up:b.up};
}
export function project(point,cam){
 const d={x:point.x-cam.pos.x,y:point.y-cam.pos.y,z:point.z-cam.pos.z};
 const depth=dot(d,cam.forward);
 if(depth<5)return null;
 const k=665/depth;
 return {x:480+dot(d,cam.right)*k,y:270-dot(d,cam.up)*k,k,depth};
}
function transform(ship,vertex){
 const [x,y,z]=vertex,b=basis(ship);
 return {x:ship.x+b.forward.x*x+b.right.x*y+b.up.x*z,
         y:ship.y+b.forward.y*x+b.right.y*y+b.up.y*z,
         z:ship.z+b.forward.z*x+b.right.z*y+b.up.z*z};
}
function polygon(ctx,mesh,indices,color){
 const p=indices.map(i=>mesh[i]);
 if(p.some(q=>!q))return;
 ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
 for(let j=1;j<p.length;j++)ctx.lineTo(p[j].x,p[j].y);
 ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#c5f2fa';
 ctx.lineWidth=1.2;ctx.stroke();
}
function starLayer(ctx,cam){
 for(const s of stars){
  const x=dot(s,cam.forward);
  if(x<.005)continue;
  const xp=480+dot(s,cam.right)/x*610,yp=270-dot(s,cam.up)/x*610;
  if(xp<-3||xp>963||yp<-3||yp>543)continue;
  ctx.globalAlpha=s.a;ctx.fillStyle='#def7ff';ctx.fillRect(xp,yp,s.r,s.r);
 }
 ctx.globalAlpha=1;
}
function drawBody(ctx,body,cam,highlight){
 const p=project(body,cam);if(!p)return;
 const r=clamp(body.radius*p.k,1.5,1800);
 if(p.x+r<0||p.x-r>960||p.y+r<0||p.y-r>540)return;
 const light=ctx.createRadialGradient(p.x-r*.42,p.y-r*.47,1,p.x,p.y,r);
 light.addColorStop(0,'#f4faff');light.addColorStop(.11,body.color);
 light.addColorStop(.8,body.color);light.addColorStop(1,'#1c294a');
 ctx.fillStyle=light;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=highlight?'#8cfff0':'#617c93';
 ctx.lineWidth=highlight?3:1.2;ctx.stroke();
 if(r>7&&r<1100){
  ctx.fillStyle='#d9f4ff';ctx.font='bold 14px system-ui';ctx.textAlign='center';
  ctx.fillText(body.name.toUpperCase(),p.x,p.y+Math.min(150,r)+17);
 }
}
function navArrow(ctx,body,ship,cam){
 const dx=body.x-ship.x,dy=body.y-ship.y,dz=body.z-ship.z;
 const dir={x:dx,y:dy,z:dz},distance=Math.hypot(dx,dy,dz)||1;
 const ax=dot(dir,cam.right)/distance,ay=dot(dir,cam.up)/distance,front=dot(dir,cam.forward)/distance;
 // Off-axis direction cue, including targets currently behind camera.
 const angle=Math.atan2(-ay,ax)+(front<0?Math.PI:0);
 const x=480+Math.cos(angle)*clamp(335,0,330),y=270+Math.sin(angle)*205;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 ctx.fillStyle='#8bfff0';ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(-8,-8);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();
 ctx.restore();
}
export function renderRoam(ctx,f){
 const ship=f.ship,w=960,h=540,cam=camera(ship);
 const g=ctx.createLinearGradient(0,0,w,h);
 g.addColorStop(0,'#04091b');g.addColorStop(.55,'#061a31');g.addColorStop(1,'#140e2d');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 starLayer(ctx,cam);
 const target=DESTINATIONS[f.targetIndex];
 const sorted=[...DESTINATIONS].sort((a,b)=>{
  const da=(a.x-ship.x)**2+(a.y-ship.y)**2+(a.z-ship.z)**2;
  const db=(b.x-ship.x)**2+(b.y-ship.y)**2+(b.z-ship.z)**2;
  return db-da;
 });
 for(const body of sorted)drawBody(ctx,body,cam,f.beaconEnabled&&body.id===target.id);
 if(f.beaconEnabled)navArrow(ctx,target,ship,cam);
 // Retro low-polygon original fighter, rendered from true yaw/pitch/roll.
 const points=MESH.map(v=>project(transform(ship,v),cam));
 const ordered=FACES.map(([face,color])=>({face,color,d:face.reduce((a,i)=>a+(points[i]?.depth||0),0)})).sort((a,b)=>b.d-a.d);
 for(const a of ordered)polygon(ctx,points,a.face,a.color);
 ctx.textAlign='left';ctx.fillStyle='#89deee';ctx.font='bold 15px ui-monospace,monospace';
 ctx.fillText('ACE VECTOR // OPEN SPACE // 3D + t',20,28);
 ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#b9d8ed';
 ctx.fillText('ARCADE UNITS · NO REAL SCALE',20,47);
 const nav=navState(f);
 ctx.fillStyle='rgba(3,16,31,.68)';ctx.fillRect(16,450,440,72);
 ctx.font='bold 14px ui-monospace,monospace';ctx.fillStyle='#9af5df';
 ctx.fillText('BEACON '+nav.target.toUpperCase()+'  '+nav.rangeGameUnits.toFixed(0)+' gu',27,476);
 ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#c4d9e9';
 ctx.fillText('SPD '+velocity(f).toFixed(1)+' gu/s  |  t '+elapsed(f).toFixed(1)+' s  |  '+(ship.assist?'DAMPERS ON':'INERTIAL DRIFT'),27,503);
 if(f.phase!=='running'){
  ctx.fillStyle='rgba(3,11,23,.50)';ctx.fillRect(0,0,w,h);
  ctx.textAlign='center';ctx.font='bold 33px system-ui';ctx.fillStyle='#e4fcff';
  const status={ready:'OPEN SPACE — READY',paused:'FLIGHT PAUSED',precision_limit:'PRECISION LIMIT — RESTART'};
  ctx.fillText(status[f.phase]||f.phase.toUpperCase(),480,250);
  ctx.font='15px system-ui';ctx.fillText(f.phase==='ready'?'Launch to explore. No destination is required.':'',480,282);
 }
}
