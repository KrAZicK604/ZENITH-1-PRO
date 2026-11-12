import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createGame, startGame, togglePause, resetGame, stepGame, elapsedSeconds, randomGenerator, WORLD } from "../public/game-core.mjs";

const withoutObstacles = seed => {
  const g = createGame(seed);
  g.asteroids = [];
  g.moon.x = -9999;
  g.moon.y = -9999;
  g.goal.x = 850;
  g.goal.y = 270;
  return g;
};

test("same seed generates identical asteroids and different seeds vary", () => {
  const first = createGame(1234), repeated = createGame(1234), other = createGame(5678);
  assert.deepEqual(first.asteroids, repeated.asteroids);
  assert.notDeepEqual(first.asteroids, other.asteroids);
  assert.equal(first.asteroids.length, 9);
  assert.equal(first.status, "ready");
  assert.equal(first.boosts, 3);
});

test("random generator yields bounded reproducible values", () => {
  const a = randomGenerator(91), b = randomGenerator(91);
  for (let n = 0; n < 1000; n++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("physics cannot advance before explicit start", () => {
  const g = createGame();
  const before = structuredClone(g);
  stepGame(g, { right: true, boost: true });
  assert.deepEqual(g, before);
});

test("start transition is single-use until game resets", () => {
  const g = createGame(44);
  assert.equal(startGame(g), true);
  assert.equal(startGame(g), false);
  assert.equal(g.status, "running");
});

test("fixed 60Hz steps are deterministic for identical inputs", () => {
  const a = withoutObstacles(9), b = withoutObstacles(9);
  startGame(a); startGame(b);
  for (let i = 0; i < 40; i++) {
    const command = { right: i < 19, up: i > 25, boost: i === 17 };
    stepGame(a, command); stepGame(b, command);
  }
  assert.deepEqual(a, b);
  assert.equal(a.ticks, 40);
  assert.equal(elapsedSeconds(a), 40/60);
});

test("diagonal thrust normalized compared to cardinal thrust", () => {
  const cardinal = withoutObstacles(99);
  const diagonal = withoutObstacles(99);
  startGame(cardinal); startGame(diagonal);
  stepGame(cardinal, { right: true });
  stepGame(diagonal, { right: true, down: true });
  const single = Math.hypot(cardinal.ship.vx, cardinal.ship.vy);
  const double = Math.hypot(diagonal.ship.vx, diagonal.ship.vy);
  assert.ok(Math.abs(single-double)<1e-10);
});

test("boosts are limited to three and cannot become negative", () => {
  const g = withoutObstacles(12);
  startGame(g);
  for (let i=0;i<9;i++) stepGame(g, { boost:true });
  assert.equal(g.boosts, 0);
  assert.ok(Number.isFinite(g.ship.vx));
});

test("velocity and ship boundaries remain bounded under continuous thrust", () => {
  const g = withoutObstacles(23);
  g.goal.x = -10000; g.goal.y = -10000;
  startGame(g);
  for (let i=0;i<1500;i++) {
    stepGame(g, { right: i<750, left: i>=750, up: i%3===0 });
    assert.ok(g.ship.x>=g.ship.r && g.ship.x<=WORLD.width-g.ship.r);
    assert.ok(g.ship.y>=g.ship.r && g.ship.y<=WORLD.height-g.ship.r);
    assert.ok(Math.hypot(g.ship.vx,g.ship.vy)<=7.20000001);
  }
});

test("pause and resume do not advance simulation during pause", () => {
  const g = withoutObstacles(19);
  startGame(g);
  stepGame(g,{right:true});
  const before = structuredClone(g);
  assert.equal(togglePause(g),"paused");
  for (let i=0;i<30;i++) stepGame(g,{right:true,boost:true});
  assert.equal(g.ticks,before.ticks);
  assert.deepEqual(g.ship,before.ship);
  assert.equal(g.boosts,before.boosts);
  assert.equal(togglePause(g),"running");
  stepGame(g, {right:true});
  assert.equal(g.ticks,before.ticks+1);
});

test("asteroid impact transitions only once", () => {
  const g = withoutObstacles(20);
  g.asteroids=[{x:g.ship.x,y:g.ship.y,r:22,vx:0,vy:0}];
  startGame(g);
  stepGame(g);
  assert.equal(g.status,"crashed");
  const t=g.ticks;
  stepGame(g,{right:true,boost:true});
  assert.equal(g.ticks,t);
  assert.equal(g.score,0);
  assert.equal(g.boosts,3);
});

test("Moon collision is terminal", () => {
  const g = withoutObstacles(21);
  g.moon={x:g.ship.x,y:g.ship.y,r:32,influence:184};
  startGame(g); stepGame(g);
  assert.equal(g.status,"crashed");
});

test("win is score-only when reaching Mars, terminal after first win", () => {
  const g = withoutObstacles(21);
  g.ship.x=g.goal.x;g.ship.y=g.goal.y;
  startGame(g);
  stepGame(g);
  assert.equal(g.status,"won");
  assert.ok(g.score>=100 && g.score<=2160);
  const score=g.score,ticks=g.ticks;
  for(let i=0;i<4;i++)stepGame(g,{boost:true});
  assert.equal(g.score,score);
  assert.equal(g.ticks,ticks);
});

test("collision wins over goal when overlapping", () => {
  const g = withoutObstacles(21);
  g.ship.x=g.goal.x;g.ship.y=g.goal.y;
  g.asteroids=[{x:g.goal.x,y:g.goal.y,r:14,vx:0,vy:0}];
  startGame(g);stepGame(g);
  assert.equal(g.status,"crashed");
  assert.equal(g.score,0);
});

test("timed-out game cannot keep moving", () => {
  const g=withoutObstacles(13);
  g.goal.x=-10000;g.goal.y=-10000;
  startGame(g);
  g.ticks=WORLD.maxTicks-1;
  stepGame(g);
  assert.equal(g.status,"timeout");
  const old=structuredClone(g);
  stepGame(g,{right:true,boost:true});
  assert.deepEqual(g,old);
});

test("restart restores a fresh deterministic race without residual inputs", () => {
  const g=createGame(4567);
  startGame(g);
  stepGame(g,{right:true,boost:true});
  const newer=resetGame(g);
  assert.deepEqual(newer,createGame(4567));
  assert.equal(newer.status,"ready");
  assert.equal(newer.ticks,0);
  assert.equal(newer.boosts,3);
});

test("static public preview is reachable and cannot assert paid or online authority", () => {
  const page=readFileSync(new URL("../public/game.html", import.meta.url),"utf8");
  const landing=readFileSync(new URL("../public/index.html", import.meta.url),"utf8");
  const cfg=JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url),"utf8"));
  assert.match(page,/<canvas id="raceCanvas"/);
  assert.match(page,/<script type="module" src="\.\/game-app\.mjs"><\/script>/);
  assert.match(landing,/href="\.\/game\.html"/);
  assert.match(page,/No payment required/i);
  assert.match(page,/No server leaderboard/i);
  assert.ok(!page.includes("buy.stripe.com"));
  assert.ok(!page.includes("peerjs"));
  const headers=cfg.headers.find(h=>h.source==="/(.*)").headers;
  const csp=headers.find(h=>h.key==="Content-Security-Policy").value;
  assert.match(csp,/script-src 'self'/);
  assert.match(csp,/connect-src 'none'/);
  assert.match(csp,/object-src 'none'/);
  assert.doesNotMatch(csp,/script-src[^;]*'unsafe-inline'/);
});
