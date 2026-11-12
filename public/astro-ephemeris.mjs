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
 if(s.source!=='NASA/JPL Horizons'||s.center!=='500@0'||s.frame!=='ICRF'||s.units!=='KM-S'||s.timeScale!=='TDB'||s.correction!=='NONE'||s.referencePlane!=='FRAME')throw Error('FRAME_OR_SOURCE_MISMATCH');
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
 if(typeof raw!=='string'||!raw.length||raw.length>250_000)throw Error('INVALID_HORIZONS_TEXT');
 if(![399,301,499].includes(command))throw Error('INVALID_BODY');
 const start=raw.indexOf('$$SOE'),finish=raw.indexOf('$$EOE');
 if(start<0||finish<start||raw.indexOf('$$SOE',start+5)!==-1||raw.indexOf('$$EOE',finish+5)!==-1)throw Error('EPHEMERIS_MARKERS_MISSING_OR_DUPLICATE');
 const header=raw.slice(0,start),block=raw.slice(start+5,finish);
 const headerLine=(label)=>{
  const matches=header.split(/\r?\n/).filter(l=>new RegExp('^\\s*'+label+'\\s*:','i').test(l));
  if(matches.length!==1)throw Error('MISSING_OR_DUPLICATE_HEADER_'+label.replace(/\s/g,'_').toUpperCase());
  return matches[0].slice(matches[0].indexOf(':')+1).trim();
 };
 const target=headerLine('Target body name').match(/\(\s*(\d+)\s*\)/);
 if(!target)throw Error('TARGET_HEADER_MISSING');
 if(Number(target[1])!==command)throw Error('TARGET_MISMATCH');
 if(!/^Solar System Barycenter\s*\(\s*0\s*\)(?:\s|$)/i.test(headerLine('Center body name')))throw Error('CENTER_MISMATCH');
 if(/^\s*Center-site name\s*:/im.test(header)&&!/^BODY CENTER\b/i.test(headerLine('Center-site name')))throw Error('CENTER_SITE_MISMATCH');
 // JPL can label an ecliptic output "Reference frame: ICRF/J2000.0".
 // The additional Coordinate systm header distinguishes actual XYZ axes.
 if(!/^ICRF(?:\/J2000\.0)?\s*$/i.test(headerLine('Reference frame')))throw Error('FRAME_MISMATCH');
 if(!/^KM-S\s*$/i.test(headerLine('Output units')))throw Error('UNITS_MISMATCH');
 if(!/^GEOMETRIC\s+cartesian\s+states\s*$/i.test(headerLine('Output type')))throw Error('CORRECTION_MISMATCH');
 if(!/^(?:0?[1234])(?:\s|$)/.test(headerLine('Output format')))throw Error('NO_POSITION_VECTOR');
 const coordinateLines=header.split(/\r?\n/).filter(l=>/^\s*Coordinate\s+(?:systm|system)\s*:/i.test(l));
 if(coordinateLines.length!==1)throw Error('COORDINATE_SYSTEM_UNVERIFIED');
 const plane=coordinateLines[0].slice(coordinateLines[0].indexOf(':')+1).trim();
 if(!/^(?:Earth Mean Equator and Equinox of Reference Epoch|ICRF equatorial(?: coordinates)?)\s*$/i.test(plane))throw Error('NOT_EQUATORIAL_ICRF');
 // Actual Horizons output has "Calendar mode", not "Time format: CAL".
 // The JDTDB heading and TDB suffix specify the needed time scale.
 if(!/^\s*JDTDB\s*$/m.test(header))throw Error('JDTDB_HEADER_REQUIRED');
 const dates=[...block.matchAll(/^\s*\d{7}\.\d+\s*=/gm)];
 if(dates.length!==1)throw Error('ONE_EPOCH_REQUIRED');
 const epochs=[...block.matchAll(/^\s*(\d{7}\.\d+)\s*=\s*(?:A\.D\.|B\.C\.)[^\r\n]*\bTDB\s*$/gm)];
 if(epochs.length!==1)throw Error('ONE_TDB_EPOCH_REQUIRED');
 const jdTdb=Number(epochs[0][1]);
 if(!Number.isFinite(jdTdb)||jdTdb<2400000||jdTdb>2600000)throw Error('INVALID_EPOCH');
 const N='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[Ee][+-]?\\d+)?';
 const vectorRegex=new RegExp('^\\s*X\\s*=\\s*('+N+')\\s+Y\\s*=\\s*('+N+')\\s+Z\\s*=\\s*('+N+')\\s*$','gm');
 const positions=[...block.matchAll(vectorRegex)];
 if(positions.length!==1)throw Error('ONE_VECTOR_REQUIRED');
 const [x,y,z]=positions[0].slice(1).map(Number);
 if(![x,y,z].every(num))throw Error('NONFINITE_VECTOR');
 return Object.freeze({command,jdTdb,x,y,z});
}
export function assembleHorizonsSnapshot({earth,moon,mars}){
 const vectors={earth:parseHorizonsVector(earth,399),moon:parseHorizonsVector(moon,301),mars:parseHorizonsVector(mars,499)};
 const jdTdb=vectors.earth.jdTdb;
 return validateSnapshot({schema:'zenith.horizons.vectors.v1',source:'NASA/JPL Horizons',
  center:'500@0',frame:'ICRF',referencePlane:'FRAME',correction:'NONE',units:'KM-S',timeScale:'TDB',jdTdb,vectors});
}
