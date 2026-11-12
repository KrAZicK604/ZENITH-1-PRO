import test from 'node:test';
import assert from 'node:assert/strict';
import {
 parseHorizonsVector,assembleHorizonsSnapshot,distancesKm,validateSnapshot
} from '../public/astro-ephemeris.mjs';

// These are deliberately SYNTHETIC coordinates in realistic Horizons format.
// Passing checks verifies parser contracts, NOT an actual ephemeris or provenance.
const JD=2461356.5;
function vector(body,x,y,z,options={}){
 const id={earth:399,moon:301,mars:499}[body];
 const target=body[0].toUpperCase()+body.slice(1);
 const center=options.center??'Solar System Barycenter (0)';
 const frame=options.frame??'ICRF/J2000.0';
 const plane=options.plane??'Earth Mean Equator and Equinox of Reference Epoch';
 const output=options.output??'GEOMETRIC cartesian states';
 const fmt=options.format??'2 (position and velocity)';
 const units=options.units??'KM-S';
 const epoch=options.epoch??JD;
 const timescale=options.timescale??'TDB';
 const header=[
  'Ephemeris / WWW_USER synthetic-test-fixture / Horizons',
  'Target body name: '+target+' ('+id+') {source: TEST_ONLY}',
  'Center body name: '+center+' {source: TEST_ONLY}',
  'Center-site name: BODY CENTER',
  'Output units: '+units,'Output type: '+output,
  'Output format: '+fmt,'Reference frame: '+frame,
  'Coordinate systm: '+plane,'Calendar mode: Mixed Julian/Gregorian',
  'JDTDB', '  X     Y     Z', '$$SOE'
 ];
 const position=' X = '+x.toExponential(13)+' Y = '+y.toExponential(13)+' Z = '+z.toExponential(13);
 return [...header, epoch+' = A.D. 2026-Nov-12 00:00:00.0000 '+timescale,position,
  ' VX= 1.000E+00 VY= 0.000E+00 VZ= 0.000E+00','$$EOE'].join('\n');
}
const three=()=>({
 earth:vector('earth',1.4e8,-4e7,2e7),
 moon:vector('moon',1.4e8, -4e7+384400,2e7),
 mars:vector('mars',-1e8,8e7,-1e7)
});
function change(raw,from,to){const o=raw.replace(from,()=>to);assert.notEqual(o,raw);return o;}
test('real-style Horizons format has no Time format: CAL header yet parses',()=>{
 const raw=vector('earth',1e8,1e7,-4e7);
 assert.equal(raw.includes('Time format'),false);
 assert.equal(parseHorizonsVector(raw,399).jdTdb,JD);
});
test('ICRF/J2000 header alone cannot hide ECLIPTIC output axes',()=>{
 const raw=vector('earth',1,2,3,{plane:'Ecliptic and Mean Equinox of Reference Epoch'});
 assert.throws(()=>parseHorizonsVector(raw,399),/NOT_EQUATORIAL_ICRF/);
});
test('reject ecliptic in one of three bodies even when others are equatorial',()=>{
 const data=three();
 data.moon=vector('moon',1e8,2e6,3e6,{plane:'Ecliptic and Mean Equinox of Reference Epoch'});
 assert.throws(()=>assembleHorizonsSnapshot(data),/NOT_EQUATORIAL_ICRF/);
});
test('missing coordinate-axis declaration must abstain',()=>{
 const raw=vector('earth',1,2,3);
 assert.throws(()=>parseHorizonsVector(raw.replace(/^Coordinate systm:.*\n/m,''),399),/COORDINATE_SYSTEM_UNVERIFIED/);
});
test('reject ecliptic plane even if VEC_CORR is GEOMETRIC',()=>{
 assert.throws(()=>parseHorizonsVector(vector('earth',1,2,3,{plane:'Central body mean equator'}),399),/NOT_EQUATORIAL_ICRF/);
});
test('reject light-time correction output',()=>{
 const raw=vector('earth',1,2,3,{output:'ASTROMETRIC cartesian states'});
 assert.throws(()=>parseHorizonsVector(raw,399),/CORRECTION_MISMATCH/);
});
test('reject velocity-only table',()=>{
 assert.throws(()=>parseHorizonsVector(vector('earth',1,2,3,{format:'5 (velocity only)'}),399),/NO_POSITION_VECTOR/);
});
test('reject output without TDB label',()=>{
 assert.throws(()=>parseHorizonsVector(vector('earth',1,2,3,{timescale:'UT'}),399),/ONE_TDB_EPOCH_REQUIRED/);
});
test('reject wrong center ID although center name looks correct',()=>{
 assert.throws(()=>parseHorizonsVector(vector('earth',1,2,3,{center:'Solar System Barycenter (10)'}),399),/CENTER_MISMATCH/);
});
test('reject misleading text including wrong center-site',()=>{
 const raw=change(vector('earth',1,2,3),'Center-site name: BODY CENTER','Center-site name: USER DEFINED');
 assert.throws(()=>parseHorizonsVector(raw,399),/CENTER_SITE_MISMATCH/);
});
test('reject a duplicated signed-looking header field',()=>{
 const raw=vector('earth',1,2,3).replace('Target body name:','Target body name: Earth (399)\nTarget body name:');
 assert.throws(()=>parseHorizonsVector(raw,399),/MISSING_OR_DUPLICATE_HEADER_TARGET_BODY_NAME/);
});
test('reject two ephemeris records in same response',()=>{
 const raw=vector('earth',1,2,3);
 const extra='2461357.500000000 = A.D. 2026-Nov-13 00:00:00.0000 TDB\n X = 3 Y = 4 Z = 5\n';
 assert.throws(()=>parseHorizonsVector(change(raw,'$$EOE',extra+'$$EOE'),399),/ONE_EPOCH_REQUIRED/);
});
test('reject duplicate $$SOE or $$EOE markers',()=>{
 const raw=vector('earth',1,2,3);
 assert.throws(()=>parseHorizonsVector(raw+'\n$$EOE',399),/EPHEMERIS_MARKERS_MISSING_OR_DUPLICATE/);
 assert.throws(()=>parseHorizonsVector(raw.replace('$$SOE',()=> '$$SOE\n$$SOE'),399),/EPHEMERIS_MARKERS_MISSING_OR_DUPLICATE/);
});
test('reject duplicate XYZ vectors at one epoch',()=>{
 const raw=vector('earth',1,2,3);
 const duplicate=change(raw,'$$EOE',' X = 4 Y = 5 Z = 6\n$$EOE');
 assert.throws(()=>parseHorizonsVector(duplicate,399),/ONE_VECTOR_REQUIRED/);
});
test('no missing epoch silently defaults to current date',()=>{
 const raw=vector('earth',1,2,3).replace(/^2461356\.5 =.*\n/m,'');
 assert.throws(()=>parseHorizonsVector(raw,399),/ONE_EPOCH_REQUIRED/);
});
test('mixed epochs are not silently averaged',()=>{
 const data=three();
 data.mars=vector('mars',-1e8,8e7,-1e7,{epoch:JD+.25});
 assert.throws(()=>assembleHorizonsSnapshot(data),/INVALID_VECTOR_MARS/);
});
test('distance geometry invariant to translating all three barycentric XYZ equally',()=>{
 const original=three(),s=assembleHorizonsSnapshot(original),a=distancesKm(s),offset={x:7.5e7,y:-1.7e7,z:2.4e7};
 const vals={earth:[1.4e8,-4e7,2e7],moon:[1.4e8,-4e7+384400,2e7],mars:[-1e8,8e7,-1e7]};
 const moved=Object.fromEntries(Object.entries(vals).map(([key,p])=>[key,vector(key,p[0]+offset.x,p[1]+offset.y,p[2]+offset.z)]));
 const b=distancesKm(assembleHorizonsSnapshot(moved));
 for(const k of ['earthMoon','earthMars','moonMars'])assert.ok(Math.abs(a[k]-b[k])<1e-7,k);
});
test('triangle inequality of three center-to-center ranges',()=>{
 const d=distancesKm(assembleHorizonsSnapshot(three()));
 assert.ok(d.earthMars<=d.earthMoon+d.moonMars+1e-6);
 assert.ok(d.moonMars<=d.earthMoon+d.earthMars+1e-6);
});
test('fail closed when outer units or coordinate frame are altered after assembly',()=>{
 const s=assembleHorizonsSnapshot(three());
 assert.throws(()=>validateSnapshot({...s,referencePlane:'ECLIPTIC'}),/FRAME_OR_SOURCE_MISMATCH/);
 assert.throws(()=>validateSnapshot({...s,correction:'LT+S'}),/FRAME_OR_SOURCE_MISMATCH/);
});
