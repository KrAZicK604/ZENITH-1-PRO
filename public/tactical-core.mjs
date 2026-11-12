/** ZENITH tactical flight v3 — original low-poly arcade space-combat prototype.
 * 3D translational and rotational state plus time. No weapons or real military system.
 * Deterministic, offline, non-authoritative simulation. */
export const FLIGHT=Object.freeze({dt:1/60,maxTicks:5400,maxSpeed:310,shipRadius:12,arena:{x:[-90,1500],y:[-450,450],z:[-350,350]}});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mag=v=>Math.hypot(v.x,v.y,v.z);
const norm=v=>{const m=mag(v)||1;return{x:v.x/m,y:v.y/m,z:v.z/m};};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const add=(a,b,k=1)=>({x:a.x+b.x*k,y:a.y+b.y*k,z:a.z+b.z*k});
export function axes(yaw,pitch,roll){
 const f={x:Math.cos(pitch)*Math.cos(yaw),y:Math.cos(pitch)*Math.sin(yaw),z:Math.sin(pitch)};
 const r0={x:-Math.sin(yaw),y:Math.cos(yaw),z:0};
 const u0=cross(f,r0);
 const r=add(r0,u0,0); // roll around ship's forward axis
 const right=add({x:r.x*Math.cos(roll),y:r.y*Math.cos(roll),z:r.z*Math.cos(roll)},u0,Math.sin(roll));
 const up=cross(f,right);
 return {forward:f,right,up};
}
function rng(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function createMission(seed=20261112){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('invalid seed');
 const random=rng(seed),debris=[];
 for(let i=0;i<16;i++)debris.push({x:260+random()*900,y:(random()-.5)*700,z:(random()-.5)*520,r:11+random()*20,vx:(random()-.5)*13,vy:(random()-.5)*13,vz:(random()-.5)*13});
 return {seed,phase:'ready',ticks:0,score:0,integrity:100,boosts:3,afterburner:0,
  ship:{x:30,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,pitch:0,roll:0,throttle:.55},
  target:{x:1330,y:0,z:0,r:60},debris};
}
export const time=s=>s.ticks*FLIGHT.dt;
export function start(s){if(s.phase==='ready')s.phase='running';return s;}
export function pause(s){if(s.phase==='running')s.phase='paused';else if(s.phase==='paused')s.phase='running';return s;}
export function reset(s){return createMission(s.seed);}
export function segmentHit(a,b,c,d,r){
 const p={x:a.x-c.x,y:a.y-c.y,z:a.z-c.z},v={x:b.x-a.x-(d.x-c.x),y:b.y-a.y-(d.y-c.y),z:b.z-a.z-(d.z-c.z)};
 const vv=dot(v,v),t=vv>1e-12?clamp(-dot(p,v)/vv,0,1):0;
 return mag(add(p,v,t))<=r;
}
export function step(s,cmd={}){
 if(s.phase!=='running')return s;
 const dt=FLIGHT.dt,p=s.ship,prev={x:p.x,y:p.y,z:p.z};
 const input=k=>Number(Boolean(cmd[k]));
 // Three-axis aircraft-like attitude controls: yaw, pitch and bank.
 const yaw=input('yawRight')-input('yawLeft');
 const pitch=input('pitchUp')-input('pitchDown');
 const bank=input('rollRight')-input('rollLeft');
 p.yaw+=yaw*.92*dt;p.pitch=clamp(p.pitch+pitch*.82*dt,-1.25,1.25);
 p.roll=clamp(p.roll+bank*1.65*dt,-1.4,1.4);
 if(!bank)p.roll*=Math.exp(-.6*dt);
 p.throttle=clamp(p.throttle+(input('throttleUp')-input('throttleDown'))*.35*dt,.1,1);
 const basis=axes(p.yaw,p.pitch,p.roll);
 const thrust=80+165*p.throttle;
 let boost=0;
 if(cmd.boost&&s.boosts>0){s.boosts--;s.afterburner=60;}
 if(s.afterburner>0){boost=165;s.afterburner--;}
 p.vx+=basis.forward.x*(thrust+boost)*dt;
 p.vy+=basis.forward.y*(thrust+boost)*dt;
 p.vz+=basis.forward.z*(thrust+boost)*dt;
 // Strafing is an arcade maneuvering assist; not a physical aircraft control.
 const strafe=(input('strafeRight')-input('strafeLeft'))*125;
 const lift=(input('ascend')-input('descend'))*125;
 for(const k of ['x','y','z'])p['v'+k]+=(basis.right[k]*strafe+basis.up[k]*lift)*dt;
 const drag=Math.exp(-.95*dt);p.vx*=drag;p.vy*=drag;p.vz*=drag;
 const speed=Math.hypot(p.vx,p.vy,p.vz);
 if(speed>FLIGHT.maxSpeed){const q=FLIGHT.maxSpeed/speed;p.vx*=q;p.vy*=q;p.vz*=q;}
 for(const k of ['x','y','z']){
  p[k]+=p['v'+k]*dt;
  const [lo,hi]=FLIGHT.arena[k];
  if(p[k]<lo+FLIGHT.shipRadius||p[k]>hi-FLIGHT.shipRadius){p[k]=clamp(p[k],lo+FLIGHT.shipRadius,hi-FLIGHT.shipRadius);p['v'+k]*=-.2;}
 }
 const old=s.debris.map(d=>({x:d.x,y:d.y,z:d.z}));
 for(const d of s.debris)for(const k of ['x','y','z']){
  const [lo,hi]=FLIGHT.arena[k];d[k]+=d['v'+k]*dt;
  if(d[k]<lo+d.r||d[k]>hi-d.r){d[k]=clamp(d[k],lo+d.r,hi-d.r);d['v'+k]*=-1;}
 }
 s.ticks++;
 const impact=s.debris.some((d,i)=>segmentHit(prev,p,old[i],d,FLIGHT.shipRadius+d.r));
 const arrived=segmentHit(prev,p,s.target,s.target,FLIGHT.shipRadius+s.target.r-8);
 // Collisions always take priority over mission completion.
 if(impact){s.integrity=0;s.phase='crashed';}
 else if(arrived){s.phase='won';s.score=Math.max(100,Math.round(3000-time(s)*15+s.boosts*160));}
 else if(s.ticks>=FLIGHT.maxTicks)s.phase='timeout';
 return s;
}
export function telemetry(s){
 const p=s.ship,b=axes(p.yaw,p.pitch,p.roll);
 const speed=Math.hypot(p.vx,p.vy,p.vz);
 const delta={x:s.target.x-p.x,y:s.target.y-p.y,z:s.target.z-p.z};
 return {speed,heading:p.yaw*180/Math.PI,pitch:p.pitch*180/Math.PI,bank:p.roll*180/Math.PI,range:mag(delta),
  targetBearing:Math.atan2(dot(delta,b.right),dot(delta,b.forward))*180/Math.PI,
  targetElevation:Math.atan2(dot(delta,b.up),Math.hypot(dot(delta,b.forward),dot(delta,b.right)))*180/Math.PI,
  throttle:p.throttle,integrity:s.integrity};
}
