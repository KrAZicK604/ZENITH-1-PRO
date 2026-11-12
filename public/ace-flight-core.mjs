/** ZENITH ACE Vector: original low-polygon tactical arcade flight.
 * 4D world state = (x,y,z,t). 3D orientation uses yaw,pitch,roll.
 * All quantities are game units and simulated, not military avionics.
 * No network, billing, external weapons, or trusted competitive rewards.
 */
import { RULES as BASE, createFlight, collisionAlongStep } from './game-4d-core.mjs';
export const ACE=Object.freeze({
 dt:BASE.dt,maxTicks:BASE.maxTicks,maxSpeed:174,burnerSpeed:252,
 turnYaw:1.40,turnPitch:1.20,turnRoll:2.55,
 boostHeatRate:.49,coolRate:.31,shieldDamage:44,
 hitCooldownTicks:72
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=a=>Math.hypot(a.x,a.y,a.z);
export function basis(ship){
 const cy=Math.cos(ship.yaw),sy=Math.sin(ship.yaw),cp=Math.cos(ship.pitch),sp=Math.sin(ship.pitch),cr=Math.cos(ship.roll),sr=Math.sin(ship.roll);
 return {
  forward:{x:cy*cp,y:sy*cp,z:sp},
  right:{x:-cy*sp*sr-sy*cr,y:-sy*sp*sr+cy*cr,z:cp*sr},
  up:{x:-cy*sp*cr+sy*sr,y:-sy*sp*cr-cy*sr,z:cp*cr}
 };
}
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function createAce(seed=20261112){
 const f=createFlight(seed);
 f.ship.vx=38;f.ship.vy=0;f.ship.vz=0;
 f.ship.yaw=0;f.ship.pitch=0;f.ship.roll=0;
 f.ship.throttle=.63;f.ship.shield=100;f.ship.heat=0;
 f.ship.burnerLocked=false;f.ship.assist=true;f.ship.hitCooldown=0;
 f.ship.burning=false;
 f.targetIndex=0;f.targetQuality=0;f.targetStatus='SEARCH';
 f.phase='ready';f.score=0;
 return f;
}
export function startAce(f){if(f.phase==='ready')f.phase='running';return f;}
export function pauseAce(f){
 if(f.phase==='running')f.phase='paused';
 else if(f.phase==='paused')f.phase='running';
 return f;
}
export function resetAce(f){return createAce(f.seed);}
function targetFor(f){
 return f.targetIndex===0?{id:'MARS',point:f.goal}:
 {id:'DEBRIS-'+String(f.targetIndex).padStart(2,'0'),point:f.asteroids[f.targetIndex-1]};
}
export function selectedTarget(f){return targetFor(f).id;}
function updateRadar(f){
 const s=f.ship,b=basis(s),p=targetFor(f).point;
 if(!p){f.targetQuality=0;f.targetStatus='LOST';return;}
 const delta={x:p.x-s.x,y:p.y-s.y,z:p.z-s.z};
 const d=norm(delta);
 const cos=d>1e-8?dot(delta,b.forward)/d:-1;
 const aligned=cos>=Math.cos(24*Math.PI/180)&&d<750&&d>15;
 // Smooth acquisition; not a real sensor model, nor a combat fire solution.
 f.targetQuality=clamp(f.targetQuality+(aligned?1.4:-2.5)*ACE.dt,0,1);
 f.targetStatus=f.targetQuality>=.95?'LOCK':aligned?'ACQUIRING':'SEARCH';
}
function hit(f,cost){
 const s=f.ship;
 if(s.hitCooldown>0)return;
 s.shield=Math.max(0,s.shield-cost);
 s.hitCooldown=ACE.hitCooldownTicks;
 s.vx*=-.32;s.vy*=-.32;s.vz*=-.32;
 if(s.shield===0)f.phase='crashed';
}
export function stepAce(f,input={}){
 if(f.phase!=='running')return f;
 const s=f.ship,dt=ACE.dt,old={x:s.x,y:s.y,z:s.z};
 const axis=(plus,minus)=>Number(Boolean(plus))-Number(Boolean(minus));
 // True independent rotational controls.
 const analog=v=>typeof v==='number'&&Number.isFinite(v)?clamp(v,-1,1):0;
 const yaw=clamp(axis(input.yawRight,input.yawLeft)+analog(input.yawAxis),-1,1);
 const pitch=clamp(axis(input.pitchUp,input.pitchDown)+analog(input.pitchAxis),-1,1);
 const roll=clamp(axis(input.rollRight,input.rollLeft)+analog(input.rollAxis),-1,1);
 s.yaw=angle(s.yaw+yaw*ACE.turnYaw*dt);
 s.pitch=clamp(s.pitch+pitch*ACE.turnPitch*dt,-1.38,1.38);
 s.roll=angle(s.roll+roll*ACE.turnRoll*dt);
 if(s.assist&&!roll)s.roll=angle(s.roll*Math.exp(-1.0*dt));
 if(input.toggleAssist)s.assist=!s.assist;
 if(input.cycleTarget){
  f.targetIndex=(f.targetIndex+1)%(f.asteroids.length+1);
  f.targetQuality=0;f.targetStatus='SEARCH';
 }
 s.throttle=clamp(s.throttle+axis(input.throttleUp,input.throttleDown)*.65*dt,0,1);
 const b=basis(s),accel={x:0,y:0,z:0};
 const add=(v,k)=>{accel.x+=v.x*k;accel.y+=v.y*k;accel.z+=v.z*k;};
 // Arcade thrusters; separate six-degree-of-freedom translation.
 add(b.forward,24+60*s.throttle);
 add(b.right,axis(input.strafeRight,input.strafeLeft)*68);
 add(b.up,axis(input.liftUp,input.liftDown)*68);
 s.burning=false;
 if(s.burnerLocked&&s.heat<=.27)s.burnerLocked=false;
 if(input.afterburner&&!s.burnerLocked&&s.heat<.97&&!input.brake){
  s.burning=true;add(b.forward,170);
  s.heat=clamp(s.heat+ACE.boostHeatRate*dt,0,1);
  if(s.heat>=.97)s.burnerLocked=true;
 }else s.heat=clamp(s.heat-ACE.coolRate*dt,0,1);
 // A one-shot defensive maneuver pulse spends a discrete resource.
 if(input.pulse&&f.boosts>0){
  const v=norm({x:s.vx,y:s.vy,z:s.vz}),direction=v>1?{x:s.vx/v,y:s.vy/v,z:s.vz/v}:b.forward;
  s.vx+=direction.x*48;s.vy+=direction.y*48;s.vz+=direction.z*48;f.boosts--;
 }
 const moonDelta={x:f.moon.x-s.x,y:f.moon.y-s.y,z:f.moon.z-s.z};
 const d=norm(moonDelta);
 if(d>1e-6)add(moonDelta,Math.min(64,f.moon.mu/(d*d+950))/d);
 // Damped translation with optional inertial assist, not an autopilot.
 s.vx+=accel.x*dt;s.vy+=accel.y*dt;s.vz+=accel.z*dt;
 const brake=!!input.brake,drag=Math.exp(-(brake ? 3.3 : (s.assist ? 0.44 : 0.07))*dt);
 const longitudinal=dot({x:s.vx,y:s.vy,z:s.vz},b.forward);
 if(s.assist&&!brake){
  // Dampen lateral drift while preserving forward velocity.
  const rate=1-Math.exp(-.82*dt);
  s.vx+=(b.forward.x*longitudinal-s.vx)*rate;
  s.vy+=(b.forward.y*longitudinal-s.vy)*rate;
  s.vz+=(b.forward.z*longitudinal-s.vz)*rate;
 }
 s.vx*=drag;s.vy*=drag;s.vz*=drag;
 const speed=norm({x:s.vx,y:s.vy,z:s.vz}),cap=s.burning?ACE.burnerSpeed:ACE.maxSpeed;
 if(speed>cap){const k=cap/speed;s.vx*=k;s.vy*=k;s.vz*=k;}
 s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
 for(const key of ['x','y','z']){
  const [lo,hi]=BASE.arena[key],v='v'+key;
  if(s[key]<lo+s.r||s[key]>hi-s.r){s[key]=clamp(s[key],lo+s.r,hi-s.r);s[v]*=-.25;}
 }
 const oldAst=f.asteroids.map(a=>({x:a.x,y:a.y,z:a.z}));
 for(const a of f.asteroids){
  for(const key of ['x','y','z']){
   const [lo,hi]=BASE.arena[key],v='v'+key;a[key]+=a[v]*dt;
   if(a[key]<lo+a.r||a[key]>hi-a.r){a[key]=clamp(a[key],lo+a.r,hi-a.r);a[v]*=-1;}
  }
 }
 if(s.hitCooldown>0)s.hitCooldown--;
 f.ticks++;
 const moonHit=collisionAlongStep(old,s,f.moon,f.moon,s.r+f.moon.r);
 const asteroidHit=f.asteroids.some((a,i)=>collisionAlongStep(old,s,oldAst[i],a,s.r+a.r));
 const goalHit=collisionAlongStep(old,s,f.goal,f.goal,s.r+f.goal.r-5);
 if(moonHit)hit(f,100);
 else if(asteroidHit)hit(f,ACE.shieldDamage);
 // Damage and obstacle collision take priority over completing the course.
 if(!moonHit&&!asteroidHit&&goalHit&&f.phase==='running'){
  f.phase='won';f.score=Math.max(100,Math.round(2500-f.ticks/60*12+s.shield*3+f.boosts*90));
 }
 if(f.ticks>=ACE.maxTicks&&f.phase==='running')f.phase='timeout';
 updateRadar(f);
 return f;
}
export const simulationTime=f=>f.ticks*ACE.dt;
export const speed=f=>norm({x:f.ship.vx,y:f.ship.vy,z:f.ship.vz});
