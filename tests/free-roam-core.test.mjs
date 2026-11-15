import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROAM,DESTINATIONS,createRoam,startRoam,pauseRoam,resetRoam,stepRoam,elapsed,
  velocity,destination,navState} from '../public/free-roam-core.mjs';
import {project} from '../public/free-roam-render.mjs';

test('free-roam begins parked, with zero throttle and velocity',()=>{
 const f=createRoam();assert.equal(f.phase,'ready');assert.equal(f.ship.throttle,0);
 assert.equal(velocity(f),0);assert.equal(f.ship.assist,false);assert.equal(f.targetIndex,1);
});
test('deterministic construction and uint32 seed gate',()=>{
 assert.deepEqual(createRoam(28),createRoam(28));
 for(const seed of [-1,2**32,NaN,2.5,Infinity])assert.throws(()=>createRoam(seed));
});
test('ready and paused freeze all physics',()=>{
 const f=createRoam();stepRoam(f,{throttleUp:true});assert.equal(f.ticks,0);
 startRoam(f);pauseRoam(f);stepRoam(f,{afterburner:true});
 assert.equal(f.ticks,0);assert.equal(f.ship.heat,0);
 pauseRoam(f);assert.equal(f.phase,'running');
});
test('idle ship remains stationary even after 2 hours of simulation',()=>{
 const f=createRoam();startRoam(f);
 for(let i=0;i<432000;i++)stepRoam(f);
 assert.equal(f.phase,'running');assert.equal(f.ship.x,340);
 assert.equal(velocity(f),0);assert.equal(elapsed(f),7200);
});
test('pure inertial drift persists after engine cut',()=>{
 const f=createRoam();startRoam(f);
 for(let i=0;i<120;i++)stepRoam(f,{throttleUp:true});
 stepRoam(f,{engineCut:true});assert.equal(f.ship.throttle,0);
 const v=velocity(f),before=f.ship.x;assert.ok(v>0);
 for(let i=0;i<600;i++)stepRoam(f);
 assert.ok(Math.abs(velocity(f)-v)<1e-8);
 assert.ok(f.ship.x>before+1);
});
test('flight stabilizers are opt-in, drag only when on',()=>{
 const a=createRoam(),b=createRoam();startRoam(a);startRoam(b);
 a.ship.vy=100;b.ship.vy=100;
 stepRoam(b,{toggleAssist:true});
 for(let i=0;i<120;i++){stepRoam(a);stepRoam(b);}
 assert.ok(Math.abs(a.ship.vy-100)<1e-8);
 assert.ok(Math.abs(b.ship.vy)<99);
});
test('braking decreases speed without making player complete race',()=>{
 const f=createRoam();startRoam(f);f.ship.vx=250;
 const before=velocity(f);for(let i=0;i<50;i++)stepRoam(f,{brake:true});
 assert.ok(velocity(f)<before/3);assert.equal(f.phase,'running');
});
test('pitch yaw roll rotate craft independently',()=>{
 const f=createRoam();startRoam(f);
 stepRoam(f,{yawRight:true,pitchUp:true,rollLeft:true});
 assert.ok(f.ship.yaw>0&&f.ship.pitch>0&&f.ship.roll<0);
});
test('3D translational thrusters move along independent axes',()=>{
 const f=createRoam();startRoam(f);
 stepRoam(f,{strafeRight:true,liftUp:true});
 assert.ok(f.ship.y>0&&f.ship.z>0);
 assert.equal(f.ship.x,340);
});
test('gamepad analog orientation clamps invalid inputs',()=>{
 const f=createRoam();startRoam(f);
 stepRoam(f,{yawAxis:999,pitchAxis:NaN,rollAxis:Infinity});
 assert.ok(Math.abs(f.ship.yaw-ROAM.rotYaw*ROAM.dt)<1e-9);
 assert.equal(f.ship.pitch,0);assert.equal(f.ship.roll,0);
});
test('throttle bounds clamp and engine cut is immediate',()=>{
 const f=createRoam();startRoam(f);
 for(let i=0;i<180;i++)stepRoam(f,{throttleUp:true});
 assert.equal(f.ship.throttle,1);
 for(let i=0;i<200;i++)stepRoam(f,{throttleDown:true});
 assert.equal(f.ship.throttle,0);
 stepRoam(f,{throttleUp:true,engineCut:true});assert.equal(f.ship.throttle,0);
});
test('afterburner adds heat and thermal lockout prevents continuous boosting',()=>{
 const f=createRoam();startRoam(f);f.ship.throttle=1;
 let locked=false;
 for(let i=0;i<250;i++){stepRoam(f,{afterburner:true});locked||=f.ship.burnerLocked;}
 assert.equal(locked,true);assert.ok(f.ship.heat>=0&&f.ship.heat<=1);
 for(let i=0;i<200;i++)stepRoam(f);
 assert.equal(f.ship.burnerLocked,false);
});
test('speed remains capped under sustained high-g commands',()=>{
 const f=createRoam();startRoam(f);f.ship.throttle=1;
 for(let i=0;i<24000;i++) {
  stepRoam(f,{yawRight:i%11===0,afterburner:i%3===0,strafeRight:true,liftUp:i%6===0});
  assert.ok(velocity(f)<=ROAM.boostMaxSpeed+1e-8);
 }
});
test('no short course walls and no 90-second expiry',()=>{
 const f=createRoam();startRoam(f);f.ship.x=1000;f.ship.vx=450;
 for(let i=0;i<20000;i++)stepRoam(f);
 assert.ok(f.ship.x>20000);assert.equal(f.phase,'running');assert.ok(elapsed(f)>90);
});
test('Moon and Mars are optional beacons; selection cycles',()=>{
 const f=createRoam();startRoam(f);
 assert.equal(destination(f).name,'Moon');
 stepRoam(f,{cycleTarget:true});assert.equal(destination(f).name,'Mars');
 stepRoam(f,{cycleTarget:true});assert.equal(destination(f).name,'Earth');
 stepRoam(f,{cycleTarget:true});assert.equal(destination(f).name,'Moon');
 const n=navState(f);assert.equal(n.units,'game units, not km');
 assert.ok(n.rangeGameUnits>0&&n.rangeGameUnits<1e6);
});
test('beacons can be hidden without affecting flight',()=>{
 const f=createRoam();startRoam(f);
 stepRoam(f,{toggleBeacon:true});assert.equal(f.beaconEnabled,false);
 const prev=f.ticks;stepRoam(f);assert.equal(f.ticks,prev+1);
});
test('Moon flyby never triggers a win or compulsory landing',()=>{
 const f=createRoam();startRoam(f);const moon=DESTINATIONS[1];
 f.ship.x=moon.x;f.ship.y=moon.y;f.ship.z=moon.z;
 for(let i=0;i<400;i++)stepRoam(f);
 assert.equal(f.phase,'running');assert.ok(f.events.some(e=>e.type==='flyby'));
});
test('flyby events are bounded, no memory growth over extended exploration',()=>{
 const f=createRoam();startRoam(f);const m=DESTINATIONS[1];
 for(let i=0;i<80;i++){
  Object.assign(f.ship,{x:m.x,y:m.y,z:m.z});f.near=null;
  stepRoam(f);
 }
 assert.ok(f.events.length<=32);
});
test('pause and reset discard movement and retain deterministic seed',()=>{
 const f=createRoam(13);startRoam(f);stepRoam(f,{throttleUp:true});
 pauseRoam(f);assert.equal(f.phase,'paused');assert.deepEqual(resetRoam(f),createRoam(13));
});
test('extreme coordinate precision limit abstains rather than silently wrap',()=>{
 const f=createRoam();startRoam(f);f.ship.x=ROAM.maxSafeCoord-1;f.ship.vx=1000;
 stepRoam(f);assert.equal(f.phase,'precision_limit');assert.equal(f.ticks,0);
});
test('invalid geometry behind perspective camera is not rendered',()=>{
 const cam={pos:{x:0,y:0,z:0},forward:{x:1,y:0,z:0},
 right:{x:0,y:1,z:0},up:{x:0,y:0,z:1}};
 assert.equal(project({x:-10,y:0,z:0},cam),null);
 assert.ok(project({x:80,y:40,z:20},cam).x>480);
});
test('offline browser page keeps payments, weapons and third parties disconnected',()=>{
 const page=readFileSync(new URL('../public/free-roam.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/free-roam-app.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('../public/free-roam-core.mjs',import.meta.url),'utf8');
 const render=readFileSync(new URL('../public/free-roam-render.mjs',import.meta.url),'utf8');
 assert.match(page,/free-roam-app\.mjs/);assert.match(page,/No payments/i);
 assert.match(core,/game units, not km/);assert.match(page,/no destination is required|do not need to race/i);
 for(const term of ['fetch(', 'WebSocket','XMLHttpRequest','innerHTML','buy.stripe.com','eval('])
  assert.ok(![core,app,render].some(s=>s.includes(term)),term);
});
