/** Re-run the browser-game astronomy parser against captured raw JPL text.
 * This is not external custody/authentication, and cannot justify real flight.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {assembleHorizonsSnapshot, distancesKm, relativeVectorsKm} from '../public/astro-ephemeris.mjs';
const dir='evidence/gate5';
const capture=JSON.parse(fs.readFileSync(dir+'/capture.json','utf8'));
const audit=JSON.parse(fs.readFileSync(dir+'/independent_arithmetic_crosscheck.json','utf8'));
assert.equal(capture.status,'HORIZONS_SOURCE_FORMAT_VALID_DIRECT_RELATIVE_MATCH');
assert.equal(audit.status,'LOCAL_ARITHMETIC_AND_APPROXIMATE_MODEL_COMPARISON_PASSED');
const raw={};
for(const name of ['earth','moon','mars']){
 const key=name+'_barycentric';
 const bytes=fs.readFileSync(dir+'/'+key+'.txt');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
              capture.sources[key].text_sha256,'source sha mismatch '+name);
 raw[name]=bytes.toString('utf8');
}
const snapshot=assembleHorizonsSnapshot(raw);
assert.equal(snapshot.jdTdb,2461356.5);
const distances=distancesKm(snapshot);
const rel=relativeVectorsKm(snapshot);
for(const name of ['earthMoon','earthMars','moonMars']){
 const expected=audit.results[name].direct_jpl_barycentric_3d_km;
 const difference=Math.abs(distances[name]-expected);
 assert.ok(difference<0.0001,name+' independent crosscheck differs by '+difference+' km');
}
for(const name of ['earth','moon','mars']){
 const data=snapshot.vectors[name],expected=capture.vectors[name+'_barycentric'];
 for(const axis of ['x','y','z'])
   assert.ok(Math.abs(data[axis]-expected[axis])<0.00001,name+'/'+axis+' mismatch');
}
const output={
 schema:'zenith.horizons.vectors.v1',
 status:'EPHEMERIS_DATE_LOCKED_NAVIGATION_SNAPSHOT_SOURCE_UNAUTHENTICATED',
 jdTdb:snapshot.jdTdb,source:snapshot.source,center:snapshot.center,
 frame:snapshot.frame,referencePlane:snapshot.referencePlane,
 correction:snapshot.correction,units:snapshot.units,timeScale:snapshot.timeScale,
 vectors:snapshot.vectors,distancesKm:distances,earthCenteredVectorsKm:rel,
 productionAuthority:'NONE',
 warning:'Single epoch for display only. Not spacecraft trajectory, authenticated custody, or moving ephemeris.'
};
fs.writeFileSync(dir+'/game_navigation_snapshot_candidate.json',JSON.stringify(output,null,2)+'\n');
console.log('GATE5_GAME_BROWSER_PARSER_OK',JSON.stringify({epoch:output.jdTdb,distances:output.distancesKm}));
