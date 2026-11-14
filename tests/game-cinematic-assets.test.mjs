import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SHIP_IMAGE_URI} from '../public/ship-cinematic-asset.mjs';
const source=new URL('../public/',import.meta.url);
const get=name=>readFileSync(new URL(name,source),'utf8');
test('ship visual is exact locally retained concept-derived WebP',()=>{
 const prefix='data:image/webp;base64,';
 assert.ok(SHIP_IMAGE_URI.startsWith(prefix));
 const b64=SHIP_IMAGE_URI.slice(prefix.length);
 assert.match(b64,/^[A-Za-z0-9+/]+={0,2}$/);
 const data=Buffer.from(b64,'base64');
 assert.equal(data.length,7234);
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(createHash('sha256').update(data).digest('hex'),
 'd19cfaef3de512250401ad36c647fa24c681785ab9329371a6adf9f8efb36b72');
});
test('renderer is black-space with star-only distant light, no corridor grid',()=>{
 const r=get('game-4d-cinematic-render.mjs');
 assert.match(r,/fillStyle='#000000'/);
 assert.match(r,/length:230|length:245/);
 assert.match(r,/No haze, nebula or course grid/);
 assert.ok(!r.includes('ctx.createLinearGradient'));
 assert.ok(!r.includes('course grid') || r.includes('No haze'));
 assert.match(r,/shipArt\.src=SHIP_IMAGE_URI/);
 assert.match(r,/ctx\.drawImage\(shipArt/);
 assert.match(r,/ctx\.rotate\(bank/);
 assert.match(r,/screen/);
});
test('game app keeps fixed-step physics and uses cinematic image renderer',()=>{
 const app=get('game-4d-app.mjs');
 assert.match(app,/renderCinematic\(ctx,flight\)/);
 assert.match(app,/step\(flight/);
 assert.match(app,/requestAnimationFrame\(frame\)/);
 assert.doesNotMatch(app,/shipMesh\(/);
});
test('scene does not falsely claim astronomical km or relativistic speed',()=>{
 const render=get('game-4d-cinematic-render.mjs');
 assert.match(render,/gu\/s/);
 assert.match(render,/GAME UNITS/);
 assert.doesNotMatch(render,/0\.184 c/);
 assert.match(get('game-4d.html'),/not a freely rotatable 3D model/);
});
test('no third-party networks, payments, dynamic eval or script injection',()=>{
 const all=['game-4d-cinematic-render.mjs','game-4d-app.mjs','ship-cinematic-asset.mjs'].map(get).join('\n');
 for(const str of ['fetch(', 'XMLHttpRequest','WebSocket','eval(', 'innerHTML','Stripe','buy.stripe.com'])
  assert.ok(!all.includes(str),str);
});
