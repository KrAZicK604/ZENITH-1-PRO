/** Original cinematic fighter model: generated polygon geometry, not a bitmap
 * or third-party spacecraft model. +X forward, Y wingspan, Z vertical.
 * Camera/project function supplied by each game mode.
 */
const V=[],F=[];
const v=(x,y,z)=>{V.push([x,y,z]);return V.length-1;};
const tri=(a,b,c,mat)=>F.push({indices:[a,b,c],material:mat});
const quad=(a,b,c,d,mat)=>{tri(a,b,c,mat);tri(a,c,d,mat);};
function shell(){
 const nose=v(67,0,0),frontTop=v(25,0,8),frontLeft=v(20,-10,0),frontRight=v(20,10,0),
  crown=v(-11,0,13),left=v(-10,-15,1),right=v(-10,15,1),
  belly=v(-16,0,-12),tailTop=v(-48,0,9),tailLeft=v(-49,-14,0),tailRight=v(-49,14,0),
  tailBottom=v(-49,0,-9);
 tri(nose,frontLeft,frontTop,'silver');tri(nose,frontTop,frontRight,'light');
 quad(frontTop,frontLeft,left,crown,'silver');quad(frontTop,crown,right,frontRight,'light');
 quad(frontLeft,nose,belly,left,'shadow');quad(nose,frontRight,right,belly,'steel');
 quad(crown,left,tailLeft,tailTop,'steel');quad(crown,tailTop,tailRight,right,'silver');
 quad(left,belly,tailBottom,tailLeft,'shadow');quad(belly,right,tailRight,tailBottom,'steel');
 quad(tailTop,tailLeft,tailBottom,tailRight,'shadow');
 // Cockpit canopy is a separate raised dark reflective polyhedron.
 const c0=v(28,0,9),c1=v(9,-7,14),c2=v(9,7,14),c3=v(-13,-8,13),c4=v(-13,8,13),c5=v(-6,0,21);
 tri(c0,c1,c5,'glass');tri(c0,c5,c2,'glassLight');
 tri(c1,c3,c5,'glassDark');tri(c5,c4,c2,'glass');
 tri(c3,c4,c5,'glassDark');
 for(const side of [-1,1]){
  const y=side;
  // Swept wing: broad, tapered, armored and physically thick.
  const a=v(13,y*12,1),b=v(-16,y*17,3),c=v(-36,y*81,-6),d=v(-49,y*76,-9),
   e=v(-42,y*17,-8),a2=v(13,y*12,-5),c2=v(-36,y*81,-10);
  quad(a,b,c,d,side===-1?'silver':'light');
  tri(a,d,e,'steel');tri(a,a2,e,'shadow');tri(c,d,c2,'shadow');
  quad(a2,c2,d,e,'shadow');
  // High-contrast military-style wing stripe, without any real weapon model.
  const s0=v(-27,y*46,-3.6),s1=v(-31,y*53,-4.4),s2=v(-36,y*65,-6.5),s3=v(-33,y*57,-5.8);
  quad(s0,s1,s2,s3,'stripe');
  // Tall twin stabilizers.
  const r0=v(-33,y*16,4),r1=v(-48,y*17,4),r2=v(-55,y*29,33),r3=v(-39,y*24,37);
  quad(r0,r1,r2,r3,side===-1?'steel':'silver');
  tri(r0,r3,r2,'shadow');
  // Twin engine housings, six facets around each nacelle.
  const ring0=[],ring1=[];
  for(let i=0;i<8;i++){
   const ang=i*Math.PI/4,dy=Math.cos(ang)*6,dz=Math.sin(ang)*6;
   ring0.push(v(-31,y*13+dy,-3+dz));
   ring1.push(v(-58,y*13+dy,-3+dz));
  }
  for(let i=0;i<8;i++)quad(ring0[i],ring0[(i+1)%8],ring1[(i+1)%8],ring1[i],i%2?'steel':'shadow');
  for(let i=1;i<7;i++)tri(ring1[0],ring1[i],ring1[i+1],'nozzle');
 }
}
shell();
export const CINEMATIC_SHIP=Object.freeze({
 vertices:Object.freeze(V.map(x=>Object.freeze(x))),
 faces:Object.freeze(F.map(f=>Object.freeze(f)))
});
export const SHIP_PALETTE=Object.freeze({
 light:'#d7e0e9',silver:'#aebac9',steel:'#65798d',shadow:'#263747',
 glass:'#143c5c',glassLight:'#287da2',glassDark:'#081a30',stripe:'#d7e5ef',nozzle:'#142432'
});
export function drawCinematicShip(ctx,ship,projectWorld){
 const points=CINEMATIC_SHIP.vertices.map(vertex=>projectWorld(vertex));
 const faces=CINEMATIC_SHIP.faces.map(face=>({
  ...face,pts:face.indices.map(i=>points[i])
 })).filter(face=>face.pts.every(Boolean))
 .sort((a,b)=>b.pts.reduce((sum,p)=>sum+p.depth,0)-a.pts.reduce((sum,p)=>sum+p.depth,0));
 ctx.save();
 for(const face of faces){
  const p=face.pts;
  ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
  ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();
  ctx.fillStyle=SHIP_PALETTE[face.material];ctx.fill();
  ctx.strokeStyle=face.material.startsWith('glass')?'#5ea4c2':'rgba(195,218,231,.19)';
  ctx.lineWidth=face.material.startsWith('glass')?.95:.5;ctx.stroke();
 }
 // Realistically restrained propulsion glow: only with active thrust.
 const power=ship.throttle||0;
 if(power>.005){
  for(const y of [-13,13]){
   const p=projectWorld([-59,y,-3]);if(!p)continue;
   const r=Math.max(1,Math.min(20,p.k*5));
   ctx.shadowColor=ship.burning?'#ffb979':'#73dfff';
   ctx.shadowBlur=ship.burning?22:13;
   ctx.fillStyle=ship.burning?'#ffcc8c':'#6fc8ee';
   ctx.beginPath();ctx.ellipse(p.x,p.y,r*.65,r,0,0,Math.PI*2);ctx.fill();
  }
 }
 ctx.restore();
}
