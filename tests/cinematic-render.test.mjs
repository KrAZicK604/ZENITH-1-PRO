import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CINEMATIC_SHIP,SHIP_PALETTE,drawCinematicShip} from '../public/cinematic-ship.mjs';
test('spacecraft has detailed finite 3D mesh and bounded indices',()=>{
 assert.ok(CINEMATIC_SHIP.vertices.length>=80);
 assert.ok(CINEMATIC_SHIP.faces.length>=100);
 for(const p of CINEMATIC_SHIP.vertices){assert.equal(p.length,3);assert.ok(p.every(Number.isFinite));}
 for(const f of CINEMATIC_SHIP.faces){
  assert.equal(f.indices.length,3);
  assert.ok(f.indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<CINEMATIC_SHIP.vertices.length));
  assert.ok(SHIP_PALETTE[f.material]);
 }
});
test('mesh is bilateral with distinct nose, canopy, wings and twin nozzles',()=>{
 const pts=CINEMATIC_SHIP.vertices;
 assert.ok(pts.some(p=>p[0]>60));assert.ok(pts.some(p=>p[1]>70));
 assert.ok(pts.some(p=>p[1]<-70));assert.ok(pts.some(p=>p[2]>30));
 assert.ok(CINEMATIC_SHIP.faces.some(f=>f.material==='glass'));
 assert.ok(CINEMATIC_SHIP.faces.some(f=>f.material==='nozzle'));
});
test('renderers use true black and shared detailed ship, no colored background or corridor',()=>{
 const free=readFileSync(new URL('../public/free-roam-render.mjs',import.meta.url),'utf8');
 const four=readFileSync(new URL('../public/game-4d-app.mjs',import.meta.url),'utf8');
 for(const src of [free,four]){
  assert.match(src,/drawCinematicShip/);
  assert.match(src,/fillRect\(0,0,w,h\)/);
  assert.doesNotMatch(src,/createLinearGradient\(0,0/);
  assert.doesNotMatch(src,/corridor reference|nebula/);
 }
});
test('draw function projects detailed model and draws without external image dependency',()=>{
 const ops=[];
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){ops.push('fill');},stroke(){},ellipse(){},
  set fillStyle(x){},set strokeStyle(x){},set lineWidth(x){},set shadowColor(x){},set shadowBlur(x){}};
 drawCinematicShip(ctx,{throttle:0,burning:false},([x,y,z])=>({x:x+480,y:y+270,depth:300,k:2}));
 assert.ok(ops.length>=100);
});
test('no third-party models or network fetches are introduced',()=>{
 const s=readFileSync(new URL('../public/cinematic-ship.mjs',import.meta.url),'utf8');
 for(const forbidden of ['fetch(', 'XMLHttpRequest','WebSocket','eval(', 'innerHTML','http://','https://'])
  assert.ok(!s.includes(forbidden),forbidden);
});
