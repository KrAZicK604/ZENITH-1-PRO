import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACE,createAce,startAce,pauseAce,resetAce,stepAce,basis,selectedTarget,simulationTime,speed} from '../public/ace-flight-core.mjs';
import {projection} from '../public/ace-flight-render.mjs';
const isolated=(seed=42)=>{
 const f=createAce(seed);
 f.asteroids=[];f.moon.x=-99999;f.moon.mu=0;f.goal.x=100000;
 return f;
};
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<=e, `${a} != ${b}`);
test('seeded 4D space includes deterministic 3D asteroids',()=>{
 const a=createAce(7),b=createAce(7);
 assert.deepEqual(a,b);assert.equal(a.asteroids.length,12);
 assert.notDeepEqual(a.asteroids,createAce(8).asteroids);
 assert.deepEqual([a.ship.x,a.ship.y,a.ship.z],[40,0,0]);near(simulationTime(a),0);
});
test('invalid seeds fail closed',()=>{for(const value of [NaN,Infinity,-1,2**32,2.5])assert.throws(()=>createAce(value));});
test('attitude basis vectors are orthonormal across maneuvers',()=>{
 const f=createAce();
 for(const [yaw,pitch,roll] of [[0,0,0],[.7,.4,-2.1],[-2.8,-1.3,3.0],[3.1,1.35,-3.1]]){
  Object.assign(f.ship,{yaw,pitch,roll});const b=basis(f.ship);
  for(const k of ['forward','right','up'])near(Math.hypot(b[k].x,b[k].y,b[k].z),1);
  const dot=(a,c)=>a.x*c.x+a.y*c.y+a.z*c.z;
  near(dot(b.forward,b.right),0);near(dot(b.forward,b.up),0);near(dot(b.right,b.up),0);
 }
});
test('ready and paused never advance or spend charges',()=>{
 const f=isolated();stepAce(f,{afterburner:true,pulse:true});assert.equal(f.ticks,0);
 startAce(f);pauseAce(f);stepAce(f,{pulse:true});assert.equal(f.ticks,0);assert.equal(f.boosts,3);
 pauseAce(f);assert.equal(f.phase,'running');
});
test('two identical initial worlds and controls evolve identically',()=>{
 const a=isolated(),b=isolated();startAce(a);startAce(b);
 for(let i=0;i<60;i++){
  const commands={pitchUp:i<15,yawRight:i>18,rollLeft:i>31,afterburner:i>32,strafeRight:i%3===0};
  stepAce(a,commands);stepAce(b,commands);
 }
 assert.deepEqual(a,b);near(simulationTime(a),1);
});
test('pitch, yaw and roll have independent rotational effects',()=>{
 const f=isolated();startAce(f);
 stepAce(f,{pitchUp:true,yawRight:true,rollLeft:true});
 assert.ok(f.ship.pitch>0&&f.ship.yaw>0&&f.ship.roll<0);
 const c=isolated();startAce(c);stepAce(c,{pitchUp:true});
 assert.equal(c.ship.yaw,0);assert.equal(c.ship.roll,0);
});
test('roll angle can complete a banked arcade maneuver without NaNs',()=>{
 const f=isolated();startAce(f);f.ship.assist=false;
 for(let i=0;i<190;i++)stepAce(f,{rollRight:true});
 assert.ok(Number.isFinite(f.ship.roll));assert.ok(f.ship.roll>=-Math.PI&&f.ship.roll<=Math.PI);
 assert.ok(f.ship.x>40);
});
test('analog joystick inputs clamp safely and ignore nonfinite values',()=>{
 const f=isolated();startAce(f);
 stepAce(f,{yawAxis:100,pitchAxis:Infinity,rollAxis:NaN});
 near(f.ship.yaw,ACE.turnYaw*ACE.dt);
 near(f.ship.pitch,0);near(f.ship.roll,0);
});
test('throttle cannot go below zero or above full',()=>{
 const f=isolated();startAce(f);
 for(let i=0;i<130;i++)stepAce(f,{throttleUp:true});
 near(f.ship.throttle,1);
 for(let i=0;i<170;i++)stepAce(f,{throttleDown:true});
 near(f.ship.throttle,0);
});
test('afterburner produces heat and thermal lockout before cooling',()=>{
 const f=isolated();startAce(f);let peaked=false;
 for(let i=0;i<300;i++){stepAce(f,{afterburner:true});peaked||=f.ship.burnerLocked;}
 assert.equal(peaked,true);
 assert.ok(f.ship.heat>=0&&f.ship.heat<=1);
 for(let i=0;i<240;i++)stepAce(f);
 assert.equal(f.ship.burnerLocked,false);
 assert.ok(f.ship.heat<=.27);
});
test('air brake reduces velocity compared with otherwise identical flight',()=>{
 const a=isolated(),b=isolated();startAce(a);startAce(b);
 Object.assign(a.ship,{vx:150,vy:80,vz:50,throttle:0});
 Object.assign(b.ship,{vx:150,vy:80,vz:50,throttle:0});
 stepAce(a,{brake:true});stepAce(b);
 assert.ok(speed(a)<speed(b));
});
test('inertial flight assist may be toggled and laterally dampens drift',()=>{
 const a=isolated(),b=isolated();startAce(a);startAce(b);
 stepAce(b,{toggleAssist:true});assert.equal(b.ship.assist,false);
 a.ship.vy=90;b.ship.vy=90;a.ship.throttle=0;b.ship.throttle=0;
 for(let i=0;i<50;i++){stepAce(a);stepAce(b);}
 assert.ok(Math.abs(a.ship.vy)<Math.abs(b.ship.vy));
});
test('maneuver pulses consume finite charges and reset restores them',()=>{
 const f=isolated();startAce(f);
 for(let i=0;i<10;i++)stepAce(f,{pulse:true});
 assert.equal(f.boosts,0);assert.deepEqual(resetAce(f),createAce(f.seed));
});
test('3D velocity and position are bounded across long random commands',()=>{
 const f=isolated();startAce(f);
 for(let i=0;i<2400;i++){
  stepAce(f,{yawRight:i%4===0,pitchUp:i%5===0,rollLeft:i%8===0,
   throttleUp:i%13===0,afterburner:i%9===0,strafeLeft:i%7===0});
  assert.ok(speed(f)<=ACE.burnerSpeed+1e-7);
  for(const k of ['x','y','z'])assert.ok(Number.isFinite(f.ship[k]));
  assert.ok(f.ship.heat>=0&&f.ship.heat<=1);
 }
});
test('target selection is bounded and does not grant score',()=>{
 const f=createAce();startAce(f);
 for(let i=0;i<13;i++)stepAce(f,{cycleTarget:true});
 assert.equal(f.targetIndex,0);
 assert.equal(selectedTarget(f),'MARS');assert.equal(f.score,0);
});
test('target lock grows with in-cone target and is lost out of cone',()=>{
 const f=isolated();
 f.goal={x:600,y:0,z:0,r:20};
 startAce(f);
 for(let i=0;i<90;i++)stepAce(f);
 assert.equal(f.targetStatus,'LOCK');
 f.ship.yaw=Math.PI;
 for(let i=0;i<90;i++)stepAce(f,{brake:true});
 assert.ok(f.targetQuality<.95);assert.notEqual(f.targetStatus,'LOCK');
});
test('debris first impact consumes shield and cooldown blocks duplicate frame damage',()=>{
 const f=isolated();f.asteroids=[{x:40,y:0,z:0,r:30,vx:0,vy:0,vz:0}];startAce(f);
 stepAce(f);assert.equal(f.ship.shield,56);assert.equal(f.phase,'running');
 stepAce(f);assert.equal(f.ship.shield,56);
});
test('third independently-separated debris collision is terminal',()=>{
 const f=isolated();f.asteroids=[{x:40,y:0,z:0,r:30,vx:0,vy:0,vz:0}];startAce(f);
 for(let i=0;i<3;i++){
  f.ship.hitCooldown=0;f.ship.x=40;f.ship.y=0;f.ship.z=0;
  stepAce(f);
 }
 assert.equal(f.phase,'crashed');assert.equal(f.ship.shield,0);
 const t=f.ticks;stepAce(f,{afterburner:true});assert.equal(f.ticks,t);
});
test('Moon impact wins precedence over coincident Mars goal',()=>{
 const f=isolated();f.moon={x:40,y:0,z:0,r:50,mu:0};
 f.goal={x:40,y:0,z:0,r:50};startAce(f);stepAce(f);
 assert.equal(f.phase,'crashed');assert.equal(f.score,0);
});
test('simultaneous debris and Mars contact never grants win',()=>{
 const f=isolated();f.goal={x:40,y:0,z:0,r:50};f.asteroids=[{x:40,y:0,z:0,r:25,vx:0,vy:0,vz:0}];
 startAce(f);stepAce(f);assert.notEqual(f.phase,'won');assert.equal(f.score,0);
});
test('unobstructed Mars arrival grants a single local score',()=>{
 const f=isolated();f.goal={x:40,y:0,z:0,r:48};startAce(f);stepAce(f);
 assert.equal(f.phase,'won');assert.ok(f.score>0);
 const t=f.ticks,s=f.score;stepAce(f,{pulse:true});assert.equal(f.ticks,t);assert.equal(f.score,s);
});
test('timeout is terminal and resets are idempotent',()=>{
 const f=isolated(92);startAce(f);f.ticks=ACE.maxTicks-1;stepAce(f);
 assert.equal(f.phase,'timeout');const t=f.ticks;stepAce(f);assert.equal(f.ticks,t);
 const fresh=resetAce(f);assert.deepEqual(fresh,createAce(92));
});
test('perspective projection protects points behind camera',()=>{
 const cam={pos:{x:0,y:0,z:0},forward:{x:1,y:0,z:0},right:{x:0,y:1,z:0},up:{x:0,y:0,z:1}};
 assert.equal(projection({x:-10,y:0,z:0},cam),null);
 const q=projection({x:100,y:10,z:20},cam);
 assert.ok(q.x>480&&q.y<270&&q.k>0);
});
test('browser presentation uses original local meshes and does not authorize remote systems',()=>{
 const html=readFileSync(new URL('../public/game-ace.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/ace-flight-app.mjs',import.meta.url),'utf8');
 const render=readFileSync(new URL('../public/ace-flight-render.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('../public/ace-flight-core.mjs',import.meta.url),'utf8');
 assert.match(html,/game-ace/);assert.match(html,/pitch/i);assert.match(html,/roll/i);
 assert.match(html,/Offline arcade|offline arcade/i);assert.match(html,/No real spacecraft control guidance/);
 assert.match(render,/SHIP=/);assert.match(render,/CONTACT RADAR/);
 assert.equal((app.match(/addEventListener\('keydown'/g)||[]).length,1);
 for(const code of ['fetch(','WebSocket','XMLHttpRequest','buy.stripe.com','innerHTML']){
  assert.ok(![app,render,core].some(x=>x.includes(code)),code);
 }
});
