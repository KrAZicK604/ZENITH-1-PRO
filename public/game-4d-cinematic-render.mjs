/** Cinematic 4D scene, isolated from the fixed-step simulation.
 * Reproduces the previously approved original reference ship as a
 * moving chase-view sprite with bank/attitude transforms (not volumetric 3D).
 * All navigation values are ARCADE GAME UNITS, not km or light speed.
 */
import {SHIP_IMAGE_URI} from './ship-cinematic-asset.mjs';
const W=960,H=540,shipArt=new Image();
shipArt.decoding='async';
shipArt.src=SHIP_IMAGE_URI;
let artReady=false;
shipArt.addEventListener('load',()=>artReady=true);
const random=(()=>{let s=48193;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
const stars=Array.from({length:230},()=>({x:random()*W,y:random()*H,r:.23+random()*.82,a:.22+random()*.62,d:.18+random()*.9}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mod=(v,m)=>((v%m)+m)%m;
export const cinematicAssetStatus=()=>Object.freeze({loaded:artReady,width:shipArt.naturalWidth,height:shipArt.naturalHeight});
function backdrop(ctx,s){
 ctx.fillStyle='#000000';ctx.fillRect(0,0,W,H);
 // Only star points provide distant glow. No haze, nebula or course grid.
 for(const st of stars){
  const x=mod(st.x-s.y*st.d*.11,W),y=mod(st.y+s.z*st.d*.1,H);
  ctx.globalAlpha=st.a;ctx.fillStyle='#e8f0ff';
  if(st.r>.94){ctx.shadowColor='#bddeff';ctx.shadowBlur=4;}
  ctx.fillRect(x,y,st.r,st.r);ctx.shadowBlur=0;
 }
 ctx.globalAlpha=1;
}
function camera(s){return{x:s.x-190,y:s.y,z:s.z+36};}
function project(p,c){
 const depth=p.x-c.x;if(depth<=12)return null;
 const k=460/depth;return{x:W*.5+(p.y-c.y)*k,y:H*.5-(p.z-c.z)*k,k};
}
function body(ctx,p,r,c,color){
 const q=project(p,c);if(!q)return;
 const radius=clamp(r*q.k,0,260);
 if(q.x+radius<0||q.x-radius>W||q.y+radius<0||q.y-radius>H)return;
 const g=ctx.createRadialGradient(q.x-radius*.4,q.y-radius*.45,0,q.x,q.y,radius);
 g.addColorStop(0,color);g.addColorStop(.58,'#25272e');g.addColorStop(1,'#030407');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,radius,0,Math.PI*2);ctx.fill();
}
function surroundings(ctx,f){
 const c=camera(f.ship);
 body(ctx,f.moon,f.moon.r,c,'#74767a');
 body(ctx,f.goal,f.goal.r,c,'#784636');
 for(const a of f.asteroids)body(ctx,a,a.r,c,'#424850');
}
function fallback(ctx){
 ctx.fillStyle='#475565';ctx.beginPath();
 ctx.moveTo(0,-115);ctx.lineTo(115,0);ctx.lineTo(298,67);ctx.lineTo(85,49);
 ctx.lineTo(0,93);ctx.lineTo(-85,49);ctx.lineTo(-298,67);
 ctx.lineTo(-115,0);ctx.closePath();ctx.fill();
 for(const x of [-100,0,100]){
  const g=ctx.createRadialGradient(x,48,3,x,48,33);
  g.addColorStop(0,'#d7f8ff');g.addColorStop(.55,'#8cddff');g.addColorStop(1,'#061a30');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,48,33,0,Math.PI*2);ctx.fill();
 }
}
function craft(ctx,f){
 const s=f.ship,t=f.ticks/60;
 const bank=clamp(s.roll,-.48,.48),yaw=clamp(s.yaw,-.6,.6),pitch=clamp(s.pitch,-.6,.6);
 ctx.save();
 ctx.translate(W/2+yaw*43,H*.75+pitch*28);
 ctx.rotate(bank*.64);
 ctx.transform(1,yaw*.11,-yaw*.09,1,0,0);
 const scale=1+Math.sin(t*20)*.002;ctx.scale(scale,scale);
 if(artReady){
  ctx.globalCompositeOperation='screen';
  // The original reference image is cropped to a ship-only 620x298
  // still. 'screen' makes its nearly-black surround disappear on black.
  ctx.drawImage(shipArt,-365,-179,730,351);
  ctx.globalCompositeOperation='source-over';
 }else fallback(ctx);
 const speed=Math.hypot(s.vx,s.vy,s.vz);
 if(artReady&&speed>18){
  ctx.globalAlpha=clamp((speed-18)/210,0,.24);
  for(const x of [-172,0,173]){
   const g=ctx.createRadialGradient(x,94,1,x,113,36);
   g.addColorStop(0,'#99ecff');g.addColorStop(1,'rgba(0,10,55,0)');
   ctx.fillStyle=g;ctx.fillRect(x-44,70,88,95);
  }
 }
 ctx.restore();ctx.globalAlpha=1;
}
function hud(ctx,f){
 const s=f.ship,v=Math.hypot(s.vx,s.vy,s.vz);
 ctx.save();ctx.fillStyle='rgba(0,0,0,.48)';ctx.strokeStyle='rgba(99,195,210,.36)';ctx.lineWidth=.9;
 ctx.fillRect(14,16,237,105);ctx.strokeRect(14,16,237,105);
 ctx.fillRect(781,16,165,62);ctx.strokeRect(781,16,165,62);
 ctx.fillStyle='#88dbe3';ctx.font='bold 12px ui-monospace,monospace';ctx.fillText('4D NAV · GAME UNITS',26,35);
 ctx.font='12px ui-monospace,monospace';ctx.fillStyle='#d5eef7';
 ctx.fillText('X '+s.x.toFixed(1)+' gu',26,57);
 ctx.fillText('Y '+s.y.toFixed(1)+' gu',26,75);
 ctx.fillText('Z '+s.z.toFixed(1)+' gu',26,93);
 ctx.fillText('t '+(f.ticks/60).toFixed(2)+' s',26,111);
 ctx.fillStyle='#88dbe3';ctx.fillText('VELOCITY',794,38);
 ctx.fillStyle='#d5eef7';ctx.fillText(v.toFixed(1)+' gu/s',794,58);
 ctx.beginPath();ctx.arc(W/2,191,44,-.75,.75);
 ctx.moveTo(W/2-44*Math.cos(.75),191+44*Math.sin(.75));
 ctx.arc(W/2,191,44,Math.PI-.75,Math.PI+.75);ctx.stroke();
 ctx.beginPath();ctx.moveTo(474,191);ctx.lineTo(486,191);
 ctx.moveTo(480,185);ctx.lineTo(480,197);ctx.stroke();
 ctx.fillStyle='#78adbb';ctx.font='11px ui-monospace,monospace';
 ctx.fillText('3D SPACE + SIMULATION TIME  ·  ARCADE PHYSICS',18,H-19);
 ctx.restore();
}
export function renderCinematic(ctx,f){
 backdrop(ctx,f.ship);surroundings(ctx,f);craft(ctx,f);hud(ctx,f);
}
