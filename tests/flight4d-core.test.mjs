import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FLIGHT, seededRandom, createFlight, clock, worldAt, accelerationAt,
  axesOf, shipVertex, sweptContact, startFlight, pauseFlight, resetFlight,
  nextFlight, makeCamera, project3D,
} from "../public/flight4d-core.mjs";

const xyz = value => [value.x, value.y, value.z];
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const emptyCourse = seed => {
  const state = createFlight(seed);
  state.course.rocks = [];
  return state;
};
test("same seed creates identical 3D state, others change asteroids", () => {
  assert.deepEqual(createFlight(14),createFlight(14));
  assert.notDeepEqual(createFlight(14).course.rocks,createFlight(15).course.rocks);
  assert.equal(createFlight(14).course.rocks.length,13);
  assert.equal(createFlight(14).ship.vz,0);
});
test("invalid seed refused instead of hidden random state", () => {
  for (const seed of [NaN,Infinity,0.4,"seed",2**54]) {
    assert.throws(()=>createFlight(seed),/integer seed/);
  }
});
test("seeded PRNG finite reproducible within [0,1)", () => {
  const a=seededRandom(31),b=seededRandom(31);
  for(let i=0;i<1000;i++){let n=a();assert.equal(n,b());assert.ok(n>=0&&n<1);}
});
test("time coordinate is fixed-step and paused before start", () => {
  const s=createFlight(99);
  assert.equal(clock(s),0);
  assert.strictEqual(nextFlight(s,{thrust:true}),s);
  assert.strictEqual(pauseFlight(s),s);
  const r=startFlight(s);
  assert.equal(r.phase,"running");
  assert.equal(nextFlight(r).tick,1);
  assert.equal(clock(nextFlight(r)),FLIGHT.dt);
});
test("world is 3D and moving explicitly with fourth coordinate t",()=>{
  const s=createFlight(3),a=worldAt(s.course,0),b=worldAt(s.course,20);
  assert.ok(distance(a.moon,b.moon)>1);
  assert.ok(distance(a.mars,b.mars)>1);
  assert.equal(a.rocks.length,b.rocks.length);
  assert.ok(a.rocks.some((v,i)=>distance(v,b.rocks[i])>0.5));
  for (const body of [a.moon,a.mars,...a.rocks,b.moon,b.mars,...b.rocks]) {
    assert.ok(xyz(body).every(Number.isFinite));
    assert.ok(body.r>0);
  }
});
test("force field is function of both location and time, with finite outputs",()=>{
  const s=createFlight(3);
  const p={x:480,y:60,z:15};
  const at0=accelerationAt(p,0,s.course);
  const at20=accelerationAt(p,20,s.course);
  const elsewhere=accelerationAt({x:40,y:20,z:0},0,s.course);
  assert.ok(distance(at0,at20)>0.1,"clock must change force");
  assert.ok(distance(at0,elsewhere)>1,"position must change force");
  assert.ok([at0,at20,elsewhere].every(v=>xyz(v).every(Number.isFinite)));
});
test("ship has orthonormal 3D yaw pitch roll frame",()=>{
  const s=createFlight(4).ship;
  Object.assign(s,{yaw:0.73,pitch:-0.41,roll:0.93});
  const a=axesOf(s);
  const dot=(x,y)=>x.x*y.x+x.y*y.y+x.z*y.z;
  for (const axis of Object.values(a)) assert.ok(Math.abs(dot(axis,axis)-1)<1e-12);
  assert.ok(Math.abs(dot(a.forward,a.right))<1e-12);
  assert.ok(Math.abs(dot(a.forward,a.up))<1e-12);
  assert.ok(Math.abs(dot(a.right,a.up))<1e-12);
});
test("3D ship mesh rotates in world space with roll and yaw",()=>{
  const ship=createFlight(1).ship;
  const vertex={x:-12,y:20,z:2};
  const original=shipVertex(ship,vertex);
  const afterRoll=shipVertex({...ship,roll:0.8},vertex);
  const afterYaw=shipVertex({...ship,yaw:0.8},vertex);
  assert.ok(distance(original,afterRoll)>3);
  assert.ok(distance(original,afterYaw)>3);
});
test("pitch moves ship vertically and yaw moves ship laterally under thrust",()=>{
  let base=startFlight(emptyCourse(8));
  let rotated=startFlight(emptyCourse(8));
  for(let i=0;i<50;i++){
    base=nextFlight(base,{thrust:true});
    rotated=nextFlight(rotated,{thrust:true,turnRight:true,pitchUp:true});
  }
  assert.ok(rotated.ship.y>base.ship.y+0.4);
  assert.ok(rotated.ship.z>base.ship.z+0.4);
  assert.ok(rotated.ship.yaw>0.5);
  assert.ok(rotated.ship.pitch>0.5);
});
test("roll has its own attitude control and affects mesh but not time rate",()=>{
  let s=startFlight(emptyCourse(8));
  let other=startFlight(emptyCourse(8));
  for(let i=0;i<45;i++){
    s=nextFlight(s,{rollRight:true});
    other=nextFlight(other,{});
  }
  assert.ok(s.ship.roll>0.1);
  assert.equal(s.tick,other.tick);
  assert.equal(clock(s),clock(other));
});
test("boost consumes only three uses, speed capped",()=>{
  let s=startFlight(emptyCourse(8));
  for(let i=0;i<70;i++){
    s=nextFlight(s,{thrust:true,boost:i<10});
    assert.ok(s.boosters>=0);
    assert.ok(Math.hypot(s.ship.vx,s.ship.vy,s.ship.vz)<=FLIGHT.maxSpeed+1e-10);
  }
  assert.equal(s.boosters,0);
});
test("ship spatial boundaries hold across high thrust and turn stress",()=>{
  let s=startFlight(emptyCourse(121));
  for(let i=0;i<1800;i++){
    s=nextFlight(s,{thrust:true,turnRight:(i%20)<10,turnLeft:(i%20)>=10,
      pitchUp:(i%45)<15,pitchDown:(i%45)>25,boost:i%400===0});
    const p=s.ship;
    assert.ok(p.x>=0&&p.x<=FLIGHT.length);
    assert.ok(p.y>=-FLIGHT.halfWidth&&p.y<=FLIGHT.halfWidth);
    assert.ok(p.z>=-FLIGHT.halfHeight&&p.z<=FLIGHT.halfHeight);
    assert.ok([p.vx,p.vy,p.vz,p.roll,p.pitch,p.yaw].every(Number.isFinite));
  }
});
test("same seed and 600 control steps replay byte-for-byte deterministically",()=>{
  let a=startFlight(createFlight(17)),b=startFlight(createFlight(17));
  for(let i=0;i<600;i++){
    const inputs={thrust:i%3!==0,brake:i%90===0,turnLeft:i%60<20,
      turnRight:i%60>45,pitchUp:i%30<6,rollLeft:i%41<9,boost:i%130===0};
    a=nextFlight(a,inputs);
    b=nextFlight(b,inputs);
  }
  assert.deepEqual(a,b);
});
test("pause freezes simulation time and entire physical state",()=>{
  let a=startFlight(createFlight(11));
  a=nextFlight(a,{thrust:true});
  const paused=pauseFlight(a);
  assert.equal(paused.phase,"paused");
  const same=nextFlight(paused,{boost:true,thrust:true});
  assert.strictEqual(same,paused);
  assert.equal(clock(same),clock(a));
  const resumed=pauseFlight(same);
  assert.equal(resumed.phase,"running");
  assert.equal(nextFlight(resumed).tick,a.tick+1);
});
test("restart is deterministic with no residual score, velocity or boosters",()=>{
  let a=startFlight(createFlight(3001));
  for(let i=0;i<18;i++)a=nextFlight(a,{boost:i===0,thrust:true,turnRight:true});
  assert.deepEqual(resetFlight(a),createFlight(3001));
});
test("swept contact catches fast crossover between two discrete positions",()=>{
  const one={x:0,y:0,z:0},two={x:100,y:0,z:0};
  const rock0={x:50,y:50,z:0},rock1={x:50,y:-50,z:0};
  assert.equal(sweptContact(one,two,rock0,rock1,3),true);
  assert.equal(sweptContact(one,two,{x:50,y:20,z:20},{x:50,y:20,z:20},5),false);
});
test("3D separation matters: similar x and y but far z never collides",()=>{
  const a={x:4,y:2,z:0},b={x:4,y:2,z:80};
  assert.equal(sweptContact(a,a,b,b,15),false);
});
test("contact with moving Moon terminates once, never awards score",()=>{
  let a=startFlight(emptyCourse(4));
  const moon=worldAt(a.course,clock(a)).moon;
  a.ship={...a.ship,x:moon.x,y:moon.y,z:moon.z,vx:0,vy:0,vz:0};
  const ended=nextFlight(a,{thrust:true});
  assert.equal(ended.phase,"crashed");
  assert.equal(ended.score,0);
  assert.strictEqual(nextFlight(ended,{boost:true}),ended);
});
test("moving Mars is a legitimate 3D victory only once",()=>{
  let a=startFlight(emptyCourse(4));
  const mars=worldAt(a.course,0).mars;
  a.ship={...a.ship,x:mars.x,y:mars.y,z:mars.z,vx:0,vy:0,vz:0};
  const won=nextFlight(a);
  assert.equal(won.phase,"won");
  assert.ok(won.score>0);
  assert.strictEqual(nextFlight(won,{thrust:true,boost:true}),won);
});
test("simultaneous Mars arrival and asteroid collision is a crash",()=>{
  let a=startFlight(emptyCourse(4));
  const mars=worldAt(a.course,0).mars;
  a.ship={...a.ship,x:mars.x,y:mars.y,z:mars.z,vx:0,vy:0,vz:0};
  a.course.rocks=[{id:99,x0:mars.x,y0:mars.y,z0:mars.z,
    r:26,ay:0,az:0,omega:0,phase:0}];
  const event=nextFlight(a);
  assert.equal(event.phase,"crashed");
  assert.equal(event.score,0);
});
test("maximum clock stops forever, no free extra game ticks",()=>{
  let a=startFlight(emptyCourse(4));
  a.tick=FLIGHT.maxTicks-1;
  a.ship.x=35;a.ship.y=0;a.ship.z=0;
  const over=nextFlight(a);
  assert.equal(over.phase,"timeout");
  assert.equal(over.tick,FLIGHT.maxTicks);
  assert.strictEqual(nextFlight(over,{thrust:true}),over);
});
test("perspective projects 3D depth, finite camera and ship mesh",()=>{
  const ship=createFlight(4).ship,cam=makeCamera(ship);
  const origin={x:ship.x,y:ship.y,z:ship.z};
  const near=project3D(origin,cam);
  const far=project3D({x:ship.x+200,y:ship.y,z:ship.z},cam);
  assert.ok(near&&far);
  assert.ok(near.pixelsPerUnit>far.pixelsPerUnit);
  assert.ok([near.x,near.y,far.x,far.y].every(Number.isFinite));
  assert.ok(project3D({x:-1000,y:0,z:0},cam)===null);
  assert.ok(project3D(shipVertex(ship,{x:25,y:0,z:0}),cam));
});
test("new route is explicitly offline and does not alter pricing authority",()=>{
  const page=readFileSync(new URL("../public/game4d.html",import.meta.url),"utf8");
  const app=readFileSync(new URL("../public/flight4d-app.mjs",import.meta.url),"utf8");
  const core=readFileSync(new URL("../public/flight4d-core.mjs",import.meta.url),"utf8");
  const landing=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
  const csp=JSON.parse(readFileSync(new URL("../vercel.json",import.meta.url),"utf8"))
    .headers.find(h=>h.source==="/(.*)").headers.find(h=>h.key==="Content-Security-Policy").value;
  assert.match(page,/<canvas id="flightCanvas"/);
  assert.match(page,/<script type="module" src="\.\/flight4d-app\.mjs"><\/script>/);
  assert.match(landing,/href="\.\/game4d\.html"/);
  assert.match(page,/not four spatial dimensions/i);
  assert.match(page,/No payment, account, prizes or online opponents/i);
  for (const value of [page,app,core]) {
    for (const bad of ["buy.stripe.com","PeerJS","WebSocket","fetch(", "stripe.secret"]) {
      assert.ok(!value.includes(bad),bad);
    }
  }
  assert.match(csp,/script-src 'self'/);
  assert.match(csp,/connect-src 'none'/);
});
