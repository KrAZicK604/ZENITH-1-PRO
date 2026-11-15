/** ZENITH ACE Vector FREE ROAM v5.
 * Three spatial arcade dimensions + elapsed simulation time.
 * Objects, separation and speed are fictional GAME UNITS, not NASA km.
 * No mandatory race, countdown, goal, collision-induced death, or awards.
 * Separate read-only ephemeris validation may be added after Gate 6 passes.
 */
import {basis} from './ace-flight-core.mjs';
export const ROAM=Object.freeze({dt:1/60,accel:150,strafe:105,rotYaw:1.55,rotPitch:1.30,rotRoll:2.8,
 maxSpeed:1100,boostMaxSpeed:1500,thermalRate:.47,coolRate:.31,
 maxSafeCoord:1e12});
export const DESTINATIONS=Object.freeze([
 Object.freeze({id:'earth',name:'Earth',x:0,y:0,z:0,radius:145,color:'#4baff6'}),
 Object.freeze({id:'moon',name:'Moon',x:2300,y:470,z:250,radius:67,color:'#d8e4ed'}),
 Object.freeze({id:'mars',name:'Mars',x:24000,y:-5100,z:2900,radius:140,color:'#f4845a'})
]);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const len=(v)=>Math.hypot(v.x,v.y,v.z);
const normalize=v=>{const r=len(v);return r>1e-12?{x:v.x/r,y:v.y/r,z:v.z/r}:{x:1,y:0,z:0};};
const axis=(positive,negative)=>Number(!!positive)-Number(!!negative);
const analog=v=>typeof v==='number'&&Number.isFinite(v)?clamp(v,-1,1):0;
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const point=v=>Object.freeze({x:v.x,y:v.y,z:v.z});
export function createRoam(seed=20261112){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('SEED_INVALID');
 return {seed,phase:'ready',ticks:0,targetIndex:1,beaconEnabled:true,
  ship:{x:340,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,pitch:0,roll:0,throttle:0,
   heat:0,burnerLocked:false,assist:false,burning:false},events:[]};
}
export function startRoam(f){if(f.phase==='ready')f.phase='running';return f;}
export function pauseRoam(f){if(f.phase==='running')f.phase='paused';else if(f.phase==='paused')f.phase='running';return f;}
export function resetRoam(f){return createRoam(f.seed);}
export const elapsed=f=>f.ticks*ROAM.dt;
export const velocity=f=>len({x:f.ship.vx,y:f.ship.vy,z:f.ship.vz});
export const destination=f=>DESTINATIONS[f.targetIndex];
export function navState(f){
 const ship=f.ship,goal=destination(f),d={x:goal.x-ship.x,y:goal.y-ship.y,z:goal.z-ship.z},
  range=len(d),b=basis(ship),n=normalize(d);
 return {target:goal.name,rangeGameUnits:range,
  direction:n,forwardAlignment:b.forward.x*n.x+b.forward.y*n.y+b.forward.z*n.z,
  relativeSpeed:(ship.vx*n.x+ship.vy*n.y+ship.vz*n.z),
  units:'game units, not km'};
}
export function stepRoam(f,input={}){
 if(f.phase!=='running')return f;
 const s=f.ship,dt=ROAM.dt;
 const yaw=clamp(axis(input.yawRight,input.yawLeft)+analog(input.yawAxis),-1,1);
 const pitch=clamp(axis(input.pitchUp,input.pitchDown)+analog(input.pitchAxis),-1,1);
 const roll=clamp(axis(input.rollRight,input.rollLeft)+analog(input.rollAxis),-1,1);
 s.yaw=angle(s.y+ROAM.rotYaw*yaw*dt);
 s.pitch=clamp(s.pitch+ROAM.rotPitch*pitch*dt,-1.4,1.4);
 s.roll=angle(s.roll+ROAM.rotRoll*roll*dt);
 if(input.toggleAssist)s.assist=!s.assist;
 if(s.assist&&!roll)s.roll=angle(s.roll*Math.exp(-1.5*dt));
 if(input.cycleTarget)f.targetIndex=(f.targetIndex+1)%DESTINATIONS.length;
 if(input.toggleBeacon)f.beaconEnabled=!f.beaconEnabled;
 s.throttle=clamp(s.throttle+axis(input.throttleUp,input.throttleDown)*.75*dt,0,1);
 if(input.engineCut)s.throttle=0;
 const b=basis(s),acc={x:0,y:0,z:0};
 const add=(v,k)=>{acc.x+=v.x*k;acc.y+=v.y*k;acc.z+=v.z*k;};
 add(b.forward,ROAM.accel*s.throttle);
 add(b.right,ROAM.strafe*axis(input.strafeRight,input.strafeLeft));
 add(b.up,ROAM.strafe*axis(input.liftUp,input.liftDown));
 if(s.burnerLocked&&s.heat<=.24)s.burnerLocked=false;
 s.burning=!!input.afterburner&&s.throttle>.02&&!s.burnerLocked&&!input.brake;
 if(s.burning){
  add(b.forward,260*s.throttle);
  s.heat=clamp(s.heat+ROAM.thermalRate*dt,0,1);
  if(s.heat>=.96)s.burnerLocked=true;
 }else s.heat=clamp(s.heat-ROAM.coolRate*dt,0,1);
 s.vx+=acc.x*dt;s.vy+=acc.y*dt;s.vz+=acc.z*dt;
 // Genuine free-drift option: no drag, engine-cut coast retains velocity.
 // Stability assist supplies optional arcade dampers, never forced.
 const drag=input.brake?2.8:(s.assist?.14:0);
 if(drag){const damp=Math.exp(-drag*dt);s.vx*=damp;s.vy*=damp;s.vz*=damp;}
 const v=velocity(f),cap=s.burning?ROAM.boostMaxSpeed:ROAM.maxSpeed;
 if(v>cap){const k=cap/v;s.vx*=k;s.vy*=k;s.vz*=k;}
 const delta={x:s.vx*dt,y:s.vy*dt,z:s.vz*dt};
 for(const key of ['x','y','z']){
  const newValue=s[key]+delta[key];
  if(!Number.isFinite(newValue)||Math.abs(newValue)>ROAM.maxSafeCoord){
   // Fail closed at finite-precision software limits, rather than
   // wrapping coordinates or claiming mathematically infinite space.
   f.phase='precision_limit';return f;
  }
 }
 s.x+=delta.x;s.y+=delta.y;s.z+=delta.z;
 f.ticks++;
 // Proximity is informational only; exploration never terminates at body.
 const goal=destination(f);
 if(Math.hypot(s.x-goal.x,s.y-goal.y,s.z-goal.z)<=goal.radius+300){
  if(!f.near)f.events.push({tick:f.ticks,type:'flyby',body:goal.id});
  f.near=goal.id;
 }else f.near=null;
 // Prevent unbounded memory in a long free-roam session.
 if(f.events.length>32)f.events.splice(0,f.events.length-32);
 return f;
}
