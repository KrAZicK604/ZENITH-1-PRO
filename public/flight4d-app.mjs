/**
 * ZENITH Mars Race 4D visual prototype.
 * Three spatial coordinates plus simulation time, perspective-rendered 3D
 * meshes and a fixed-step physics clock. Offline solo: no money or online rank.
 */
import {
  FLIGHT, createFlight, startFlight, pauseFlight, resetFlight, nextFlight,
  worldAt, makeCamera, project3D, shipVertex, clock, seededRandom,
} from "./flight4d-core.mjs";

const canvas = document.querySelector("#flightCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const $ = id => document.getElementById(id);
const ui = {
  phase: $("phase"), clock: $("clock"), speed: $("speed"), boost: $("boosts"),
  distance: $("distance"), attitude: $("attitude"), status: $("missionStatus"),
  start: $("start"), pause: $("pause"), restart: $("restart"),
  depth: $("depth"), lateral: $("lateral"),
};
const W = canvas.width, H = canvas.height;
const inputs = {
  thrust: false, brake: false, turnLeft: false, turnRight: false,
  pitchUp: false, pitchDown: false, rollLeft: false, rollRight: false,
};
const mapCode = {
  KeyW: "thrust", Space: "thrust", KeyS: "brake",
  KeyA: "turnLeft", KeyD: "turnRight",
  ArrowLeft: "turnLeft", ArrowRight: "turnRight",
  ArrowUp: "pitchUp", ArrowDown: "pitchDown",
  KeyQ: "rollLeft", KeyE: "rollRight",
};
let flight = createFlight();
let boostQueued = false;
let accumulator = 0;
let previousFrame = null;
let lastPhase = flight.phase;
let framePaintCount = 0;
let bestScore = 0;
const storageKey = "zenith_4d_solo_preview_best_v1";
try {
  const value = Number(localStorage.getItem(storageKey));
  if (Number.isSafeInteger(value) && value >= 0 && value <= 100000) bestScore = value;
} catch { /* Browser storage is optional. */ }

function clearInput() {
  for (const key of Object.keys(inputs)) inputs[key] = false;
  boostQueued = false;
  document.querySelectorAll("[data-action].held").forEach(b => b.classList.remove("held"));
}
function begin() {
  if (flight.phase === "ready") flight = startFlight(flight);
  previousFrame = null;
  sync();
  canvas.focus({ preventScroll: true });
}
function restart() {
  flight = startFlight(resetFlight(flight));
  accumulator = 0;
  clearInput();
  previousFrame = null;
  sync();
  canvas.focus({ preventScroll: true });
}
function pause() {
  clearInput();
  flight = pauseFlight(flight);
  accumulator = 0;
  previousFrame = null;
  sync();
  canvas.focus({ preventScroll: true });
}
function boost() {
  if (flight.phase === "running") boostQueued = true;
}
const fit = (number, lo, hi) => Math.max(lo, Math.min(hi, number));
const seeded = seededRandom(87813);
const stars = Array.from({ length: 260 }, () => ({
  x: seeded() * 1500 - 180, y: (seeded() - 0.5) * 1800,
  z: (seeded() - 0.5) * 1050, r: 0.45 + seeded() * 1.25,
}));
function line3d(a, b, camera, color, width = 1) {
  const one = project3D(a, camera, W, H);
  const two = project3D(b, camera, W, H);
  if (!one || !two) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(one.x, one.y);
  ctx.lineTo(two.x, two.y);
  ctx.stroke();
}
function circle3d(point, radius, camera, c1, c2, rim, label) {
  const projected = project3D(point, camera, W, H);
  if (!projected) return false;
  const radiusPixels = Math.max(0.1, radius * projected.pixelsPerUnit);
  if (radiusPixels < 0.2 || radiusPixels > 8000) return false;
  if (projected.x + radiusPixels < -90 || projected.x - radiusPixels > W + 90 ||
      projected.y + radiusPixels < -90 || projected.y - radiusPixels > H + 90) return false;
  ctx.save();
  const radiusForGradient = Math.max(1, radiusPixels);
  const grad = ctx.createRadialGradient(
    projected.x - radiusPixels * 0.35, projected.y - radiusPixels * 0.4,
    Math.max(0.1, radiusPixels * 0.08),
    projected.x, projected.y, radiusForGradient);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.58, c2);
  grad.addColorStop(1, rim);
  ctx.fillStyle = grad;
  ctx.shadowColor = c1;
  ctx.shadowBlur = Math.min(34, radiusPixels * 0.48);
  ctx.beginPath();ctx.arc(projected.x, projected.y, radiusPixels, 0, Math.PI * 2);ctx.fill();
  ctx.restore();
  if (label && radiusPixels > 7) {
    ctx.fillStyle = "#b9d9eb";
    ctx.textAlign = "center";
    ctx.font = "bold 13px system-ui";
    ctx.fillText(label, projected.x, projected.y + Math.max(14, radiusPixels + 16));
  }
  return true;
}
const SHIP_VERTICES = {
  nose: { x: 31, y: 0, z: 0 },
  left: { x: -12, y: -23, z: -3 },
  right: { x: -12, y: 23, z: -3 },
  spine: { x: -10, y: 0, z: 13 },
  keel: { x: -12, y: 0, z: -7 },
  tail: { x: -27, y: 0, z: 0 },
  motorL: { x: -21, y: -8, z: -2 },
  motorR: { x: -21, y: 8, z: -2 },
};
const FACES = [
  [["nose", "spine", "left"], "#8eeef9"],
  [["nose", "right", "spine"], "#a9d2e5"],
  [["nose", "left", "keel"], "#28738f"],
  [["nose", "keel", "right"], "#31739a"],
  [["spine", "tail", "left"], "#3689ab"],
  [["spine", "right", "tail"], "#4b94ac"],
  [["left", "tail", "keel"], "#21516a"],
  [["keel", "tail", "right"], "#244c66"],
];
function drawShip(camera) {
  const points = {};
  for (const [name, local] of Object.entries(SHIP_VERTICES)) {
    points[name] = project3D(shipVertex(flight.ship, local), camera, W, H);
  }
  const faces = FACES.map(([names, fill]) => {
    const projected = names.map(name => points[name]);
    return { projected, fill,
      depth: projected.some(p => p === null) ? -1 :
        projected.reduce((n, p) => n + p.depth, 0) / 3 };
  }).filter(f => f.depth >= 4).sort((a, b) => b.depth - a.depth);
  for (const face of faces) {
    ctx.beginPath();
    ctx.moveTo(face.projected[0].x, face.projected[0].y);
    for (let i = 1; i < face.projected.length; i++) {
      ctx.lineTo(face.projected[i].x, face.projected[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.strokeStyle = "rgba(187,253,255,.7)";
    ctx.lineWidth = 1.4;
    ctx.fill();ctx.stroke();
  }
  for (const motor of ["motorL", "motorR"]) {
    const p = points[motor];
    if (p) {
      const radius = fit(p.pixelsPerUnit * 3, 2, 12);
      ctx.save();ctx.shadowColor = "#f8b66f";ctx.shadowBlur = 13;
      ctx.fillStyle = flight.phase === "running" && (inputs.thrust || inputs.brake)
        ? "#ffd08e" : "#4eaabd";
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
}
function render() {
  framePaintCount += 1;
  const camera = makeCamera(flight.ship);
  const time = clock(flight);
  const universe = worldAt(flight.course, time);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#06111f");bg.addColorStop(0.55, "#0c1530");
  bg.addColorStop(1, "#1b1327");
  ctx.fillStyle = bg;ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    const p = project3D(star, camera, W, H);
    if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
    ctx.globalAlpha = fit(0.22 + p.depth / 1800, 0.22, 0.83);
    ctx.fillStyle = "#dbebff";
    ctx.fillRect(p.x, p.y, star.r, star.r);
  }
  ctx.globalAlpha = 1;

  // 3D navigation corridor: actual points in world space, not 2D decoration.
  for (let x = 110; x < 1030; x += 90) {
    for (const [y, z] of [
      [-110, -78], [110, -78], [-110, 78], [110, 78],
    ]) {
      line3d({x, y, z}, {x: x + 90, y, z}, camera,
        "rgba(84,193,210,.18)", 1.1);
    }
    for (const z of [-78, 78]) {
      line3d({x, y:-110, z}, {x, y:110, z},
        camera, "rgba(73,177,211,.15)");
    }
  }
  // Crosshair and movement axis to make vertical/lateral depth unambiguous.
  ctx.save();
  ctx.strokeStyle = "rgba(134,241,247,.33)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W*0.5 - 10, H*0.42);ctx.lineTo(W*0.5 + 10,H*0.42);
  ctx.moveTo(W*0.5, H*0.42 - 10);ctx.lineTo(W*0.5,H*0.42 + 10);
  ctx.stroke();ctx.restore();

  const spheres = [
    {object: universe.moon, colors:["#f2eff0","#8f9cac","#25394b"],label:"ORBITING MOON"},
    {object: universe.mars, colors:["#ffd5ac","#d75c46","#682d38"],label:"MARS DESTINATION"},
    ...universe.rocks.map(a => ({
      object:a, colors:["#c6bec1","#788698","#273144"],label:""
    })),
  ];
  // Painter's algorithm: far bodies first, nearer bodies last.
  spheres.sort((a, b) => {
    const pa = project3D(a.object, camera, W, H);
    const pb = project3D(b.object, camera, W, H);
    return (pb ? pb.depth : -Infinity) - (pa ? pa.depth : -Infinity);
  });
  for (const item of spheres) circle3d(item.object, item.object.r, camera,
    ...item.colors, item.label);
  drawShip(camera);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(214,239,255,.82)";
  ctx.font = "12px ui-monospace,monospace";
  ctx.fillText("SPACETIME FIELD   x / y / z / t", 16, 24);
  ctx.fillText("FORWARD +X   RIGHT +Y   UP +Z", 16, 43);

  if (flight.phase !== "running") {
    ctx.fillStyle = "rgba(4,10,22,.55)";ctx.fillRect(0, 0, W, H);
    const title = {
      ready: "4D FLIGHT LAB", paused: "TIME PAUSED",
      won: "MARS REACHED", crashed: "HULL COLLISION",
      timeout: "MISSION TIME EXPIRED",
    }[flight.phase];
    ctx.textAlign = "center";
    ctx.font = "800 43px system-ui";
    ctx.fillStyle = "#e4f9ff";
    ctx.fillText(title, W/2, H/2 - 16);
    ctx.font = "17px system-ui";
    ctx.fillStyle = "#a9d4e4";
    ctx.fillText(flight.phase === "ready"
      ? "Thrust into a moving 3D universe. Time is the fourth coordinate."
      : flight.message, W/2, H/2 + 20);
  }
}
function sync() {
  const s = flight.ship;
  ui.phase.textContent = flight.phase.toUpperCase();
  ui.phase.dataset.state = flight.phase;
  ui.clock.textContent = clock(flight).toFixed(2) + " s";
  ui.speed.textContent = Math.hypot(s.vx,s.vy,s.vz).toFixed(1);
  ui.boost.textContent = String(flight.boosters);
  ui.distance.textContent = s.x.toFixed(1);
  ui.lateral.textContent = s.y.toFixed(1);
  ui.depth.textContent = s.z.toFixed(1);
  ui.attitude.textContent = [s.yaw,s.pitch,s.roll].map(v =>
    (v*180/Math.PI).toFixed(0) + "°").join(" / ");
  ui.start.disabled = !["ready","crashed","won","timeout"].includes(flight.phase);
  ui.start.textContent = flight.phase === "ready" ? "Start 4D Flight" : "New mission";
  ui.pause.disabled = !["running","paused"].includes(flight.phase);
  ui.pause.textContent = flight.phase === "paused" ? "Resume Time" : "Pause Time";
  if (lastPhase !== flight.phase) {
    ui.status.textContent = flight.message;
    lastPhase = flight.phase;
    if (flight.phase === "won" && flight.score > bestScore) {
      bestScore = flight.score;
      try { localStorage.setItem(storageKey,String(bestScore)); } catch {}
    }
  }
  $("best").textContent = String(bestScore);
  $("score").textContent = String(flight.score);
}
document.addEventListener("keydown", event => {
  if (event.target.closest?.("input,textarea,select,button,a")) return;
  if (mapCode[event.code]) {
    inputs[mapCode[event.code]] = true;
    event.preventDefault();
  } else if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat) {
    boost();event.preventDefault();
  } else if (event.code === "KeyP" && !event.repeat) {
    pause();event.preventDefault();
  } else if (event.code === "Enter" && !event.repeat && flight.phase === "ready") {
    begin();event.preventDefault();
  } else if (event.code === "KeyR" && !event.repeat) {
    restart();event.preventDefault();
  }
});
document.addEventListener("keyup", event => {
  if (mapCode[event.code]) inputs[mapCode[event.code]] = false;
});
for (const button of document.querySelectorAll("[data-action]")) {
  const name = button.dataset.action;
  button.addEventListener("pointerdown", event => {
    if (flight.phase !== "running") return;
    event.preventDefault();
    if (name === "boost") boost();
    else if (Object.hasOwn(inputs,name)) inputs[name] = true;
    button.classList.add("held");
    try { button.setPointerCapture(event.pointerId); } catch {}
  });
  for (const eventName of ["pointerup","pointercancel","lostpointercapture"]) {
    button.addEventListener(eventName, () => {
      if (Object.hasOwn(inputs,name)) inputs[name] = false;
      button.classList.remove("held");
    });
  }
}
ui.start.addEventListener("click", () => {
  if (flight.phase === "ready") begin();
  else restart();
});
ui.pause.addEventListener("click", pause);
ui.restart.addEventListener("click", restart);
function suspendOnBlur() {
  clearInput();
  if (flight.phase === "running") {
    flight = pauseFlight(flight);
    accumulator = 0;
    previousFrame = null;
    sync();
  }
}
window.addEventListener("blur", suspendOnBlur);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspendOnBlur();
});
function frame(timestamp) {
  if (previousFrame === null) previousFrame = timestamp;
  const delta = fit((timestamp - previousFrame) / 1000, 0, 0.1);
  previousFrame = timestamp;
  if (flight.phase === "running") {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= FLIGHT.dt && steps < 6 && flight.phase === "running") {
      flight = nextFlight(flight, { ...inputs, boost: boostQueued });
      boostQueued = false;
      accumulator -= FLIGHT.dt;
      steps++;
    }
    if (steps === 6) accumulator = 0; // Drop excess lag; do not spiral.
  } else accumulator = 0;
  render();
  sync();
  requestAnimationFrame(frame);
}
render();sync();requestAnimationFrame(frame);
if (new URLSearchParams(location.search).get("test") === "1") {
  window.__zenith4dTest = Object.freeze({
    snapshot: () => ({
      phase:flight.phase,tick:flight.tick,t:clock(flight),
      ship:{...flight.ship},boosters:flight.boosters,score:flight.score,
      paintFrames:framePaintCount,
      moon:worldAt(flight.course,clock(flight)).moon,
    }),
    restart,
  });
}
