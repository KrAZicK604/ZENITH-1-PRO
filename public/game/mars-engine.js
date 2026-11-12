/* ZENITH Mars Race v38: deterministic, offline, non-authoritative game simulation.
 * Pure state transitions; no payment, identity, server, or reward authority.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MarsRaceEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 360, H = 280, DT = 1 / 60, R = 6, MAX_SPEED = 190;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  function rng(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function newGame(seed = 42) {
    if (!Number.isSafeInteger(seed)) throw Error('invalid seed');
    const random = rng(seed);
    const asteroids = [];
    for (let i = 0; i < 8; i++) {
      const a = random() * Math.PI * 2;
      const radius = 4 + random() * 5;
      asteroids.push({
        x: 105 + random() * 135, y: 20 + random() * 240,
        vx: Math.cos(a) * (8 + random() * 12),
        vy: Math.sin(a) * (8 + random() * 12), r: radius
      });
    }
    return { seed, phase: 'ready', time: 0, score: 0, boosts: 3,
      ship: { x: 36, y: 140, vx: 30, vy: 0 },
      target: { x: 330, y: 140, r: 13 },
      moon: { x: 170, y: 140, r: 11 }, asteroids };
  }
  function start(state) {
    if (state.phase !== 'ready') return state;
    return { ...state, phase: 'running' };
  }
  function step(state, controls = {}, dt = DT) {
    if (state.phase !== 'running') return state;
    if (!finite(dt) || dt <= 0 || dt > 0.05) throw Error('invalid dt');
    const s = state.ship;
    const ax = (Number(Boolean(controls.right)) - Number(Boolean(controls.left))) * 145;
    const ay = (Number(Boolean(controls.down)) - Number(Boolean(controls.up))) * 145;
    const gravityDx = state.moon.x - s.x, gravityDy = state.moon.y - s.y;
    const d2 = gravityDx ** 2 + gravityDy ** 2;
    const d = Math.sqrt(d2);
    const gravity = d < 72 && d > 0.01 ? 280 / Math.max(22, d) : 0;
    const boost = Boolean(controls.boost) && state.boosts > 0;
    let vx = (s.vx + (ax + gravityDx * gravity) * dt) * Math.exp(-0.32 * dt);
    let vy = (s.vy + (ay + gravityDy * gravity) * dt) * Math.exp(-0.32 * dt);
    if (boost) {
      const m = Math.hypot(vx, vy) || 1;
      vx += (vx / m) * 52; vy += (vy / m) * 52;
    }
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) { vx *= MAX_SPEED / speed; vy *= MAX_SPEED / speed; }
    const ship = { x: clamp(s.x + vx * dt, R, W - R),
                   y: clamp(s.y + vy * dt, R, H - R), vx, vy };
    const asteroids = state.asteroids.map(a => {
      let x = a.x + a.vx * dt, y = a.y + a.vy * dt, avx = a.vx, avy = a.vy;
      if (x < a.r || x > W - a.r) { avx *= -1; x = clamp(x, a.r, W - a.r); }
      if (y < a.r || y > H - a.r) { avy *= -1; y = clamp(y, a.r, H - a.r); }
      return { ...a, x, y, vx: avx, vy: avy };
    });
    const crashed = asteroids.some(a => dist2(a, ship) < (a.r + R) ** 2)
      || dist2(ship, state.moon) < (state.moon.r + R) ** 2;
    // Crash takes precedence over reaching the target in the same frame.
    const won = !crashed && dist2(ship, state.target) < (state.target.r + R) ** 2;
    const phase = crashed ? 'crashed' : won ? 'won' : 'running';
    const boosts = state.boosts - Number(boost);
    const time = state.time + dt;
    return { ...state, ship, asteroids, boosts, time, phase,
      score: won ? Math.max(0, Math.round(1800 - time * 8 + boosts * 100)) : state.score };
  }
  return Object.freeze({ W, H, DT, R, newGame, start, step });
});
