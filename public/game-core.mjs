/** ZENITH Mars Race — deterministic, offline solo arcade physics.
 * Not real orbital mechanics, network multiplayer, paid access, or prize scoring.
 * Fixed simulation step; renderer and browser inputs are deliberately separate.
 */
export const WORLD = Object.freeze({ width: 960, height: 540, dt: 1 / 60, maxTicks: 90 * 60 });
const SHIP_RADIUS = 12;
const MAX_SPEED = 7.2;
const BOOSTS = 3;
const DEFAULT_SEED = 20261112;

export function randomGenerator(seed) {
  let x = (Number(seed) >>> 0) || DEFAULT_SEED;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

export function createGame(seed = DEFAULT_SEED) {
  const random = randomGenerator(seed);
  const moon = { x: 510, y: 260, r: 32, influence: 184 };
  const goal = { x: 867, y: 269, r: 29 };
  const asteroids = [];
  for (let i = 0; i < 9; i++) {
    const radius = 11 + random() * 12;
    let x;
    let y;
    for (let attempt = 0; attempt < 40; attempt++) {
      x = 235 + random() * 540;
      y = 45 + random() * 450;
      if (Math.hypot(x - moon.x, y - moon.y) > moon.r + radius + 38
          && Math.hypot(x - goal.x, y - goal.y) > goal.r + radius + 42) break;
    }
    asteroids.push({
      x, y, r: radius,
      vx: (random() * 2 - 1) * 1.05,
      vy: (random() * 2 - 1) * 1.05,
    });
  }
  return {
    seed: Number(seed) >>> 0,
    status: "ready",
    ticks: 0,
    score: 0,
    boosts: BOOSTS,
    message: "Navigate from Earth to Mars. Avoid debris and the Moon.",
    ship: { x: 94, y: 269, vx: 0, vy: 0, r: SHIP_RADIUS },
    moon, goal, asteroids,
  };
}

export function startGame(game) {
  if (game.status !== "ready") return false;
  game.status = "running";
  game.message = "Engines online. Navigate to Mars.";
  return true;
}

export function togglePause(game) {
  if (game.status === "running") {
    game.status = "paused";
    game.message = "Paused";
  } else if (game.status === "paused") {
    game.status = "running";
    game.message = "Race resumed";
  }
  return game.status;
}

export function resetGame(game) {
  return createGame(game.seed);
}

export function elapsedSeconds(game) {
  return game.ticks / 60;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function collide(a, b, extra = 0) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= a.r + b.r + extra;
}

/** Run exactly one 60 Hz step. Controls are independent of browser events. */
export function stepGame(game, controls = {}) {
  if (game.status !== "running") return game;
  if (game.ticks >= WORLD.maxTicks) {
    game.status = "timeout";
    game.message = "Time expired. Try a new route.";
    return game;
  }
  const s = game.ship;
  const directionX = Number(Boolean(controls.right)) - Number(Boolean(controls.left));
  const directionY = Number(Boolean(controls.down)) - Number(Boolean(controls.up));
  const magnitude = Math.hypot(directionX, directionY);
  const ux = magnitude ? directionX / magnitude : 0;
  const uy = magnitude ? directionY / magnitude : 0;
  s.vx += ux * 0.34;
  s.vy += uy * 0.34;

  if (controls.boost && game.boosts > 0) {
    const speed = Math.hypot(s.vx, s.vy);
    const bx = magnitude ? ux : speed > 0.05 ? s.vx / speed : 1;
    const by = magnitude ? uy : speed > 0.05 ? s.vy / speed : 0;
    s.vx += bx * 3.25;
    s.vy += by * 3.25;
    game.boosts -= 1;
  }

  const dx = game.moon.x - s.x;
  const dy = game.moon.y - s.y;
  const dist = Math.hypot(dx, dy);
  if (dist < game.moon.influence && dist > 0.001) {
    const gravity = Math.min(0.38, 3600 / (dist * dist + 2500));
    s.vx += gravity * dx / dist;
    s.vy += gravity * dy / dist;
  }

  s.vx *= 0.992;
  s.vy *= 0.992;
  const speed = Math.hypot(s.vx, s.vy);
  if (speed > MAX_SPEED) {
    s.vx = s.vx / speed * MAX_SPEED;
    s.vy = s.vy / speed * MAX_SPEED;
  }
  s.x += s.vx;
  s.y += s.vy;
  if (s.x < s.r || s.x > WORLD.width - s.r) {
    s.x = clamp(s.x, s.r, WORLD.width - s.r);
    s.vx *= -0.25;
  }
  if (s.y < s.r || s.y > WORLD.height - s.r) {
    s.y = clamp(s.y, s.r, WORLD.height - s.r);
    s.vy *= -0.25;
  }

  for (const a of game.asteroids) {
    a.x += a.vx;
    a.y += a.vy;
    if (a.x - a.r < 0 || a.x + a.r > WORLD.width) {
      a.vx = -a.vx;
      a.x = clamp(a.x, a.r, WORLD.width - a.r);
    }
    if (a.y - a.r < 0 || a.y + a.r > WORLD.height) {
      a.vy = -a.vy;
      a.y = clamp(a.y, a.r, WORLD.height - a.r);
    }
  }
  game.ticks += 1;

  // Collision is authoritative before scoring; one terminal transition per race.
  if (collide(s, game.moon, -3)) {
    game.status = "crashed";
    game.message = "Moon impact. Try a wider approach.";
  } else if (game.asteroids.some(a => collide(s, a))) {
    game.status = "crashed";
    game.message = "Asteroid impact. Try another route.";
  } else if (collide(s, game.goal, -6)) {
    game.status = "won";
    game.score = Math.max(100, Math.round(1800 - elapsedSeconds(game) * 13 + game.boosts * 120));
    game.message = "Mars reached! Solo preview score only.";
  } else if (game.ticks >= WORLD.maxTicks) {
    game.status = "timeout";
    game.message = "Time expired. Try a new route.";
  }
  return game;
}
