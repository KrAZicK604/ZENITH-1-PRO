import {assembleHorizonsSnapshot,distancesKm,relativeVectorsKm,formatKm} from './astro-ephemeris.mjs';
const $=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
const clear=()=>{for(const id of ['em','er','mr'])$(id).textContent='—';$('diagram').replaceChildren();$('details').textContent='No accepted ephemeris loaded.';};
function element(name,attrs={},text){
 const e=document.createElementNS(svgNS,name);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function plot(vectors){
 const names=['earth','moon','mars'],colors=['#61b9f4','#cbd5e1','#f47b57'];
 const pts=names.map(n=>vectors[n]);
 // A 2D orthographic projection of actual 3D vectors. Select the pair of
 // axes with greatest spread, rather than pretending the scene is to scale.
 const axes=['x','y','z'];
 const spreads=axes.map(k=>Math.max(...pts.map(p=>p[k]))-Math.min(...pts.map(p=>p[k])));
 const chosen=[0,1,2].sort((a,b)=>spreads[b]-spreads[a]).slice(0,2);
 const [ax,ay]=chosen.map(i=>axes[i]);
 const minX=Math.min(...pts.map(p=>p[ax])),maxX=Math.max(...pts.map(p=>p[ax]));
 const minY=Math.min(...pts.map(p=>p[ay])),maxY=Math.max(...pts.map(p=>p[ay]));
 const scale=Math.min(700/Math.max(maxX-minX,1),230/Math.max(maxY-minY,1));
 const xy=p=>[100+(p[ax]-minX)*scale,275-(p[ay]-minY)*scale];
 const svg=$('diagram');svg.replaceChildren();
 svg.append(element('text',{x:25,y:25,fill:'#a8cfe2','font-size':15},'Earth-centered ICRF: '+ax.toUpperCase()+' / '+ay.toUpperCase()+' projection'));
 const points=pts.map(xy);
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)svg.append(element('line',{x1:points[i][0],y1:points[i][1],x2:points[j][0],y2:points[j][1],stroke:'#446d88','stroke-dasharray':'5 7','stroke-width':1.5}));
 names.forEach((name,i)=>{
  const [x,y]=points[i];svg.append(element('circle',{cx:x,cy:y,r:9,fill:colors[i],stroke:'#eaf7ff','stroke-width':2}));
  svg.append(element('text',{x:x+13,y:y-11,fill:'#f1faff','font-size':16},name.toUpperCase()));
 });
}
$('load').addEventListener('submit',event=>{
 event.preventDefault();clear();
 try{
  const s=assembleHorizonsSnapshot({earth:$('earth').value,moon:$('moon').value,mars:$('mars').value});
  const d=distancesKm(s),rel=relativeVectorsKm(s);
  $('em').textContent=formatKm(d.earthMoon);
  $('er').textContent=formatKm(d.earthMars);
  $('mr').textContent=formatKm(d.moonMars);
  $('status').textContent='FORMAT_ACCEPTED_UNVERIFIED_SOURCE: derived from supplied same-frame/same-epoch vectors; authenticity and astronomical accuracy NOT independently verified.';
  $('details').textContent='Epoch: JD(TDB) '+s.jdTdb+'\nFrame: ICRF barycentric, KM-S\n'+
   Object.entries(rel).map(([name,v])=>name.toUpperCase()+': X='+v.x.toFixed(3)+' km, Y='+v.y.toFixed(3)+' km, Z='+v.z.toFixed(3)+' km').join('\n');
  plot(rel);
 }catch(err){
  $('status').textContent='REJECTED: '+String(err?.message||'INVALID_INPUT')+'. Check body IDs, center, reference frame, units and identical epochs.';
 }
});
