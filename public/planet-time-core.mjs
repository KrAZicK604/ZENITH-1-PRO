/** Verified, finite-horizon JPL solar-system date/scale model.
 * No network, physical spacecraft controls or continuous SPICE kernel in browser.
 * All states are SSB-relative, J2000/ICRF, geometric KM and KM/S.
 * "UTC now" comes from the user's untrusted device clock.
 */
import {
 PLANET_CATALOG_SHA256, PLANET_CATALOG_RAW_BYTES, PLANET_CATALOG_GZIP_B64
} from './planet-ephemeris-data.mjs';
export const AU_KM=149597870.7;
export const MAX_DISPLAY_TIME_SPAN_SEC=43200;
const EXPECTED_IDS=['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'];
const DATE_LITERAL=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const isFiniteVec=v=>Array.isArray(v)&&v.length===6&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<1e13);
const mag3=p=>Math.hypot(p[0],p[1],p[2]);
export const formatKm=(n)=>Number.isFinite(n)?new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(n)+' km':'N/A';
export function parseUtcField(value){
 if(typeof value!=='string'||!DATE_LITERAL.test(value))return null;
 const ms=Date.parse(value+':00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,16)!==value)return null;
 return ms;
}
export function validatePlanetCatalog(data){
 if(!data||data.schema!=='ZENITH_PLANET_EPHEMERIS_V1'||data.productionAuthority!=='NONE')throw Error('CATALOG_SCHEMA_REJECTED');
 if(data.stepSeconds!==MAX_DISPLAY_TIME_SPAN_SEC)throw Error('CATALOG_STEP_REJECTED');
 if(data.beginUtc!=='2026-11-01T00:00:00Z'||data.endUtc!=='2027-03-01T00:00:00Z')throw Error('CATALOG_EPOCH_REJECTED');
 if(!Array.isArray(data.targets)||data.targets.length!==EXPECTED_IDS.length)throw Error('CATALOG_BODY_COUNT_REJECTED');
 if(!Array.isArray(data.samples))throw Error('CATALOG_SAMPLES_REJECTED');
 for(let i=0;i<EXPECTED_IDS.length;i++){
  const item=data.targets[i];
  if(item?.id!==EXPECTED_IDS[i]||!Number.isInteger(item.naif)||!['body_center','system_barycenter'].includes(item.kind)
   ||!(item.radiusKm>0&&item.radiusKm<1e6))throw Error('CATALOG_BODY_METADATA_INVALID');
 }
 const begin=Date.parse(data.beginUtc),end=Date.parse(data.endUtc);
 const count=Math.round((end-begin)/(data.stepSeconds*1000))+1;
 if(!Number.isSafeInteger(count)||count!==241||data.samples.length!==count)throw Error('CATALOG_INTERVAL_COUNT_REJECTED');
 for(const sample of data.samples){
  if(!Array.isArray(sample)||sample.length!==EXPECTED_IDS.length||!sample.every(isFiniteVec))
   throw Error('CATALOG_NONFINITE_OR_MISSING_STATE');
 }
 const limit=data.holdout;
 if(!limit||!Number.isFinite(limit.maxPositionErrorKm)||limit.maxPositionErrorKm>10
  ||!Number.isFinite(limit.maxVelocityErrorKmS)||limit.maxVelocityErrorKmS>.001
  ||limit.checks!==240*EXPECTED_IDS.length)throw Error('CATALOG_HOLDOUT_EVIDENCE_REJECTED');
 return data;
}
async function uncompressBytes(base64){
 if(typeof DecompressionStream!=='function'||typeof atob!=='function'||!globalThis.crypto?.subtle)
  throw Error('SECURE_DECOMPRESSION_UNAVAILABLE');
 const binary=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
 if(binary.byteLength>200000||binary.byteLength===0)throw Error('CATALOG_COMPRESSED_SIZE_INVALID');
 const stream=new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 if(bytes.byteLength!==PLANET_CATALOG_RAW_BYTES||bytes.byteLength>500000)
  throw Error('CATALOG_RAW_LENGTH_MISMATCH');
 const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
 const actual=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!==PLANET_CATALOG_SHA256)throw Error('CATALOG_SHA256_MISMATCH');
 return bytes;
}
let loadPromise;
export function loadPlanetCatalog(){
 if(!loadPromise){
  loadPromise=uncompressBytes(PLANET_CATALOG_GZIP_B64)
   .then(bytes=>validatePlanetCatalog(JSON.parse(new TextDecoder().decode(bytes))))
   .catch(e=>{loadPromise=null;throw e;});
 }
 return loadPromise;
}
export function cubicState(start,end,u,dtSeconds){
 if(!isFiniteVec(start)||!isFiniteVec(end)||!(dtSeconds>0&&Number.isFinite(dtSeconds))
  ||!Number.isFinite(u)||u<0||u>1)throw Error('CUBIC_STATE_INVALID_INPUT');
 const q=u*u,r=q*u;
 const h00=2*r-3*q+1,h10=r-2*q+u,h01=-2*r+3*q,h11=r-q;
 const d00=(6*q-6*u)/dtSeconds,d10=3*q-4*u+1,d01=(-6*q+6*u)/dtSeconds,d11=3*q-2*u;
 const p=[0,0,0],v=[0,0,0];
 for(let k=0;k<3;k++){
  p[k]=h00*start[k]+h10*dtSeconds*start[k+3]+h01*end[k]+h11*dtSeconds*end[k+3];
  v[k]=d00*start[k]+d10*start[k+3]+d01*end[k]+d11*end[k+3];
 }
 return {p,v};
}
export function sampleAtUtc(catalog,utcMilliseconds){
 if(!Number.isFinite(utcMilliseconds))return {status:'ABSTAIN_INVALID_TIME'};
 const start=Date.parse(catalog.beginUtc),end=Date.parse(catalog.endUtc);
 if(utcMilliseconds<start||utcMilliseconds>end)
  return {status:'ABSTAIN_OUTSIDE_VERIFIED_EPOCHS',beginUtc:catalog.beginUtc,endUtc:catalog.endUtc};
 const stepMs=catalog.stepSeconds*1000;
 const rawIndex=(utcMilliseconds-start)/stepMs;
 const index=Math.min(catalog.samples.length-2,Math.floor(rawIndex));
 const u=Math.max(0,Math.min(1,rawIndex-index));
 const states={};
 for(let j=0;j<catalog.targets.length;j++){
  const b=catalog.targets[j];
  const value=cubicState(catalog.samples[index][j],catalog.samples[index+1][j],u,catalog.stepSeconds);
  if(!value.p.every(Number.isFinite)||!value.v.every(Number.isFinite))return {status:'ABSTAIN_NUMERIC_STATE'};
  states[b.id]={...value,body:b};
 }
 const difference=(a,b)=>{
  const p=states[a].p,q=states[b].p;
  return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
 };
 return {status:'VERIFIED_SOURCE_INTERPOLATED',utc:new Date(utcMilliseconds).toISOString(),
  knot:index,u,states,distancesKm:{earthMoon:difference('earth','moon'),earthMars:difference('earth','mars'),
   earthSun:difference('earth','sun'),marsSun:difference('mars','sun')},
  maxMidpointResidualKm:catalog.holdout.maxPositionErrorKm,
  clockProvenance:'UNATTESTED_DEVICE_UTC_OR_USER_SELECTED'};
}
export const distance3=(p,q)=>mag3([p[0]-q[0],p[1]-q[1],p[2]-q[2]]);
export function relativeSun(state,id){
 const source=state.states[id]?.p,sun=state.states.sun?.p;
 if(!source||!sun)throw Error('NO_BODY');
 return source.map((x,i)=>x-sun[i]);
}
