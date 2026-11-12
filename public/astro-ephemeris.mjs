/**
 * Offline NASA/JPL Horizons vector snapshot adapter for Earth (399),
 * Moon (301), Mars (499). Never silently substitutes fictional positions.
 * Coordinates: geometric barycentric ICRF XYZ, kilometers, TDB epoch.
 * Only one timestamp per snapshot; no orbital interpolation/extrapolation.
 */
export const BODIES=Object.freeze({earth:{id:399,name:'Earth'},moon:{id:301,name:'Moon'},mars:{id:499,name:'Mars'}});
export const NASA_REFERENCE=Object.freeze({
 earthMoonMeanKm:384400,
 earthMarsMinReferenceKm:54_600_000,
 earthMarsMaxReferenceKm:401_400_000,
 earthMarsMinMaxAreNotUniversalHardBounds:true
});
const num=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e13;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function distancesKm(snapshot){
 const s=validateSnapshot(snapshot);
 const e=s.vectors.earth,m=s.vectors.moon,r=s.vectors.mars;
 return Object.freeze({earthMoon:dist(e,m),earthMars:dist(e,r),moonMars:dist(m,r)});
}
export function validateSnapshot(s){
 if(!s||typeof s!=='object'||Array.isArray(s))throw Error('SNAPSHOT_REQUIRED');
 if(s.schema!=='zenith.horizons.vectors.v1')throw Error('SCHEMA_MISMATCH');
 if(s.source!=='NASA/JPL Horizons'||s.center!=='500@0'||s.frame!=='ICRF'||s.units!=='KM-S'||s.timeScale!=='TDB')throw Error('FRAME_OR_SOURCE_MISMATCH');
 if(!Number.isFinite(s.jdTdb)||s.jdTdb<2400000||s.jdTdb>2600000)throw Error('INVALID_EPOCH');
 if(!s.vectors||typeof s.vectors!=='object'||Array.isArray(s.vectors))throw Error('VECTORS_REQUIRED');
 for(const [key,body] of Object.entries(BODIES)){
  const v=s.vectors[key];
  if(!v||v.command!==body.id||v.jdTdb!==s.jdTdb||!num(v.x)||!num(v.y)||!num(v.z))throw Error('INVALID_VECTOR_'+key.toUpperCase());
 }
 return s;
}
export function shipDistancesKm(snapshot,ship){
 validateSnapshot(snapshot);
 if(!ship||!num(ship.x)||!num(ship.y)||!num(ship.z))throw Error('SHIP_VECTOR_INVALID');
 return Object.fromEntries(Object.keys(BODIES).map(k=>[k,dist(ship,snapshot.vectors[k])]));
}
export function relativeVectorsKm(snapshot,origin='earth'){
 validateSnapshot(snapshot);
 if(!Object.hasOwn(BODIES,origin))throw Error('INVALID_ORIGIN');
 const o=snapshot.vectors[origin];
 return Object.fromEntries(Object.keys(BODIES).map(k=>{
  const b=snapshot.vectors[k];return[k,{x:b.x-o.x,y:b.y-o.y,z:b.z-o.z}];
 }));
}
export function formatKm(km){
 if(!Number.isFinite(km)||km<0)throw Error('INVALID_DISTANCE');
 return new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(km)+' km';
}
/**
 * Parse one Horizons VECTORS plain-text reply. Reject wrong target, center,
 * frame, units, ambiguous multi-epoch blocks and missing source markers.
 * Horizons output is public scientific data, not cryptographically signed.
 */
export function parseHorizonsVector(raw,command){
 if(typeof raw!=='string'||raw.length>250_000)throw Error('INVALID_HORIZONS_TEXT');
 if(![399,301,499].includes(command))throw Error('INVALID_BODY');
 if(!/Target body name:\s*[^\n]*\(\s*(?:399|301|499)\s*\)/i.test(raw))throw Error('TARGET_HEADER_MISSING');
 const targetMatch=raw.match(/Target body name:\s*[^\n]*\(\s*(399|301|499)\s*\)/i);
 if(Number(targetMatch?.[1])!==command)throw Error('TARGET_MISMATCH');
 if(!/Center body name:\s*Solar System Barycenter/i.test(raw))throw Error('CENTER_MISMATCH');
 if(!/Reference frame\s*:\s*ICRF/i.test(raw))throw Error('FRAME_MISMATCH');
 if(!/Output units\s*:\s*KM-S/i.test(raw))throw Error('UNITS_MISMATCH');
 if(!/Time format\s*:\s*CAL/i.test(raw))throw Error('TIME_FORMAT_MISMATCH');
 const block=raw.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
 if(!block)throw Error('EPHEMERIS_MARKERS_MISSING');
 const times=[...block[1].matchAll(/^\s*(\d{7}\.\d+)\s*=\s*(?:A\.D\.|B\.C\.)/gm)];
 if(times.length!==1)throw Error('ONE_EPOCH_REQUIRED');
 const epoch=Number(times[0][1]);
 const vectorLines=[...block[1].matchAll(/\bX\s*=\s*([+\-\d.Ee]+)\s+Y\s*=\s*([+\-\d.Ee]+)\s+Z\s*=\s*([+\-\d.Ee]+)/g)];
 if(vectorLines.length!==1)throw Error('ONE_VECTOR_REQUIRED');
 const [x,y,z]=vectorLines[0].slice(1).map(Number);
 if(![x,y,z].every(num)||!Number.isFinite(epoch))throw Error('NONFINITE_VECTOR');
 return {command,jdTdb:epoch,x,y,z};
}
export function assembleHorizonsSnapshot({earth,moon,mars}){
 const vectors={earth:parseHorizonsVector(earth,399),moon:parseHorizonsVector(moon,301),mars:parseHorizonsVector(mars,499)};
 const jdTdb=vectors.earth.jdTdb;
 return validateSnapshot({schema:'zenith.horizons.vectors.v1',source:'NASA/JPL Horizons',
  center:'500@0',frame:'ICRF',units:'KM-S',timeScale:'TDB',jdTdb,vectors});
}
