import {catalog} from './data/earth-moon-mars-2026.mjs';
import {validateCatalog,getEpoch,distances,positionsEarthCentered,distanceLabel,C_KM_S} from './astro-ephemeris.mjs';
const $=id=>document.getElementById(id);
const ctx=$('astroMap').getContext('2d');
const colors={earth:'#61b6ff',moon:'#c1c9d7',mars:'#ff895f'};
const format=km=>distanceLabel(km);
function drawCircle(x,y,r,color,label){
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle='#e5f6ff';ctx.fillText(label,x,y+r+22);
}
function draw(epoch){
 const row=getEpoch(catalog,epoch),d=distances(row),p=positionsEarthCentered(row);
 $('astroEM').textContent=format(d.earthMoonKm);
 $('astroER').textContent=format(d.earthMarsKm);
 $('astroMR').textContent=format(d.moonMarsKm);
 $('astroLightEM').textContent=d.earthMoonLightSeconds.toFixed(2)+' s';
 $('astroLightER').textContent=d.earthMarsLightMinutes.toFixed(2)+' min';
 $('astroLightMR').textContent=d.moonMarsLightMinutes.toFixed(2)+' min';
 for(const body of ['earth','moon','mars']){
  $('astro'+body.toUpperCase()).textContent=p[body].map(v=>Math.round(v).toLocaleString('en-CA')).join(' / ')+' km';
 }
 const W=960,H=390;ctx.fillStyle='#061224';ctx.fillRect(0,0,W,H);
 const ex=120,ey=175,mx=800,my=175;
 // Earth and Mars are plotted at correct center-to-center separation
 // along a rotated screen axis; this view does not show the true 3D angle.
 ctx.strokeStyle='#42607e';ctx.lineWidth=2;ctx.setLineDash([7,10]);
 ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(mx,my);ctx.stroke();ctx.setLineDash([]);
 const kmPerPx=d.earthMarsKm/(mx-ex);
 ctx.fillStyle='#d2eaff';ctx.textAlign='center';ctx.font='14px system-ui';
 ctx.fillText('EARTH–MARS: '+format(d.earthMarsKm),465,145);
 ctx.fillText('SCHEMATIC LINE • DISTANCE TO SCALE',465,238);
 drawCircle(ex,ey,18,colors.earth,'EARTH');drawCircle(mx,my,18,colors.mars,'MARS');
 // Moon at true scale is ~1.3 px from Earth: mark the actual separation
 // and provide a clearly labeled separate magnified inset.
 const moonX=ex+d.earthMoonKm/kmPerPx;
 ctx.strokeStyle='#c4cfe0';ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(moonX,ey);ctx.stroke();
 ctx.fillStyle=colors.moon;ctx.beginPath();ctx.arc(moonX,ey,2.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e8f5ff';ctx.textAlign='left';ctx.font='13px system-ui';
 ctx.fillText('MOON (real-scale marker)',135,258);
 ctx.strokeStyle='#4a7598';ctx.strokeRect(20,292,345,84);
 ctx.fillStyle='#a9e9ff';ctx.font='bold 13px system-ui';ctx.fillText('MOON INSET — ENLARGED, NOT TO SCALE',32,314);
 ctx.fillStyle='#d6e8f7';ctx.font='13px system-ui';ctx.fillText('Earth–Moon: '+format(d.earthMoonKm),32,337);
 ctx.fillText('Moon–Mars: '+format(d.moonMarsKm),32,358);
 ctx.textAlign='right';ctx.fillStyle='#9cb9cf';ctx.fillText(epoch+' / UTC / approximate Moshier ephemeris',940,367);
 $('astroStatus').textContent='Source: Swiss Ephemeris 2.10.03 / Moshier analytic. Center-to-center geometric distance; not travel-path length.';
}
try{
 validateCatalog(catalog);
 for(const row of catalog.epochs){
  const o=document.createElement('option');o.value=row.utc;o.textContent=row.utc.slice(0,10)+' (UTC)';
  $('astroEpoch').append(o);
 }
 $('astroEpoch').addEventListener('change',()=>draw($('astroEpoch').value));
 $('astroEpoch').value=catalog.epochs[0].utc;
 draw($('astroEpoch').value);
}catch(e){
 $('astroStatus').textContent='ASTRONOMY DATA UNAVAILABLE — '+String(e.message);
 for(const id of ['astroEM','astroER','astroMR'])$(id).textContent='UNVERIFIED';
}
