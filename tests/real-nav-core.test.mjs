import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JPL_NAV_CATALOG} from '../public/catalogs/jpl-earth-moon-mars-2026.mjs';
import {NAV_DATES,NAV_SOURCE,validateNavigationCatalog,navigationAt,subtract3,dot3,norm3,separationKM,sphericalICRF,rangeRateKMPS,kmDisplay} from '../public/real-nav-core.mjs';

const n=()=>navigationAt('2026-11-12');
const near=(actual,expected,tol=1e-6)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} vs ${expected}`);
test('32 externally sourced ephemeris days are source-bound and match exact frame/units',()=>{
 assert.equal(validateNavigationCatalog(),true);
 assert.equal(NAV_DATES.length,32);
 assert.equal(NAV_DATES.at(0),'2026-11-12');
 assert.equal(NAV_DATES.at(-1),'2026-12-13');
 assert.equal(NAV_SOURCE.authority,'NASA/JPL Horizons API');
 assert.equal(NAV_SOURCE.frame,'ICRF');
 assert.equal(NAV_SOURCE.timeScale,'TDB');
 assert.equal(JPL_NAV_CATALOG.origin.id,399);
 assert.equal(JPL_NAV_CATALOG.targets.moon,301);
 assert.equal(JPL_NAV_CATALOG.targets.mars,499);
 assert.equal(JPL_NAV_CATALOG.units.position,'km');
});
test('November 12 snapshot reproduces actual JPL geometric distances',()=>{
 const s=n();
 near(s.distancesKM.earthMoon,404167.0283061912,.0001);
 near(s.distancesKM.earthMars,200668210.3707659,.001);
 near(s.distancesKM.moonMars,200845354.18174812,.001);
 assert.deepEqual(s.positionsKM.earth,[0,0,0]);
});
test('actual JPL Earth/Moon and Earth/Mars vector coordinates match stored raw results',()=>{
 const s=n();
 near(s.positionsKM.moon[0],-73711.14673626817,.00001);
 near(s.positionsKM.moon[1],-350624.0052719023,.00001);
 near(s.positionsKM.moon[2],-187030.6406548695,.00001);
 near(s.positionsKM.mars[0],-161381431.3491109,.0001);
 near(s.positionsKM.mars[1],106700873.3418583,.0001);
 near(s.positionsKM.mars[2],53279338.37054353,.0001);
});
test('Moon-to-Mars uses 3D vector subtraction, never scalar route-distance subtraction',()=>{
 const s=n();
 const delta=subtract3(s.positionsKM.mars,s.positionsKM.moon);
 assert.deepEqual(s.relativeVectorsKM.moonToMars,delta);
 near(norm3(delta),s.distancesKM.moonMars,.00001);
 assert.ok(Math.abs((s.distancesKM.earthMars-s.distancesKM.earthMoon)-s.distancesKM.moonMars)>100000);
});
test('daily samples individually cross-check Moon-relative Mars from separate Horizons origin',()=>{
 for(const row of JPL_NAV_CATALOG.rows){
  const s=navigationAt(row.dateTDB);assert.ok(s);
  near(s.distancesKM.earthMoon,row.distancesKM.earthMoon,.001);
  near(s.distancesKM.earthMars,row.distancesKM.earthMars,.001);
  near(s.distancesKM.moonMars,row.distancesKM.moonMars,.001);
  near(s.distancesKM.moonMars,row.moonMarsIndependentCheckKM,.01);
  assert.ok(s.distancesKM.moonMars<=s.distancesKM.earthMars+s.distancesKM.earthMoon+.01);
  assert.ok(s.distancesKM.moonMars>=Math.abs(s.distancesKM.earthMars-s.distancesKM.earthMoon)-.01);
 }
});
test('no guessed out-of-range date or interpolation',()=>{
 for(const date of ['2026-11-11','2026-12-14','2027-01-01','2026-11-12T04:00:00','bad',''])assert.equal(navigationAt(date),null);
});
test('same-date sample yields finite physical line-of-sight bearings',()=>{
 for(const day of NAV_DATES){
  const s=navigationAt(day);
  for(const a of Object.values(s.anglesDegrees)){
   assert.ok(a.rightAscensionDegrees>=0&&a.rightAscensionDegrees<360);
   assert.ok(a.declinationDegrees>=-90&&a.declinationDegrees<=90);
  }
  for(const v of Object.values(s.rangeRatesKMPS))assert.ok(Number.isFinite(v)&&Math.abs(v)<100);
 }
});
test('direction of sample can differ from scalar speed sign',()=>{
 assert.deepEqual(sphericalICRF([1,0,0]),{rightAscensionDegrees:0,declinationDegrees:0});
 near(sphericalICRF([0,0,1]).declinationDegrees,90);
 assert.equal(sphericalICRF([0,0,0]),null);
 near(rangeRateKMPS([10,0,0],[-2,0,0]),-2);
 near(rangeRateKMPS([10,0,0],[2,0,0]),2);
});
test('rejects invalid vectors, zero radial distance, and negative distance formatting',()=>{
 assert.throws(()=>norm3([1,Infinity,3]));
 assert.throws(()=>subtract3([1,2],[1,2,3]));
 assert.throws(()=>dot3([0,0,0],[0,0]));
 assert.throws(()=>rangeRateKMPS([0,0,0],[1,2,3]));
 assert.throws(()=>kmDisplay(-1));
 assert.equal(kmDisplay(404167.028),'404,167 km');
});
test('tampered numeric catalog fails closed despite unchanged source hash metadata',()=>{
 const c=structuredClone(JPL_NAV_CATALOG);
 c.rows[0].earthToMarsKM[0]+=100;
 assert.throws(()=>validateNavigationCatalog(c),/distance mismatch/);
});
test('tampered time, units and source digest fail closed',()=>{
 for(const mutate of [
  c=>{c.rows[4].dateTDB=c.rows[3].dateTDB;},
  c=>{c.referenceFrame='ECLIPTIC';},
  c=>{c.units.position='au';},
  c=>{c.provenance.mars_earth.responseSHA256='forged';},
  c=>{c.rows.pop();},
 ]){
  const c=structuredClone(JPL_NAV_CATALOG);mutate(c);
  assert.throws(()=>validateNavigationCatalog(c));
 }
});
test('3D geometry and range are measured in kilometres and never overwrite arcade game units',()=>{
 const app=readFileSync(new URL('../public/real-nav-app.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('../public/real-nav-core.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/game-ace.html',import.meta.url),'utf8');
 assert.match(html,/earth-centred ICRF|Earth-centred ICRF/i);
 assert.match(html,/navGeometry/);
 assert.match(html,/game-4d\.html/);
 assert.match(app,/navigationAt\(/);
 assert.doesNotMatch(app,/game\.ship\.x/);
 for(const token of ['fetch(', 'WebSocket', 'XMLHttpRequest', 'buy.stripe.com', 'innerHTML']){
  assert.ok(![app,core].some(c=>c.includes(token)),token);
 }
 assert.ok(separationKM([1,2,3],[4,6,3])===5);
});
