/** Zero-network black-space, time-dependent JPL planetarium canvas renderer.
 * Dynamical positions are 1:1 kilometers; visual planet radii may be boosted
 * for readability. Never projects arcade ship coordinates onto real ephemerides.
 */
import {AU_KM,relativeSun} from './planet-time-core.mjs';
const WIDTH=960,HEIGHT=540,TAU=Math.PI*2;
const rng=(()=>{let n=271828;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};})();
const stars=Array.from({length:230},()=>({x:rng()*WIDTH,y:rng()*HEIGHT,r:.23+rng()*.8,a:.17+rng()*.52}));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const VIEWS=Object.freeze({
 outer:{name:'Full solar system',rangeKm:AU_KM*34,origin:'sun'},
 inner:{name:'Inner solar system',rangeKm:AU_KM*2.2,origin:'sun'},
 earthMoon:{name:'Earth–Moon',rangeKm:660000,origin:'earth'}
});
export function planetMapProjection(relativeKm,view){
 const cfg=VIEWS[view];
 if(!cfg||!Array.isArray(relativeKm)||relativeKm.length!==3||!relativeKm.every(Number.isFinite))
  throw Error('PLANET_PROJECTION_INVALID');
 const az=.39,inc=.64,co=Math.cos(az),si=Math.sin(az),ci=Math.cos(inc),sn=Math.sin(inc);
 const x=relativeKm[0]*co+relativeKm[1]*si;
 const y=(-relativeKm[0]*si+relativeKm[1]*co)*sn+relativeKm[2]*ci;
 const pxPerKm=218/cfg.rangeKm;
 return {x:WIDTH/2+x*pxPerKm,y:HEIGHT/2-y*pxPerKm,pxPerKm};
}
function relative(state,id,origin){
 if(origin==='sun')return relativeSun(state,id);
 const pos=state.states[id]?.p,reference=state.states[origin]?.p;
 if(!pos||!reference)throw Error('NO_PHYSICAL_ORIGIN');
 return pos.map((value,i)=>value-reference[i]);
}
function starscape(ctx){
 ctx.fillStyle='#000';ctx.fillRect(0,0,WIDTH,HEIGHT);
 for(const star of stars){
  ctx.fillStyle='rgba(202,225,248,'+star.a.toFixed(3)+')';
  ctx.fillRect(star.x,star.y,star.r,star.r);
 }
}
function sphere(ctx,body,point,radius,highlight,physicalSize){
 const r=physicalSize?radius:Math.max(radius,body.id==='sun'?9:body.id==='earth'?6:4.2);
 if(point.x+r<0||point.x-r>WIDTH||point.y+r<0||point.y-r>HEIGHT)return;
 if(physicalSize&&r<.45){
  // An actual subpixel planet cannot be rendered as a visible disk.
  ctx.fillStyle='rgba(134,187,211,.65)';ctx.fillRect(point.x,point.y,1,1);
  return;
 }
 if(body.id==='sun'&&r>1){
  ctx.save();ctx.shadowColor='#f8d895';ctx.shadowBlur=18;ctx.fillStyle='#fff4c2';
  ctx.beginPath();ctx.arc(point.x,point.y,r,0,TAU);ctx.fill();ctx.restore();
 }else{
  const g=ctx.createRadialGradient(point.x-r*.36,point.y-r*.42,0,point.x,point.y,r);
  g.addColorStop(0,'#f3f0df');
  g.addColorStop(.16,body.color);
  g.addColorStop(.65,body.color);
  g.addColorStop(1,'#06090e');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(point.x,point.y,r,0,TAU);ctx.fill();
 }
 if(body.id==='saturn'&&r>2.5){
  ctx.save();ctx.strokeStyle='rgba(216,192,137,.65)';ctx.lineWidth=physicalSize?.6:2;
  ctx.beginPath();ctx.ellipse(point.x,point.y,r*1.85,r*.61,-.25,0,TAU);ctx.stroke();ctx.restore();
 }
 if(highlight){
  ctx.strokeStyle='#82e9e5';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(point.x,point.y,r+5,0,TAU);ctx.stroke();
 }
}
function trace(ctx,catalog,state,view,id){
 if(!catalog||!state||!catalog.targets)return;
 const cfg=VIEWS[view],idx=catalog.targets.findIndex(x=>x.id===id),base=catalog.targets.findIndex(x=>x.id===cfg.origin);
 if(idx<0||base<0)return;
 const start=Math.max(0,state.knot-24),end=Math.min(catalog.samples.length-1,state.knot+24);
 ctx.beginPath();let touched=false;
 for(let k=start;k<=end;k+=2){
  const p=catalog.samples[k][idx],origin=catalog.samples[k][base];
  const q=planetMapProjection(p.slice(0,3).map((x,i)=>x-origin[i]),view);
  if(!Number.isFinite(q.x)||!Number.isFinite(q.y))continue;
  if(!touched){ctx.moveTo(q.x,q.y);touched=true;}else ctx.lineTo(q.x,q.y);
 }
 if(touched){ctx.strokeStyle='rgba(95,155,197,.22)';ctx.lineWidth=1;ctx.stroke();}
}
function scaleReference(ctx,view){
 const cfg=VIEWS[view],length=125,rKm=length*cfg.rangeKm/218;
 ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(17,477,370,47);
 ctx.strokeStyle='rgba(111,173,196,.6)';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(27,498);ctx.lineTo(27+length,498);
 ctx.moveTo(27,492);ctx.lineTo(27,504);ctx.moveTo(27+length,492);ctx.lineTo(27+length,504);ctx.stroke();
 ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#b9d9e7';
 ctx.fillText((rKm>=AU_KM*.5?(rKm/AU_KM).toFixed(2)+' AU':
   new Intl.NumberFormat('en-CA',{maximumFractionDigits:0}).format(rKm)+' km')+' · LINEAR POSITION SCALE',28,519);
}
export function renderPlanetarium(ctx,state,catalog,opts={}){
 starscape(ctx);
 const view=opts.view in VIEWS?opts.view:'inner';
 if(state?.status!=='VERIFIED_SOURCE_INTERPOLATED'){
  ctx.fillStyle='#d7a3a3';ctx.font='bold 17px system-ui';
  ctx.fillText(state?.status||'AWAITING VERIFIED DATA',28,70);
  return;
 }
 const cfg=VIEWS[view],focus=opts.focus||'earth',physicalSize=!!opts.trueSize;
 const bodies=catalog.targets;
 for(const body of bodies){if(view==='earthMoon'&&!['earth','moon'].includes(body.id))continue;
  trace(ctx,catalog,state,view,body.id);
 }
 for(const body of bodies){
  if(view==='earthMoon'&&!['earth','moon'].includes(body.id))continue;
  const p=planetMapProjection(relative(state,body.id,cfg.origin),view);
  const radiusPx=body.radiusKm*p.pxPerKm;
  sphere(ctx,body,p,radiusPx,body.id===focus,physicalSize);
  if(p.x<-55||p.x>WIDTH+55||p.y<-30||p.y>HEIGHT+30)continue;
  ctx.font='12px ui-monospace,monospace';ctx.textAlign='left';
  ctx.fillStyle=body.id===focus?'#bafef1':'#abc0cf';
  if(!physicalSize||radiusPx>=.45)ctx.fillText(body.name+(body.kind==='system_barycenter'?' *':''),p.x+Math.max(8,radiusPx+6),p.y-7);
 }
 scaleReference(ctx,view);
 ctx.fillStyle='rgba(0,0,0,.73)';ctx.fillRect(12,13,674,65);
 ctx.font='bold 15px ui-monospace,monospace';ctx.textAlign='left';ctx.fillStyle='#92e4ec';
 ctx.fillText('ZENITH // JPL PLANETARIUM // 3D SPACE + UTC TIME',22,35);
 ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#d0e2ee';
 ctx.fillText(state.utc.replace('.000Z','Z')+' · '+cfg.name+' · '+(physicalSize?'TRUE RADIUS':'ENLARGED BODY MARKERS'),22,57);
 ctx.fillStyle='#8eabbc';ctx.font='11px ui-monospace,monospace';
 ctx.textAlign='right';ctx.fillText('* PLANETARY SYSTEM BARYCENTER',942,522);
 ctx.textAlign='left';
}
