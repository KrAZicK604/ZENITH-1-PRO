/**
 * ZENITH Mars Flight 4D laboratory — 3D arcade mechanics evolving in simulation time.
 * "4D" here means (x, y, z, t), NOT four spatial axes or general relativity.
 * Deterministic 60-Hz fixed steps, 3D rigid orientation, moving hazards and forces.
 * Pure simulation functions. No live accounts, payments, network or reward authority.
 */
export const FLIGHT = Object.freeze({
  dt: 1 / 60,
  maxTicks: 110 * 60,
  length: 1020,
  halfWidth: 170,
  halfHeight: 145,
  maxSpeed: 72,
  shipRadius: 10,
  boostCount: 3,
});
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const finite = n => typeof n === "number" && Number.isFinite(n);
const P = (x, y, z) => ({ x, y, z });
const add = (a, b) => P(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => P(a.x - b.x, a.y - b.y, a.z - b.z);
const scale = (a, k) => P(a.x * k, a.y * k, a.z * k);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = a => Math.hypot(a.x, a.y, a.z);
const unit = a => scale(a, 1 / Math.max(1e-9, norm(a)));
const cross = (a, b) => P(a.y * b.z - a.z * b.y,
  a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export function seededRandom(seed) {
  if (!Number.isSafeInteger(seed)) throw new TypeError("integer seed required");
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
/** The static course is immutable by convention; dynamics only read it. */
export function createFlight(seed = 20261112) {
  const random = seededRandom(seed);
  const rocks = [];
  for (let i = 0; i < 13; i++) {
    const r = 10 + random() * 13;
    const lane = i % 4;
    const y0 = lane < 2 ? -(40 + random() * 88) : 40 + random() * 88;
    const z0 = lane % 2 ? -(30 + random() * 82) : 30 + random() * 82;
    rocks.push({
      id: i, x0: 165 + i * 53 + random() * 21, y0, z0, r,
      ay: 9 + random() * 17, az: 8 + random() * 19,
      omega: 0.17 + random() * 0.24, phase: random() * TAU,
    });
  }
  return {
    seed: seed >>> 0,
    tick: 0,
    phase: "ready",
    score: 0,
    boosters: FLIGHT.boostCount,
    message: "Pilot in 3D through a changing spacetime course.",
    ship: {
      x: 42, y: 0, z: 0, vx: 21, vy: 0, vz: 0,
      yaw: 0, pitch: 0, roll: 0,
    },
    course: { rocks },
  };
}
export const clock = state => state.tick * FLIGHT.dt;

/** Position of 3D obstacles as a function of time: (x,y,z,t) => geometry. */
export function worldAt(course, time) {
  if (!finite(time) || time < 0) throw new RangeError("invalid time");
  return {
    moon: { x: 488 + 19 * Math.sin(0.12 * time),
      y: 49 + 65 * Math.cos(0.18 * time),
      z: 20 + 49 * Math.sin(0.14 * time), r: 34 },
    mars: { x: 948, y: 27 * Math.sin(0.065 * time),
      z: 22 * Math.cos(0.048 * time), r: 39 },
    rocks: course.rocks.map(a => ({
      id: a.id,
      x: a.x0 + 6 * Math.sin(time * a.omega * 0.6 + a.phase),
      y: a.y0 + a.ay * Math.sin(time * a.omega + a.phase),
      z: a.z0 + a.az * Math.cos(time * a.omega * 0.83 + a.phase),
      r: a.r,
    })),
  };
}
/** Time-varying illustrative gravity and weak oscillating ambient drift. */
export function accelerationAt(point, time, course) {
  const moon = worldAt(course, time).moon;
  const displacement = sub(moon, point);
  const distance2 = dot(displacement, displacement);
  const attraction = Math.min(15, 9000 / (distance2 + 550));
  const direction = unit(displacement);
  return P(direction.x * attraction,
    direction.y * attraction + 0.52 * Math.sin(0.11 * time),
    direction.z * attraction + 0.37 * Math.cos(0.09 * time));
}
export function axesOf(ship) {
  const { yaw, pitch, roll } = ship;
  const forward = P(Math.cos(pitch) * Math.cos(yaw),
    Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch));
  const side = P(-Math.sin(yaw), Math.cos(yaw), 0);
  const upward = P(-Math.sin(pitch) * Math.cos(yaw),
    -Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch));
  return {
    forward,
    right: add(scale(side, Math.cos(roll)), scale(upward, Math.sin(roll))),
    up: add(scale(upward, Math.cos(roll)), scale(side, -Math.sin(roll))),
  };
}
export function shipVertex(ship, local) {
  const frame = axesOf(ship);
  return add(P(ship.x, ship.y, ship.z), add(
    scale(frame.forward, local.x),
    add(scale(frame.right, local.y), scale(frame.up, local.z))));
}
/** Swept moving-sphere contact, avoiding high-speed through-rock tunnelling. */
export function sweptContact(shipFrom, shipTo, hazardFrom, hazardTo, radius) {
  const relative0 = sub(shipFrom, hazardFrom);
  const relativeDelta = sub(sub(shipTo, shipFrom), sub(hazardTo, hazardFrom));
  const denominator = dot(relativeDelta, relativeDelta);
  const closest = denominator < 1e-12 ? 0 :
    clamp(-dot(relative0, relativeDelta) / denominator, 0, 1);
  const separation = add(relative0, scale(relativeDelta, closest));
  return dot(separation, separation) <= radius * radius;
}
export function startFlight(state) {
  return state.phase === "ready"
    ? { ...state, phase: "running", message: "3D flight online. Avoid the moving Moon and debris." }
    : state;
}
export function pauseFlight(state) {
  if (state.phase === "running") return { ...state, phase: "paused", message: "Time frozen — paused" };
  if (state.phase === "paused") return { ...state, phase: "running", message: "3D flight resumed" };
  return state;
}
export function resetFlight(state) { return createFlight(state.seed); }
export function nextFlight(state, control = {}) {
  if (state.phase !== "running") return state;
  if (state.tick >= FLIGHT.maxTicks) return {
    ...state, phase: "timeout", message: "Mission time expired",
  };
  const dt = FLIGHT.dt;
  const old = state.ship;
  const time = clock(state);
  const yawInput = Number(Boolean(control.turnRight)) - Number(Boolean(control.turnLeft));
  const pitchInput = Number(Boolean(control.pitchUp)) - Number(Boolean(control.pitchDown));
  const rollInput = Number(Boolean(control.rollRight)) - Number(Boolean(control.rollLeft));
  const yaw = old.yaw + 1.0 * yawInput * dt;
  const pitch = clamp(old.pitch + 0.9 * pitchInput * dt, -1.16, 1.16);
  // Damp the bank toward neutral; bank changes ship attitude, not lateral gravity.
  const roll = clamp((old.roll + 1.25 * rollInput * dt + 0.20 * yawInput * dt)
    * Math.exp(-0.21 * dt), -1.3, 1.3);
  const pose = { ...old, yaw, pitch, roll };
  const forward = axesOf(pose).forward;
  const thruster = Number(Boolean(control.thrust)) * 43
    - Number(Boolean(control.brake)) * 32;
  const ambient = accelerationAt(P(old.x, old.y, old.z), time, state.course);
  const damping = Math.exp(-0.065 * dt);
  let velocity = scale(add(P(old.vx, old.vy, old.vz),
    scale(add(scale(forward, thruster), ambient), dt)), damping);
  const boost = Boolean(control.boost) && state.boosters > 0;
  if (boost) velocity = add(velocity, scale(forward, 24));
  const speed = norm(velocity);
  if (speed > FLIGHT.maxSpeed) velocity = scale(velocity, FLIGHT.maxSpeed / speed);
  const from = P(old.x, old.y, old.z);
  const candidate = add(from, scale(velocity, dt));
  const nextPosition = P(
    clamp(candidate.x, 0, FLIGHT.length),
    clamp(candidate.y, -FLIGHT.halfWidth, FLIGHT.halfWidth),
    clamp(candidate.z, -FLIGHT.halfHeight, FLIGHT.halfHeight));
  // Stop outward momentum at arena boundaries.
  if (nextPosition.x !== candidate.x) velocity.x = 0;
  if (nextPosition.y !== candidate.y) velocity.y = 0;
  if (nextPosition.z !== candidate.z) velocity.z = 0;
  const ship = { ...pose, ...nextPosition,
    vx: velocity.x, vy: velocity.y, vz: velocity.z };
  const world0 = worldAt(state.course, time);
  const world1 = worldAt(state.course, time + dt);
  const hit = sweptContact(from, nextPosition, world0.moon, world1.moon,
      FLIGHT.shipRadius + world1.moon.r)
    || world0.rocks.some((r, i) => sweptContact(from, nextPosition,
      r, world1.rocks[i], FLIGHT.shipRadius + r.r));
  // Crash takes precedence over success if both happen within one fixed step.
  const reached = !hit && sweptContact(from, nextPosition,
    world0.mars, world1.mars, FLIGHT.shipRadius + world1.mars.r);
  const tick = state.tick + 1;
  const phase = hit ? "crashed" : reached ? "won" :
    tick >= FLIGHT.maxTicks ? "timeout" : "running";
  const score = reached ? Math.max(100, Math.round(
    2600 - tick * dt * 13 + (state.boosters - Number(boost)) * 160)) : state.score;
  return {
    ...state, ship, tick, boosters: state.boosters - Number(boost),
    phase, score, message: hit ? "Hull collision — mission ended" :
      reached ? "Mars reached! Practice score (not verified)" :
      phase === "timeout" ? "Mission time expired" : state.message,
  };
}
/** Camera basis and perspective for true 3D coordinates projected into 2D. */
export function makeCamera(ship) {
  const position = P(ship.x - 168, ship.y, ship.z + 69);
  const target = P(ship.x + 205, ship.y, ship.z + 8);
  const forward = unit(sub(target, position));
  const right = unit(cross(P(0, 0, 1), forward));
  const up = unit(cross(forward, right));
  return { position, forward, right, up };
}
export function project3D(point, camera, width = 960, height = 540) {
  const relative = sub(point, camera.position);
  const depth = dot(relative, camera.forward);
  if (!finite(depth) || depth < 4) return null;
  const focal = 0.94 * height;
  const x = width * 0.5 + dot(relative, camera.right) * focal / depth;
  const y = height * 0.5 - dot(relative, camera.up) * focal / depth;
  if (![x, y].every(finite)) return null;
  return { x, y, depth, pixelsPerUnit: focal / depth };
}
