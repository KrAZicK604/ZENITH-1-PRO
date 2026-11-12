/** Source-aware astronomical distances, not arcade positions.
 * Coordinates are heliocentric equatorial-of-date KM at a specific epoch.
 * The coordinate basis changes with date; DO NOT interpolate these samples.
 */
export const C_KM_S=299792.458;
export const NASA_REFERENCE=Object.freeze({
 earthMoonMeanKm:384400,
 earthMarsClosestKm:54600000,
 earthMarsFarKm:400000000,
 moonApproxMinimumKm:356400,
 moonApproxMaximumKm:406700
});
export function vecDistance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
    [...a,...b].some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('Invalid 3D km vectors');
 return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
}
export function relativePosition(a,b){ // target b relative to origin a, KM
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3||
 [...a,...b].some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('Invalid position vectors');
 return b.map((v,i)=>v-a[i]);
}
export function validateCatalog(catalog){
 if(!catalog||catalog.schema!=='zenith.earth-moon-mars-ephemeris.v1'||
 catalog.units!=='km'||catalog.frame!=='heliocentric_equatorial_of_date'||
 catalog.source?.backend!=='Moshier analytic ephemeris (FLG_MOSEPH)'||
 !Array.isArray(catalog.epochs)||catalog.epochs.length<1)throw Error('Unsupported or missing ephemeris catalog');
 let previous='';
 for(const row of catalog.epochs){
  if(!/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(row.utc)||
  !Number.isFinite(Date.parse(row.utc))||row.utc<=previous)throw Error('Invalid or unordered UTC epoch');
  previous=row.utc;
  for(const key of ['earth','moon','mars']){
   if(!Array.isArray(row[key])||row[key].length!==3||
    row[key].some(v=>!Number.isFinite(v)))throw Error('Invalid body vector: '+key);
  }
  const em=vecDistance(row.earth,row.moon),er=vecDistance(row.earth,row.mars),mr=vecDistance(row.moon,row.mars);
  // Broad astronomical plausibility gates, not external source authentication.
  if(em<340000||em>420000||er<45000000||er>420000000||
    Math.abs(er-mr)>em+1e-6)throw Error('Ephemeris violates distance plausibility');
 }
 return catalog;
}
export function getEpoch(catalog,utc){
 validateCatalog(catalog);
 const row=catalog.epochs.find(x=>x.utc===utc);
 if(!row)throw Error('No verified sample for requested UTC epoch; do not invent/interpolate positions');
 return row;
}
export function distances(row){
 const earthMoon=vecDistance(row.earth,row.moon);
 const earthMars=vecDistance(row.earth,row.mars);
 const moonMars=vecDistance(row.moon,row.mars);
 return Object.freeze({
  earthMoonKm:earthMoon,earthMarsKm:earthMars,moonMarsKm:moonMars,
  earthMoonLightSeconds:earthMoon/C_KM_S,
  earthMarsLightMinutes:earthMars/C_KM_S/60,
  moonMarsLightMinutes:moonMars/C_KM_S/60
 });
}
export function positionsEarthCentered(row){
 return Object.freeze({
  earth:[0,0,0],
  moon:relativePosition(row.earth,row.moon),
  mars:relativePosition(row.earth,row.mars)
 });
}
export function schematicProjectionKm(row,{maxPixels=430}={}){
 if(!Number.isFinite(maxPixels)||maxPixels<=0)throw Error('Invalid projection scale');
 const p=positionsEarthCentered(row);
 const marsDistance=vecDistance(p.earth,p.mars);
 // Uniform distance-preserving projection into 3D scene coordinates.
 // Moon is necessarily subpixel at full Mars scale; render an INSET,
 // never falsely enlarge the Moon and label it to scale.
 const kmPerUnit=marsDistance/maxPixels;
 return Object.freeze({
  kmPerUnit,
  earth:[0,0,0],
  moon:p.moon.map(v=>v/kmPerUnit),
  mars:p.mars.map(v=>v/kmPerUnit),
  moonVisibleAtFullScale:false,
  moonInset: p.moon.map(v=>v/(400000/140))
 });
}
export function distanceLabel(km){
 if(!Number.isFinite(km)||km<0)throw Error('Invalid distance');
 return Math.round(km).toLocaleString('en-CA')+' km';
}
