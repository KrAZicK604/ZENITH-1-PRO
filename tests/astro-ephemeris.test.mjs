import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalog as browserCatalog} from '../public/data/earth-moon-mars-2026.mjs';
import {C_KM_S,NASA_REFERENCE,vecDistance,relativePosition,validateCatalog,getEpoch,distances,positionsEarthCentered,schematicProjectionKm,distanceLabel} from '../public/astro-ephemeris.mjs';
const json=JSON.parse(readFileSync(new URL('../public/data/earth-moon-mars-2026-moshier.json',import.meta.url),'utf8'));
test('frozen scientific catalog mirrors browser payload exactly',()=>{
 assert.deepEqual(browserCatalog.epochs,json.epochs);
 assert.equal(browserCatalog.frame,json.frame);assert.equal(browserCatalog.units,json.units);
 assert.equal(browserCatalog.source.backend,json.source.backend);
});
test('catalog provenance explicitly identifies Moshier rather than JPL',()=>{
 assert.equal(json.source.version,'2.10.03');
 assert.match(json.source.method,/FLG_MOSEPH/);
 assert.match(json.source.notes,/not JPL Horizons/);
 assert.equal(json.source.au_km,149597870.7);
});
test('catalog is valid with 5 unique UTC dates and three finite 3D vectors',()=>{
 validateCatalog(browserCatalog);validateCatalog(json);
 assert.equal(json.epochs.length,5);
 assert.equal(new Set(json.epochs.map(r=>r.utc)).size,5);
});
test('independently pinned reference distance calculations on Nov 12',()=>{
 const d=distances(getEpoch(browserCatalog,'2026-11-12T00:00:00Z'));
 assert.ok(Math.abs(d.earthMoonKm-404141.274)<.005);
 assert.ok(Math.abs(d.earthMarsKm-200669747.880)<.005);
 assert.ok(Math.abs(d.moonMarsKm-200846503.958)<.005);
});
test('independently pinned Nov 26 Moon perigee vicinity and Mars distance',()=>{
 const d=distances(getEpoch(browserCatalog,'2026-11-26T00:00:00Z'));
 assert.ok(Math.abs(d.earthMoonKm-359348.187)<.005);
 assert.ok(Math.abs(d.earthMarsKm-182682984.009)<.005);
 assert.ok(Math.abs(d.moonMarsKm-182541903.884)<.005);
});
test('all distances obey triangle inequality and NASA broad reference ranges',()=>{
 for(const row of json.epochs){
  const d=distances(row);
  assert.ok(Math.abs(d.earthMarsKm-d.moonMarsKm)<=d.earthMoonKm+1e-6);
  assert.ok(d.earthMoonKm>350000&&d.earthMoonKm<410000);
  assert.ok(d.earthMarsKm>NASA_REFERENCE.earthMarsClosestKm);
  assert.ok(d.earthMarsKm<NASA_REFERENCE.earthMarsFarKm+1000000);
 }
});
test('Earth-centered coordinates preserve geometric distances',()=>{
 for(const row of json.epochs){
  const p=positionsEarthCentered(row),d=distances(row);
  assert.deepEqual(p.earth,[0,0,0]);
  assert.ok(Math.abs(Math.hypot(...p.moon)-d.earthMoonKm)<1e-6);
  assert.ok(Math.abs(Math.hypot(...p.mars)-d.earthMarsKm)<1e-6);
  assert.ok(Math.abs(vecDistance(p.moon,p.mars)-d.moonMarsKm)<1e-6);
 }
});
test('light-time is distance divided by speed of light, not a mission ETA',()=>{
 const d=distances(json.epochs[0]);
 assert.ok(Math.abs(d.earthMoonLightSeconds-d.earthMoonKm/C_KM_S)<1e-12);
 assert.ok(Math.abs(d.earthMarsLightMinutes-d.earthMarsKm/C_KM_S/60)<1e-12);
});
test('schematic projection is uniformly scaled, Moon inset is clearly not to scale',()=>{
 const p=schematicProjectionKm(json.epochs[0]);
 assert.ok(Math.abs(Math.hypot(...p.mars)-430)<1e-8);
 assert.ok(Math.hypot(...p.moon)<2);
 assert.equal(p.moonVisibleAtFullScale,false);
 assert.ok(Math.hypot(...p.moonInset)>100);
});
test('unlisted dates reject rather than invent interpolation',()=>{
 assert.throws(()=>getEpoch(browserCatalog,'2026-11-13T00:00:00Z'),/No verified sample/);
});
test('catalog tampering and malformed vectors fail closed',()=>{
 for(const mutation of [
  c=>{c.units='au';},c=>{c.frame='galactic';},c=>{c.epochs[0].moon=[0,0,0];},
  c=>{c.epochs[0].mars[0]=NaN;},c=>{c.epochs[1].utc=c.epochs[0].utc;},
  c=>{c.epochs[0].utc='bad';}
 ]){
  const c=structuredClone(json);mutation(c);assert.throws(()=>validateCatalog(c));
 }
 assert.throws(()=>vecDistance([0,0],[1,2,3]));
 assert.throws(()=>relativePosition([0,0,0],[Infinity,0,0]));
 assert.throws(()=>schematicProjectionKm(json.epochs[0],{maxPixels:0}));
});
test('distance format displays actual km',()=>assert.equal(distanceLabel(384400),'384,400 km'));
test('navigation is embedded in existing tactical game without touching billing',()=>{
 const html=readFileSync(new URL('../public/game-ace.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../public/astro-navigation-app.mjs',import.meta.url),'utf8');
 const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.match(html,/astro-navigation-app\.mjs/);
 assert.match(html,/astroEM/);assert.match(html,/astroMR/);assert.match(html,/astroER/);
 assert.match(html,/independent of the compressed arcade ship controls/);
 assert.ok(!app.includes('fetch('));
 assert.ok(!app.includes('buy.stripe.com'));
 assert.match(cfg.headers[0].headers.find(x=>x.key==='Content-Security-Policy').value,/connect-src 'none'/);
});
