import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DESIGN_METRICS,VERTEX_STRIDE,createStarfighterMesh} from '../public/ship-3d-mesh.mjs';
import {VIEW_MODES,multiply4,translation,scaling,rotationX,rotationY,rotationZ,
  lookAt,perspective,shipAttitude} from '../public/ship-3d-webgl.mjs';

const M=createStarfighterMesh();
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,String(a)+' vs '+String(b));
const transform=(m,p)=>[
 m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
 m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
 m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
];

test('real 3D ship contains thousands of actual triangle vertices, not an image plane',()=>{
 assert.ok(M.triangleCount>800,'too few ship triangles: '+M.triangleCount);
 assert.ok(M.triangleCount<35000,'excessive geometry');
 assert.ok(M.plumeTriangleCount>300);
 assert.equal(M.solid.length,VERTEX_STRIDE*3*M.triangleCount);
 assert.equal(M.plume.length,VERTEX_STRIDE*3*M.plumeTriangleCount);
 assert.ok(M.wire.length>10000);
});
test('all 3D vertex coordinates/normals/materials are finite',()=>{
 for(const [name,v] of [['solid',M.solid],['plume',M.plume],['wire',M.wire]]){
  assert.equal(v.length%VERTEX_STRIDE,0);
  for(const n of v)assert.ok(Number.isFinite(n),name+' contains nonfinite value');
 }
});
test('true per-triangle normals are unit length',()=>{
 for(let i=0;i<M.solid.length;i+=VERTEX_STRIDE*3){
  const n=M.solid.slice(i+3,i+6);
  near(Math.hypot(...n),1,1e-5);
 }
});
test('hull wings, fins and cockpit have positive 3D depth',()=>{
 const b=M.bounds;
 assert.ok(b.min[0]<-75&&b.max[0]>65);
 assert.ok(b.min[1]<-95&&b.max[1]>95);
 assert.ok(b.min[2]<-12&&b.max[2]>44);
 assert.ok(M.parts.main_hull>100);
 assert.ok(M.parts.delta_wing>=20);
 assert.ok(M.parts.vertical_fin>=12);
 assert.ok(M.parts.cockpit>=12);
});
test('three separate geometric thruster nozzles are arranged symmetrically',()=>{
 assert.equal(M.engineCenters.length,3);
 assert.deepEqual(M.engineCenters.map(x=>x[1]),[-22,0,22]);
 assert.deepEqual(M.engineCenters.map(x=>x[2]),[-4,-4,-4]);
 assert.equal(DESIGN_METRICS.engineCount,3);
 assert.equal(DESIGN_METRICS.finCount,2);
 assert.ok(M.parts.thruster_ring>1000);
 assert.ok(M.parts.thruster_core>40);
});
test('detailed polygonal model has nonzero emissive metal and real engine plumes',()=>{
 let count=0;
 for(let i=9;i<M.solid.length;i+=VERTEX_STRIDE)if(M.solid[i]>=.6)count++;
 assert.ok(count>300);
 const xs=[];
 for(let i=0;i<M.plume.length;i+=VERTEX_STRIDE)xs.push(M.plume[i]);
 assert.ok(Math.min(...xs)<-135);
});
test('model generation deterministic byte-for-byte across builds',()=>{
 const n=createStarfighterMesh();
 assert.deepEqual(Array.from(n.solid),Array.from(M.solid));
 assert.deepEqual(n.parts,M.parts);
});
test('camera modes expose real multiple 3D inspection angles',()=>{
 assert.deepEqual(VIEW_MODES,['chase','orbit','top','side','front']);
});
test('column-major transform multiplication preserves expected translation and scaling',()=>{
 const a=multiply4(translation(5,-3,2),scaling(2,3,4));
 assert.deepEqual(transform(a,[1,1,1]),[7,0,6]);
});
test('3D rotations are noncommutative and independently steer hull axes',()=>{
 const yaw=rotationZ(Math.PI/2),pitch=rotationY(-Math.PI/2),roll=rotationX(Math.PI/2);
 const p=[1,0,0];
 const y=transform(yaw,p),q=transform(pitch,p),r=transform(roll,[0,1,0]);
 near(y[0],0);near(y[1],1);
 near(q[0],0);near(q[2],1);
 near(r[1],0);near(r[2],1);
 assert.notDeepEqual(multiply4(yaw,pitch),multiply4(pitch,yaw));
});
test('ship attitude follows yaw pitch roll, with no fourth spatial axis',()=>{
 const r=shipAttitude(.25,.15,-.14);
 assert.equal(r.length,16);
 const p=transform(r,[1,0,0]);
 near(Math.hypot(...p),1);
 assert.throws(()=>shipAttitude(Infinity,0,0),/INVALID_ATTITUDE/);
});
test('lookAt camera centers the origin, preserve dimensions and reject degeneracy',()=>{
 const v=lookAt([-225,0,64],[0,0,0],[0,0,1]);
 const center=transform(v,[0,0,0]);
 near(center[0],0,1e-8);near(center[1],0,1e-8);
 assert.ok(center[2]<-220);
 assert.throws(()=>lookAt([0,0,2],[0,0,0],[0,0,1]),/DEGENERATE_CAMERA/);
});
test('projection parameters reject invalid near/far and FOV',()=>{
 assert.ok(perspective(.9,16/9,1,500).every(Number.isFinite));
 for(const input of [[0,1,1,500],[.9,0,1,500],[.9,1,500,1]])
  assert.throws(()=>perspective(...input),/INVALID_PERSPECTIVE/);
});
test('browser shader and engine must remain local, no external JavaScript or unsafe HTML',()=>{
 const files=['ship-3d-webgl.mjs','ship-3d-mesh.mjs'];
 for(const file of files){
  const code=readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  for(const term of ['fetch(', 'XMLHttpRequest','WebSocket','innerHTML','eval(', 'import('])
   assert.ok(!code.includes(term),file+' contains disallowed '+term);
 }
});
test('planetarium stays physically separate from the arcade mesh geometry',()=>{
 const app=readFileSync(new URL('../public/game-4d-app.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/game-4d.html',import.meta.url),'utf8');
 assert.match(app,/planetarium\.isActive/);
 assert.match(app,/createShip3DRenderer/);
 assert.match(html,/id="ship3dScene"/);
 assert.match(html,/id="scene"/);
 assert.match(html,/Time slices: on/);
 assert.match(html,/the fourth coordinate|fourth coordinate/i);
});
