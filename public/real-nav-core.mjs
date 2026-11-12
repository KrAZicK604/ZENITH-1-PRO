/** Source-attributed NASA/JPL Horizons navigation, distinct from arcade flight.
 * Each record is a geometric 00:00 TDB ICRF vector at Earth center.
 * Centre-to-centre separations are not transfer trajectories or travel time.
 * No network, credentials, checkout logic, extrapolation, or implicit accuracy claims.
 */
import {JPL_NAV_CATALOG} from './catalogs/jpl-earth-moon-mars-2026.mjs';

const L = JPL_NAV_CATALOG;
const isVec=v=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x));
export const subtract3=(a,b)=>{
 if(!isVec(a)||!isVec(b))throw new RangeError('three finite coordinates required');
 return a.map((v,i)=>v-b[i]);
};
export const norm3=v=>{
 if(!isVec(v))throw new RangeError('three finite coordinates required');
 return Math.hypot(v[0],v[1],v[2]);
};
export const dot3=(a,b)=>{
 if(!isVec(a)||!isVec(b))throw new RangeError('three finite coordinates required');
 return a.reduce((s,v,i)=>s+v*b[i],0);
};
export const separationKM=(a,b)=>norm3(subtract3(a,b));
export const sphericalICRF=v=>{
 const distance=norm3(v);
 if(distance===0)return null;
 const az=((Math.atan2(v[1],v[0])*180/Math.PI)%360+360)%360;
 const elevation=Math.atan2(v[2],Math.hypot(v[0],v[1]))*180/Math.PI;
 return {rightAscensionDegrees:az,declinationDegrees:elevation};
};
export const rangeRateKMPS=(position,velocity)=>{
 const distance=norm3(position);
 if(distance<=0)throw new RangeError('nonzero vector required');
 return dot3(position,velocity)/distance;
};

export function validateNavigationCatalog(catalog=L){
 if(catalog.sourceAuthority!=='NASA/JPL Horizons API'
  ||catalog.timeScale!=='TDB'||catalog.referenceFrame!=='ICRF'
  ||catalog.vectorCorrection!=='NONE'||catalog.origin?.id!==399
  ||catalog.targets?.moon!==301||catalog.targets?.mars!==499
  ||catalog.units?.position!=='km'||catalog.units?.velocity!=='km/s'
  ||catalog.rows?.length!==32)throw new Error('untrusted or incomplete ephemeris catalog');
 for(const key of ['moon_earth','mars_earth','mars_moon']){
  if(!/^[a-f0-9]{64}$/.test(catalog.provenance?.[key]?.responseSHA256||''))throw Error('missing source digest');
 }
 const seen=new Set();
 for(let i=0;i<catalog.rows.length;i++){
  const r=catalog.rows[i];
  const expected=new Date(Date.UTC(2026,10,12+i)).toISOString().slice(0,10);
  if(r.dateTDB!==expected||seen.has(r.dateTDB)||!Number.isFinite(r.julianDateTDB))
   throw Error('missing, duplicated, or non-sequential ephemeris date');
  seen.add(r.dateTDB);
  if(!isVec(r.earthToMoonKM)||!isVec(r.earthToMarsKM)||!isVec(r.moonVelocityKMPS)||!isVec(r.marsVelocityKMPS))
   throw Error('missing finite position/velocity vector');
  const em=norm3(r.earthToMoonKM),er=norm3(r.earthToMarsKM);
  const mm=separationKM(r.earthToMarsKM,r.earthToMoonKM);
  if(!(em>325000&&em<440000&&er>50e6&&er<430e6)
   ||Math.abs(em-r.distancesKM?.earthMoon)>.01
   ||Math.abs(er-r.distancesKM?.earthMars)>.01
   ||Math.abs(mm-r.distancesKM?.moonMars)>.01
   ||Math.abs(mm-r.moonMarsIndependentCheckKM)>.01)throw Error('JPL distance mismatch');
 }
 return true;
}

validateNavigationCatalog();

export const NAV_DATES=Object.freeze(L.rows.map(row=>row.dateTDB));
export const NAV_SOURCE=Object.freeze({
 authority:L.sourceAuthority,frame:L.referenceFrame,timeScale:L.timeScale,
 sampleSpacing:L.rangeTDB.spacing,origin:L.origin.name,sourceRunId:L.sourceRunId,
 urls:Object.freeze(Object.values(L.provenance).map(item=>item.url)),
});

export function navigationAt(dateTDB){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateTDB)))return null;
 const r=L.rows.find(row=>row.dateTDB===dateTDB);
 if(!r)return null; // No extrapolation or guessed live positions.
 const earth=[0,0,0],moon=r.earthToMoonKM,mars=r.earthToMarsKM;
 const moonToMars=subtract3(mars,moon);
 const velocities={earthToMoon:r.moonVelocityKMPS,earthToMars:r.marsVelocityKMPS,
  moonToMars:subtract3(r.marsVelocityKMPS,r.moonVelocityKMPS)};
 return {
  dateTDB:r.dateTDB,julianDateTDB:r.julianDateTDB,
  positionsKM:{earth,moon,mars},
  relativeVectorsKM:{earthToMoon:moon,earthToMars:mars,moonToMars},
  distancesKM:{
   earthMoon:separationKM(earth,moon),
   earthMars:separationKM(earth,mars),
   moonMars:separationKM(moon,mars),
  },
  anglesDegrees:{
   moonFromEarth:sphericalICRF(moon),
   marsFromEarth:sphericalICRF(mars),
   marsFromMoon:sphericalICRF(moonToMars),
  },
  rangeRatesKMPS:{
   earthMoon:rangeRateKMPS(moon,velocities.earthToMoon),
   earthMars:rangeRateKMPS(mars,velocities.earthToMars),
   moonMars:rangeRateKMPS(moonToMars,velocities.moonToMars),
  },
  note:'Actual JPL geometric center separations at 00:00 TDB; not spacecraft path length or travel duration',
 };
}

export function kmDisplay(value){
 if(!Number.isFinite(value)||value<0)throw new RangeError('nonnegative finite distance required');
 return Math.round(value).toLocaleString('en-CA')+' km';
}
