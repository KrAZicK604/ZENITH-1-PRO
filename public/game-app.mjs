import { WORLD, createGame, startGame, resetGame, togglePause, stepGame, elapsedSeconds, randomGenerator } from "./game-core.mjs";

const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const $ = id => document.getElementById(id);
const ui = {
  status: $("raceStatus"), time: $("raceTime"), speed: $("raceSpeed"),
  fuel: $("raceFuel"), score: $("raceScore"), best: $("bestScore"),
  progress: $("raceProgress"), message: $("raceMessage"),
  start: $("startRace"), pause: $("pauseRace"), restart: $("restartRace"),
};
let game = createGame();
const keys = { up: false, down: false, left: false, right: false };
let queuedBoost = false;
let lastTime = null;
let accumulator = 0;
let lastStatus = "";
const storageKey = "zenith_mars_solo_preview_best_v1";
let best = 0;
try {
  const saved = Number(localStorage.getItem(storageKey));
  if (Number.isSafeInteger(saved) && saved >= 0 && saved <= 100000) best = saved;
} catch { /* local storage disabled: game still works */ }

const rnd = randomGenerator(42021);
const stars = Array.from({ length: 145 }, () => ({
  x: rnd() * WORLD.width, y: rnd() * WORLD.height,
  r: 0.45 + rnd() * 1.7, alpha: 0.2 + rnd() * 0.7,
}));

function resetInputs() {
  for (const key of Object.keys(keys)) keys[key] = false;
  queuedBoost = false;
  document.querySelectorAll("[data-control].held").forEach(el => el.classList.remove("held"));
}

function beginNew() {
  game = resetGame(game);
  resetInputs();
  accumulator = 0;
  startGame(game);
  synchronize();
}

function colorCircle(x, y, r, fill, glow = 0) {
  ctx.save();
  if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = fill; }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill(); ctx.restore();
}

function paint() {
  const { width: W, height: H } = WORLD;
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#071323");
  gradient.addColorStop(0.6, "#0c1830");
  gradient.addColorStop(1, "#1a1229");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    colorCircle(star.x, star.y, star.r, "#c4dfff");
  }
  ctx.globalAlpha = 1;

  // Visual guidance is a game feature, not physical orbital prediction.
  ctx.strokeStyle = "rgba(138,196,221,.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 13]);
  ctx.beginPath();
  ctx.moveTo(80, 269);
  ctx.bezierCurveTo(310, 150, 605, 386, 867, 269);
  ctx.stroke();
  ctx.setLineDash([]);

  // Departure planet, moon's stylized gravity range, and goal.
  colorCircle(54, 269, 29, "#267dcc", 18);
  colorCircle(49, 259, 9, "#48d3a6");
  colorCircle(59, 276, 7, "#48d3a6");
  ctx.strokeStyle = "rgba(90,208,228,.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(game.moon.x, game.moon.y, game.moon.influence, 0, Math.PI * 2);
  ctx.stroke();
  colorCircle(game.moon.x, game.moon.y, game.moon.r, "#9aa9b7", 9);
  colorCircle(game.moon.x - 9, game.moon.y - 7, 7, "#6f8195");
  colorCircle(game.moon.x + 12, game.moon.y + 8, 5, "#788b9d");
  colorCircle(game.goal.x, game.goal.y, game.goal.r + 8, "rgba(251,113,65,.15)", 14);
  colorCircle(game.goal.x, game.goal.y, game.goal.r, "#e86141", 14);
  colorCircle(game.goal.x - 8, game.goal.y - 7, 9, "#bf452c");

  ctx.font = "bold 16px system-ui";
  ctx.textAlign = "center";
  ctx.fillStyle = "#b9d5e9";
  ctx.fillText("EARTH", 57, 322);
  ctx.fillText("MOON", game.moon.x, game.moon.y + 52);
  ctx.fillText("MARS", game.goal.x, game.goal.y + 56);

  for (const [index, rock] of game.asteroids.entries()) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(index * 0.77);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      const radius = rock.r * (i % 2 === 0 ? 0.95 : 1.08);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#8f95ab";
    ctx.strokeStyle = "#c2cbdb";
    ctx.lineWidth = 1.8;
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const ship = game.ship;
  const heading = Math.hypot(ship.vx, ship.vy) > 0.3 ? Math.atan2(ship.vy, ship.vx) : 0;
  ctx.save();
  ctx.translate(ship.x, ship.y); ctx.rotate(heading);
  ctx.shadowColor = "#6ae4ff"; ctx.shadowBlur = 19;
  ctx.fillStyle = "#8cecff"; ctx.strokeStyle = "#edffff"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(-11, -10); ctx.lineTo(-7, 0); ctx.lineTo(-11, 10);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (game.status === "running" && Math.hypot(ship.vx, ship.vy) > 0.3) {
    ctx.shadowColor = "#fbd17f"; ctx.fillStyle = "#fbd17f";
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-20, 0);
    ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (game.status !== "running") {
    ctx.fillStyle = "rgba(4,12,26,.58)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#edffff";
    ctx.font = "bold 31px system-ui";
    const headingText = {
      ready: "READY FOR LAUNCH", paused: "PAUSED",
      won: "MARS REACHED!", crashed: "SHIP LOST",
      timeout: "TIME EXPIRED",
    }[game.status];
    ctx.fillText(headingText || "MARS RACE", W / 2, H / 2 - 12);
    ctx.font = "18px system-ui";
    ctx.fillStyle = "#bdd7ed";
    ctx.fillText(game.message, W / 2, H / 2 + 25);
  }
}

function synchronize() {
  ui.status.textContent = game.status.toUpperCase();
  ui.status.dataset.state = game.status;
  ui.time.textContent = Math.max(0, 90 - elapsedSeconds(game)).toFixed(1) + " s";
  ui.speed.textContent = Math.hypot(game.ship.vx, game.ship.vy).toFixed(1);
  ui.fuel.textContent = String(game.boosts);
  ui.score.textContent = String(game.score);
  ui.best.textContent = String(best);
  const pct = Math.max(0, Math.min(100,
    (game.ship.x - 94) / (game.goal.x - 94) * 100));
  ui.progress.value = pct;
  ui.progress.setAttribute("aria-valuenow", String(Math.round(pct)));
  ui.start.textContent = game.status === "ready" ? "Start race" : "New race";
  ui.start.disabled = game.status === "running" || game.status === "paused";
  ui.pause.disabled = !["running", "paused"].includes(game.status);
  ui.pause.textContent = game.status === "paused" ? "Resume" : "Pause";
  if (game.status !== lastStatus) {
    ui.message.textContent = game.message;
    lastStatus = game.status;
    if (game.status === "won" && game.score > best) {
      best = game.score;
      try { localStorage.setItem(storageKey, String(best)); } catch { /* optional */ }
      ui.best.textContent = String(best);
    }
  }
}

const mapping = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
};
document.addEventListener("keydown", event => {
  if (event.target.closest?.("input,textarea,select,button,a")) return;
  if (mapping[event.code]) {
    event.preventDefault();
    keys[mapping[event.code]] = true;
  } else if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat && game.status === "running") queuedBoost = true;
  } else if (event.code === "KeyP" && !event.repeat) {
    event.preventDefault();
    resetInputs(); togglePause(game); synchronize();
  } else if (event.code === "Enter" && !event.repeat && game.status === "ready") {
    startGame(game); synchronize();
  }
});
document.addEventListener("keyup", event => {
  if (mapping[event.code]) keys[mapping[event.code]] = false;
});
for (const button of document.querySelectorAll("[data-control]")) {
  const name = button.dataset.control;
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (game.status !== "running") return;
    if (name === "boost") queuedBoost = true;
    else keys[name] = true;
    button.classList.add("held");
    try { button.setPointerCapture(event.pointerId); } catch { /* not required */ }
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, () => {
      if (name !== "boost") keys[name] = false;
      button.classList.remove("held");
    });
  }
}

ui.start.addEventListener("click", () => {
  if (game.status === "ready") startGame(game);
  else if (["won", "crashed", "timeout"].includes(game.status)) beginNew();
  synchronize();
});
ui.restart.addEventListener("click", beginNew);
ui.pause.addEventListener("click", () => {
  resetInputs(); togglePause(game); accumulator = 0; synchronize();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.status === "running") {
    resetInputs(); togglePause(game); accumulator = 0; synchronize();
  }
});
window.addEventListener("blur", () => {
  resetInputs();
  if (game.status === "running") { togglePause(game); accumulator = 0; synchronize(); }
});

// One animation loop for the whole page: restarting never registers a second
// keyboard listener, or an overlapping physics clock.
function frame(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const delta = Math.min(0.1, Math.max(0, (timestamp - lastTime) / 1000));
  lastTime = timestamp;
  if (game.status === "running") {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= WORLD.dt && steps < 6 && game.status === "running") {
      stepGame(game, { ...keys, boost: queuedBoost });
      queuedBoost = false;
      accumulator -= WORLD.dt;
      steps++;
    }
    if (steps === 6) accumulator = 0; // drop lag, not infinite catch-up.
  } else {
    accumulator = 0;
  }
  paint();
  synchronize();
  requestAnimationFrame(frame);
}
synchronize();
requestAnimationFrame(frame);
// Non-authoritative test hook contains no paid access or account information.
if (new URLSearchParams(location.search).get("test") === "1") {
  window.__zenithSoloTest = Object.freeze({
    snapshot: () => ({ status: game.status, ticks: game.ticks,
      boosts: game.boosts, score: game.score, x: game.ship.x, y: game.ship.y }),
    reset: beginNew,
  });
}
