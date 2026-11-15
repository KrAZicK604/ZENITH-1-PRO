/** Original ZENITH ACE-class procedural three-dimensional spacecraft mesh.
 * Local XYZ: +X nose/front; +/-Y left/right wings; +Z dorsal/up.
 * Geometry inspired by the user's 3-engine metallic concept presentation,
 * not a projection of that image, a claimed real aerospace design, or 4th spatial axis.
 * No dependencies, texture servers, networking, model downloads or executable data.
 */
export const VERTEX_STRIDE = 10;  // xyz, normal xyz, linear rgb, emissive
export const DESIGN_METRICS = Object.freeze({
  lengthUnits: 198, wingspanUnits: 204, engineCount: 3,
  wingCount: 2, finCount: 2, scientificUnits: 'fictional game/model units'
});
const METAL = Object.freeze({
  graphite: '#27313c', gunmetal:'#394b5b', charcoal:'#19252f',
  silver:'#aebeca', panel:'#6b8498', edge:'#d2e0e7',
  vent:'#101a24', glass:'#174562', ice:'#8addf3',
  engine:'#67c7fc', core:'#d9faff', amber:'#ff9b60'
});
const finite = p => p.length === 3 && p.every(Number.isFinite);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);

export function createStarfighterMesh() {
  const opaque=[], exhaust=[], edges=[], parts={};
  const register=name=>{parts[name]=(parts[name]||0)+1;};
  function face(a,b,c,color,emission=0,group='opaque',part='body'){
    if(!finite(a)||!finite(b)||!finite(c)||!Number.isFinite(emission))
      throw Error('NONFINITE_MESH_VERTEX');
    const n=cross(sub(b,a),sub(c,a));
    const size=Math.hypot(...n);
    if(size<=1e-9)return;
    const normal=n.map(v=>v/size), tint=rgb(color), dest=group==='exhaust'?exhaust:opaque;
    const output=v=>dest.push(...v,...normal,...tint,emission);
    output(a);output(b);output(c);
    if(group==='opaque'){
      for(const [u,v] of [[a,b],[b,c],[c,a]]){
        for(const p of [u,v])edges.push(...p, ...normal, .38,.83,.98, .65);
      }
    }
    register(part);
  }
  const quad=(a,b,c,d,color,emission=0,group='opaque',part='body')=>{
    face(a,b,c,color,emission,group,part);
    face(a,c,d,color,emission,group,part);
  };
  function solidPolygon(points,offset,color,part){
    // A small finite 3D triangular fan; points describe a convex top polygon.
    const center=points.reduce((s,p)=>s.map((v,i)=>v+p[i]/points.length),[0,0,0]);
    const move=p=>p.map((v,i)=>v+offset[i]);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],c=move(b),d=move(a);
      face(center,a,b,color,0,'opaque',part);
      face(move(center),c,d,METAL.charcoal,0,'opaque',part);
      quad(a,d,c,b,METAL.gunmetal,0,'opaque',part);
    }
  }
  function box(x,y,z,sx,sy,sz,color,part='detail',em=0){
    const xmin=x-sx/2,xmax=x+sx/2,ymin=y-sy/2,ymax=y+sy/2,zmin=z-sz/2,zmax=z+sz/2;
    const p=[
      [xmin,ymin,zmin],[xmax,ymin,zmin],[xmax,ymax,zmin],[xmin,ymax,zmin],
      [xmin,ymin,zmax],[xmax,ymin,zmax],[xmax,ymax,zmax],[xmin,ymax,zmax]
    ];
    for(const [a,b,c,d] of [[0,1,2,3],[4,7,6,5],[0,4,5,1],
      [1,5,6,2],[2,6,7,3],[3,7,4,0]])
      quad(p[a],p[b],p[c],p[d],color,em,'opaque',part);
  }
  function cylinderX(xA,xB,y,z,rA,rB,segments,color,em=0,part='engine'){
    for(let i=0;i<segments;i++){
      const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
      const p=[xA,y+rA*Math.cos(a),z+rA*Math.sin(a)];
      const q=[xA,y+rA*Math.cos(b),z+rA*Math.sin(b)];
      const r=[xB,y+rB*Math.cos(b),z+rB*Math.sin(b)];
      const s=[xB,y+rB*Math.cos(a),z+rB*Math.sin(a)];
      quad(p,q,r,s,color,em,'opaque',part);
    }
  }
  function torusX(x,y,z,major,minor,color,em=.35){
    const around=28,through=8;
    function pt(theta,phi){
      const r=major+minor*Math.cos(phi);
      return [x+minor*Math.sin(phi),y+r*Math.cos(theta),z+r*Math.sin(theta)];
    }
    for(let i=0;i<around;i++)for(let j=0;j<through;j++){
      const a=i*2*Math.PI/around,b=(i+1)*2*Math.PI/around,c=j*2*Math.PI/through,d=(j+1)*2*Math.PI/through;
      quad(pt(a,c),pt(b,c),pt(b,d),pt(a,d),color,em,'opaque','thruster_ring');
    }
  }
  // Sculpted 18-sided hull: broad rear fuselage, pointed forward nose.
  const stations=[
    [69,.5,.5,0],[60,4,2.5,1],[50,8,4.7,2],[38,11,7,3],
    [18,14,8.8,3],[-8,19,11,3],[-32,19,11,2],[-51,16,10,1],
    [-64,12,7,0]
  ];
  const sectors=18;
  function ring(st,i){
    const [x,w,h,c]=st,a=i*2*Math.PI/sectors;
    return [x,w*Math.cos(a),c+h*Math.sin(a)];
  }
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<sectors;i++){
    const k=(i+1)%sectors;
    quad(ring(stations[j],i),ring(stations[j],k),ring(stations[j+1],k),
      ring(stations[j+1],i),(j+i)%6===0?METAL.edge:(j%3===0?METAL.panel:METAL.gunmetal),
      0,'opaque','main_hull');
  }
  // Centerline spinal plating and laminated armor panels.
  box(-12,0,14,75,6,3,METAL.graphite,'spine');
  for(let x=-42;x<37;x+=13){
    box(x,0,15,9,11,1.5,x%2?METAL.graphite:METAL.panel,'armor');
  }
  // Canopy, actual raised opaque geometry with metallic frame around blue glass.
  const canopy=[
    [42,0,8],[32,-6,12],[13,-7,18],[-2,-7,17],[-8,0,13],
    [-2,7,17],[13,7,18],[32,6,12]
  ];
  solidPolygon(canopy,[0,0,2.5],METAL.glass,'cockpit');
  box(21,0,18,26,1,2,METAL.edge,'canopy_spine');
  for(const side of [-1,1]){
    // Thick swept delta wings, distinctive silhouette matching the concept.
    const z=-3;
    const plan=[
      [31,side*13,z], [6,side*39,z-1],[-15,side*91,z-3],
      [-38,side*101,z-3],[-58,side*35,z-1],[-45,side*15,z]
    ];
    solidPolygon(plan,[0,0,-4],METAL.panel,'delta_wing');
    // Wing structural inlays flush above the primary surface.
    quad([-10,side*48,-2.0],[-24,side*75,-3.9],[-36,side*72,-4.2],
      [-28,side*45,-2.4],METAL.graphite,0,'opaque','wing_panels');
    quad([-16,side*42,-1.5],[-21,side*67,-3.0],[-24,side*65,-3.2],
      [-20,side*42,-1.6],METAL.edge,0,'opaque','wing_trim');
    box(-29,side*84,-1,4,10,2,METAL.ice,'wing_lights',.85);
    box(-11,side*16,10,20,3,5,METAL.charcoal,'intake');
    // Vertical stabilizers protrude above the engine deck.
    const fin=[
      [-55,side*19,7],[-38,side*19,33],[-19,side*19,46],
      [-12,side*19,43],[-25,side*19,8]
    ];
    solidPolygon(fin,[0,side*3,0],METAL.silver,'vertical_fin');
    box(-29,side*22,17,23,2,2,METAL.graphite,'fin_reinforcement');
    box(-18,side*24,12,11,3,1.5,METAL.amber,'fin_light',.8);
    // Paired vent and maintenance hatches.
    for(let x=-42;x<12;x+=11){
      box(x,side*13,9,7,3,2,METAL.vent,'vent');
    }
  }
  // Three fully modeled independent rear engines with internal glow cores.
  for(const y of [-22,0,22]){
    const z=-4;
    cylinderX(-56,-69,y,z,10.4,9.7,26,METAL.graphite,.01,'engine_shell');
    cylinderX(-68,-73,y,z,9.8,8.4,26,METAL.silver,.06,'engine_lip');
    torusX(-73,y,z,8.15,1.4,METAL.ice,.95);
    cylinderX(-74,-74.12,y,z,7.1,7.1,26,METAL.core,1.0,'thruster_core');
    // Unlike a cylinder side, these discs close the aft aperture and
    // actually illuminate the engine core in rear and oblique views.
    for(let i=0;i<26;i++){
      const a=i*2*Math.PI/26,b=(i+1)*2*Math.PI/26;
      const edge=(x,r,t)=>[x,y+r*Math.cos(t),z+r*Math.sin(t)];
      face([-74.3,y,z],edge(-74.3,7.0,a),edge(-74.3,7.0,b),
        METAL.engine,1.2,'opaque','thruster_core');
      face([-74.39,y,z],edge(-74.39,4.6,a),edge(-74.39,4.6,b),
        METAL.core,1.6,'opaque','thruster_core');
    }
    cylinderX(-75,-79,y,z,6.0,4.2,26,METAL.engine,1.1,'thruster_core');
    for(let i=0;i<24;i++){
      const a=i*Math.PI*2/24,b=(i+1)*Math.PI*2/24;
      for(let section=0;section<6;section++){
        const t=section/6,u=(section+1)/6;
        const point=(v,ang)=>[-79-71*v,y+(5.3*(1-v)+.18)*Math.cos(ang),
          z+(5.3*(1-v)+.18)*Math.sin(ang)];
        const color=section<2?METAL.core:section<4?METAL.engine:METAL.glass;
        quad(point(t,a),point(t,b),point(u,b),point(u,a),color,.5*(1-t),
          'exhaust','exhaust_plume');
      }
    }
    // Metal sleeves and struts around each radial nacelle.
    box(-50,y,5.5,20,3,3,METAL.silver,'nacelle_brace');
    box(-55,y,-14,18,3,2,METAL.charcoal,'nacelle_brace');
  }
  // Hull rivets, alternating structural guides, small warm navigation lamps.
  for(const side of [-1,1]){
    for(let x=-36;x<42;x+=11){
      box(x,side*8.5,7.7,4,1.5,.9,METAL.edge,'armor_seam');
    }
    box(13,side*12,6,6,2,2,METAL.amber,'marker_light',.65);
  }
  for(const [key,array] of [['opaque',opaque],['exhaust',exhaust],['edges',edges]]){
    if(!array.length||array.length%VERTEX_STRIDE||array.some(x=>!Number.isFinite(x))||
      array.length>1600000)throw Error('MESH_INVALID_'+key.toUpperCase());
  }
  const solid=new Float32Array(opaque);
  const plume=new Float32Array(exhaust);
  const wire=new Float32Array(edges);
  const xs=[],ys=[],zs=[];
  for(let i=0;i<solid.length;i+=VERTEX_STRIDE){
    xs.push(solid[i]);ys.push(solid[i+1]);zs.push(solid[i+2]);
  }
  const bounds={min:[Math.min(...xs),Math.min(...ys),Math.min(...zs)],
    max:[Math.max(...xs),Math.max(...ys),Math.max(...zs)]};
  return {solid,plume,wire,bounds,parts,
    triangleCount:solid.length/(VERTEX_STRIDE*3),
    plumeTriangleCount:plume.length/(VERTEX_STRIDE*3),
    engineCenters:Object.freeze([-22,0,22].map(y=>Object.freeze([-74,y,-4])))};
}
