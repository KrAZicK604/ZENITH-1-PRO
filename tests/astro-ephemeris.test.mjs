import test from 'node:test';import assert from 'node:assert/strict';
import {NASA_REFERENCE,parseHorizonsVector,assembleHorizonsSnapshot,validateSnapshot,distancesKm,relativeVectorsKm,shipDistancesKm,formatKm} from '../public/astro-ephemeris.mjs';
const JD=2461000.5;
function fixture(body,x,y,z,jd=JD,center='Solar System Barycenter',units='KM-S',frame='ICRF'){
 return `*******************************************************************************
Target body name: ${body===399?'Earth':body===301?'Moon':'Mars'} (${body})
Center body name: ${center} (0)
*******************************************************************************
Reference frame : ${frame}
Output units : ${units}
Time format : CAL
$$SOE
${jd} = A.D. 2026-Nov-21 00:00:00.0000 TDB
 X = ${x.toExponential(14)} Y = ${y.toExponential(14)} Z = ${z.toExponential(14)}
 VX= 0 VY= 0 VZ= 0
$$EOE
`;
}
const source=()=>({earth:fixture(399,1e8,0,0),moon:fixture(301,1e8,384400,0),mars:fixture(499,3e8,0,0)});
test('NASA mean Earth-Moon reference is 384400 km',()=>assert.equal(NASA_REFERENCE.earthMoonMeanKm,384400));
test('parse correct body ID, barycenter, ICRF, KM-S and TDB',()=>{const p=parseHorizonsVector(source().earth,399);assert.equal(p.x,1e8);assert.equal(p.jdTdb,JD);});
test('reject target ID substitution',()=>assert.throws(()=>parseHorizonsVector(source().moon,399),/TARGET_MISMATCH/));
test('reject Earth-centered vectors falsely called barycentric',()=>assert.throws(()=>parseHorizonsVector(fixture(399,1,2,3,JD,'Earth'),399),/CENTER_MISMATCH/));
test('reject wrong coordinate frame',()=>assert.throws(()=>parseHorizonsVector(fixture(399,1,2,3,JD,'ECLIPTIC'),399),/FRAME_MISMATCH/));
test('reject AU-D output units',()=>assert.throws(()=>parseHorizonsVector(fixture(399,1,2,3,JD,'AU-D'),399),/UNITS_MISMATCH/));
test('reject multiple epochs',()=>{const t=source().earth.replace('$$EOE',`${JD+1} = A.D. 2026-Nov-22 00:00:00.0000 TDB\n X = 1 Y = 2 Z = 3\n$$EOE`);assert.throws(()=>parseHorizonsVector(t,399),/ONE_EPOCH_REQUIRED/);});
test('reject mismatched Earth/Moon/Mars epoch',()=>assert.throws(()=>assembleHorizonsSnapshot({...source(),mars:fixture(499,3e8,0,0,JD+1)}),/INVALID_VECTOR_MARS/));
test('reject incomplete vectors',()=>assert.throws(()=>assembleHorizonsSnapshot({...source(),mars:'garbage'})));
test('reject untrusted metadata or mixed units',()=>{const s=assembleHorizonsSnapshot(source());s.units='AU-D';assert.throws(()=>validateSnapshot(s),/FRAME_OR_SOURCE_MISMATCH/);});
test('synthetic right-triangle distances use true 3D Euclidean norm',()=>{
 const s=assembleHorizonsSnapshot(source()),d=distancesKm(s);
 assert.equal(d.earthMoon,384400);assert.equal(d.earthMars,200000000);
 assert.ok(Math.abs(d.moonMars-Math.hypot(200000000,384400))<1e-7);
});
test('3D z displacement changes Moon-Mars distance',()=>{
 const a=assembleHorizonsSnapshot(source());
 const b=assembleHorizonsSnapshot({...source(),mars:fixture(499,3e8,0,1000000)});
 assert.ok(distancesKm(b).moonMars>distancesKm(a).moonMars);
});
test('Earth-centered relative vectors and ship ranges preserve units',()=>{
 const s=assembleHorizonsSnapshot(source());
 assert.deepEqual(relativeVectorsKm(s).moon,{x:0,y:384400,z:0});
 assert.equal(shipDistancesKm(s,{x:1e8,y:0,z:0}).earth,0);
});
test('no arbitrary fixed Moon-Mars number is stored in reference catalog',()=>assert.ok(!Object.hasOwn(NASA_REFERENCE,'moonMarsKm')));
test('reject NaN, Infinity, unsafe magnitudes and bad ship',()=>{
 const s=assembleHorizonsSnapshot(source());
 assert.throws(()=>shipDistancesKm(s,{x:NaN,y:0,z:0}));
 assert.throws(()=>parseHorizonsVector(fixture(399,1e99,0,0),399),/NONFINITE_VECTOR/);
});
test('formatted kilometer output is clearly labeled',()=>assert.equal(formatKm(384400),'384,400 km'));
test('reject same-center fabricated zeroes only when data metadata missing',()=>{
 const s=assembleHorizonsSnapshot(source());
 assert.throws(()=>validateSnapshot({...s,source:'simulated'}),/FRAME_OR_SOURCE_MISMATCH/);
});
