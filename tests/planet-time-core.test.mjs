import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AU_KM,loadPlanetCatalog,sampleAtUtc,parseUtcField,cubicState,validatePlanetCatalog,distance3,relativeSun} from '../public/planet-time-core.mjs';
import {planetMapProjection,VIEWS} from '../public/planet-time-render.mjs';

const C=await loadPlanetCatalog();
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e, String(a)+' vs '+String(b));
test('catalog is hash-checked, 241 UTC knots and 10 bodies, no production authority',()=>{
 assert.equal(C.samples.length,241);assert.equal(C.targets.length,10);
 assert.equal(C.productionAuthority,'NONE');
 assert.equal(C.holdout.checks,2400);
 assert.ok(C.holdout.maxPositionErrorKm<10);
 assert.ok(C.holdout.maxVelocityErrorKmS<.001);
});
test('Mars true center and outer bodies labeled system barycenters',()=>{
 const bodies=Object.fromEntries(C.targets.map(b=>[b.id,b]));
 assert.equal(bodies.mars.naif,499);assert.equal(bodies.moon.naif,301);
 assert.equal(bodies.earth.naif,399);assert.equal(bodies.sun.naif,10);
 for(const id of ['jupiter','saturn','uranus','neptune','mercury','venus'])
  assert.equal(bodies[id].kind,'system_barycenter');
});
test('strict UTC input validation and impossible dates',()=>{
 assert.equal(parseUtcField('2026-11-14T12:30'),Date.parse('2026-11-14T12:30Z'));
 for(const v of ['2026-02-30T00:00','2026-11-14T24:00','2026-11-14 00:00','',null])
  assert.equal(parseUtcField(v),null);
});
test('outside data window abstains with no extrapolation',()=>{
 const begin=Date.parse(C.beginUtc),end=Date.parse(C.endUtc);
 assert.equal(sampleAtUtc(C,begin-1).status,'ABSTAIN_OUTSIDE_VERIFIED_EPOCHS');
 assert.equal(sampleAtUtc(C,end+1).status,'ABSTAIN_OUTSIDE_VERIFIED_EPOCHS');
 assert.equal(sampleAtUtc(C,NaN).status,'ABSTAIN_INVALID_TIME');
 assert.equal(sampleAtUtc(C,begin).status,'VERIFIED_SOURCE_INTERPOLATED');
 assert.equal(sampleAtUtc(C,end).status,'VERIFIED_SOURCE_INTERPOLATED');
});
test('sample knots reproduce all source components at endpoints',()=>{
 const begin=Date.parse(C.beginUtc),step=C.stepSeconds*1000;
 for(const i of [0,1,40,120,239,240]){
  const r=sampleAtUtc(C,begin+i*step);
  for(const id of ['earth','moon','mars','jupiter']){
   const j=C.targets.findIndex(b=>b.id===id),v=C.samples[i][j],s=r.states[id];
   for(let k=0;k<3;k++){near(s.p[k],v[k],1e-5);near(s.v[k],v[k+3],1e-8);}
  }
 }
});
test('interpolated derivatives agree with real vector displacement',()=>{
 const begin=Date.parse(C.beginUtc),step=C.stepSeconds*1000,mid=begin+101.5*step;
 const a=sampleAtUtc(C,mid-1000),b=sampleAtUtc(C,mid+1000),m=sampleAtUtc(C,mid);
 for(const id of ['earth','mars','moon']){
  for(let i=0;i<3;i++)near((b.states[id].p[i]-a.states[id].p[i])/2,m.states[id].v[i],.005);
 }
});
test('Earth Moon and Mars distances change with astronomical UTC',()=>{
 const a=sampleAtUtc(C,Date.parse('2026-11-11T00:00Z'));
 const b=sampleAtUtc(C,Date.parse('2026-12-11T00:00Z'));
 for(const m of [a,b]){
  assert.ok(m.distancesKm.earthMoon>340000&&m.distancesKm.earthMoon<410000);
  assert.ok(m.distancesKm.earthMars>5e7&&m.distancesKm.earthMars<4.1e8);
  assert.ok(m.distancesKm.earthSun>1.4e8&&m.distancesKm.earthSun<1.55e8);
 }
 assert.ok(Math.abs(a.distancesKm.earthMars-b.distancesKm.earthMars)>1e7);
 near(distance3(a.states.earth.p,a.states.moon.p),a.distancesKm.earthMoon,1e-7);
});
test('planetarium linear scale respects physical AU and Earth Moon range',()=>{
 const pos=planetMapProjection([AU_KM,0,0],'inner');
 const far=planetMapProjection([AU_KM,0,0],'outer');
 near(pos.pxPerKm*AU_KM,218/2.2,1e-10);
 assert.ok(pos.pxPerKm>far.pxPerKm);
 const s=sampleAtUtc(C,Date.parse('2026-11-14T12:00Z'));
 near(Math.hypot(...relativeSun(s,'sun')),0);
 near(Math.hypot(...relativeSun(s,'earth')),s.distancesKm.earthSun,.0001);
 const q=planetMapProjection(s.states.moon.p.map((x,i)=>x-s.states.earth.p[i]),'earthMoon');
 assert.ok(q.x>0&&q.x<960&&q.y>0&&q.y<540);
 assert.deepEqual(Object.keys(VIEWS),['outer','inner','earthMoon']);
});
test('falsified catalog and invalid Hermite arguments fail closed',()=>{
 const bad=structuredClone(C);bad.samples[4][0][0]=Infinity;
 assert.throws(()=>validatePlanetCatalog(bad),/NONFINITE/);
 bad.samples[4][0][0]=12;bad.stepSeconds=86400;
 assert.throws(()=>validatePlanetCatalog(bad),/STEP_REJECTED/);
 const a=C.samples[0][0],b=C.samples[1][0];
 for(const u of [-1,2,NaN])assert.throws(()=>cubicState(a,b,u,43200));
});
test('planetarium remains offline and source-separate from arcade physics',()=>{
 for(const file of ['planet-time-core.mjs','planet-time-render.mjs','planet-time-app.mjs']){
  const source=readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  for(const pattern of ['fetch(', 'XMLHttpRequest','WebSocket','innerHTML','eval('])
   assert.ok(!source.includes(pattern),file+' has '+pattern);
 }
 const html=readFileSync(new URL('../public/game-4d.html',import.meta.url),'utf8');
 assert.match(html,/planetDate/);assert.match(html,/Real body sizes/);
});
