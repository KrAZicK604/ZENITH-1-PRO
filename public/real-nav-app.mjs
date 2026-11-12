/** Real NASA/JPL Earth–Moon–Mars navigation on pinned exact date samples.
 * Independent from arcade ship physics and the game's arbitrary "gu" units.
 */
import {NAV_DATES,NAV_SOURCE,navigationAt,kmDisplay} from './real-nav-core.mjs';
const $=id=>document.getElementById(id);
const date=$('navDate'),route=$('navRoute'),canvas=$('navGeometry');
const ctx=canvas.getContext('2d');
const routeFields={
  earthMoon:{name:'EARTH → MOON',key:'earthToMoon',distance:'earthMoon',angle:'moonFromEarth'},
  earthMars:{name:'EARTH → MARS',key:'earthToMars',distance:'earthMars',angle:'marsFromEarth'},
  moonMars:{name:'MOON → MARS',key:'moonToMars',distance:'moonMars',angle:'marsFromMoon'},
};
for(const d of NAV_DATES){
 const option=document.createElement('option');option.value=d;option.textContent=d+' (00:00 TDB)';
 date.appendChild(option);
}
date.value=NAV_DATES[0];route.value='earthMars';
const fmt=(n,digits=0)=>Number(n).toLocaleString('en-CA',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const unitVector=v=>v.map(x=>fmt(x,0)).join(' · ');
function text(x,y,label,color='#d8f4ff',font='14px system-ui'){
 ctx.fillStyle=color;ctx.font=font;ctx.fillText(label,x,y);
}
function dot(x,y,r,color){
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
}
function drawPanel(left,label,vector,domain,body){
 const ox=left+232,oy=168,scale=130/domain;
 ctx.save();ctx.beginPath();ctx.rect(left,0,480,300);ctx.clip();
 ctx.fillStyle='#0b223b';ctx.fillRect(left+8,9,464,282);
 ctx.strokeStyle='#2f5772';ctx.strokeRect(left+8,9,464,282);
 ctx.textAlign='left';
 text(left+24,37,label,'#c9f5fb','bold 17px system-ui');
 text(left+24,56,'ICRF X / Y projection (Z shown numerically)','#a3c8da','12px system-ui');
 ctx.strokeStyle='#4a6d85';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(left+30,oy);ctx.lineTo(left+450,oy);ctx.moveTo(ox,74);ctx.lineTo(ox,258);ctx.stroke();
 text(left+446,oy-7,'+X','#88cfe2','11px system-ui');text(ox+6,82,'+Y','#88cfe2','11px system-ui');
 dot(ox,oy,6,'#70d8ff');
 text(ox+12,oy+19,'Earth','#aee4f3','bold 13px system-ui');
 const tx=ox+vector[0]*scale,ty=oy-vector[1]*scale;
 ctx.beginPath();ctx.setLineDash([5,6]);ctx.moveTo(ox,oy);ctx.lineTo(tx,ty);
 ctx.strokeStyle='#f1a278';ctx.lineWidth=1.8;ctx.stroke();ctx.setLineDash([]);
 dot(tx,ty,7,body==='MOON'?'#dddbe2':'#fc9070');
 text(tx+10,ty-10,body,'#ffe2cf','bold 14px system-ui');
 text(left+24,275,'Scale: 130 px = '+fmt(domain)+' km (X/Y axes)','#95c6d8','11px system-ui');
 ctx.restore();
}
function draw(n){
 if(!n)return;
 ctx.clearRect(0,0,960,300);
 ctx.fillStyle='#08172c';ctx.fillRect(0,0,960,300);
 drawPanel(0,'LOCAL EARTH / MOON',n.positionsKM.moon,450000,'MOON');
 drawPanel(480,'INTERPLANETARY EARTH / MARS',n.positionsKM.mars,430000000,'MARS');
}
function render(){
 const n=navigationAt(date.value);
 if(!n){$('navStatus').textContent='NO CATALOG SAMPLE — cannot extrapolate';return;}
 $('navStatus').textContent='JPL HORIZONS · VERIFIED STORED SAMPLE · '+n.dateTDB+' 00:00 TDB';
 $('distEMoon').textContent=kmDisplay(n.distancesKM.earthMoon);
 $('distEMars').textContent=kmDisplay(n.distancesKM.earthMars);
 $('distMMars').textContent=kmDisplay(n.distancesKM.moonMars);
 $('moonXYZ').textContent='('+unitVector(n.positionsKM.moon)+') km';
 $('marsXYZ').textContent='('+unitVector(n.positionsKM.mars)+') km';
 const item=routeFields[route.value]||routeFields.earthMars;
 const v=n.relativeVectorsKM[item.key],a=n.anglesDegrees[item.angle];
 $('navSelected').textContent=item.name+' · '+kmDisplay(n.distancesKM[item.distance]);
 $('navVector').textContent='('+unitVector(v)+') km';
 $('navBearing').textContent='RA '+fmt(a.rightAscensionDegrees,3)+'° · Dec '+fmt(a.declinationDegrees,3)+'°';
 $('navRate').textContent=fmt(n.rangeRatesKMPS[item.distance],3)+' km/s radial';
 $('navLight').textContent=fmt(n.distancesKM[item.distance]/299792.458,1)+' s at c (geometric)';
 $('navJD').textContent=fmt(n.julianDateTDB,4);
 draw(n);
}
date.addEventListener('change',render);route.addEventListener('change',render);
$('navSourceLink').href=NAV_SOURCE.urls[0];
$('navSourceLink').rel='noopener noreferrer';
$('navSourceLink').target='_blank';
render();
// Test-only readout; no simulated ship authority or network capability.
if(new URLSearchParams(location.search).get('test')==='1'){
 window.__realNavTest=Object.freeze({
  snapshot:()=>({day:date.value,route:route.value,
   earthMoon:$('distEMoon').textContent,earthMars:$('distEMars').textContent,
   moonMars:$('distMMars').textContent,source:$('navStatus').textContent}),
 });
}
