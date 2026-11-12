# ZENITH Mars Race v1 — First independently testable solo gameplay branch

**Status:** Playable browser **preview** in a non-destructive draft PR, not an authorized production game, paid entitlement system, networked competitive service or physically accurate orbital simulator. The historic `FINAL_VR_v37_ONLINE_SIMPLE.html`, `FINAL_VR_v27_ALIVE_HYPER.html` and all Stripe research artifacts remain byte-unchanged.

## Source inspection and defects addressed

The legacy v37 game has `startGame()` adding `keydown`/`keyup` document listeners **every time it starts** and recursively scheduling `requestAnimationFrame(loop)`. Its `resetGame()` sets the shared `gameRunning=false` and immediately starts a new loop; an already-scheduled earlier frame can wake when `gameRunning` has become true again. This risks multiple clocks and repeated input/boost effects. The legacy ship and asteroids are mutated once per rendered frame, making physics dependent on refresh rate; collision and goal scoring are separate conditions and can both fire in one frame. Its leaderboard is seeded with imaginary player scores; untrusted PeerJS data is inserted through `innerHTML`, a potential script injection and score-integrity defect; share URLs are hard-coded to localhost in parts of the code. The historical paid/prize claims in older v27 are unsupported and must not leak into the replacement game.

The current Vercel site serves `public/index.html` and no playable route. Streamlit's `app.py` references newer game HTML filenames not present in this repository and falls back to legacy v37. That historical Streamlit entrypoint is intentionally unchanged.

## New standalone preview

- `public/game.html`: independently accessible responsive page, explicitly **solo**, **free**, and **local-only**. Desktop arrows/WASD, Space boost, P pause; mobile/touch direction pad and BOOST. Accessible labels, text HUD and clear state messages. No remote resources, no Stripe, no claims of cash prizes.
- `public/game-core.mjs`: seeded, deterministic asteroid layout and fixed 60 Hz simulation; capped ship speed and arena bounds, moon-like gravity, collision-before-win ordering, 90-second clock, three boosts, state-gated pause/restart/terminal transition. This is intentionally **arcade** physics, not a real Mars transfer prediction.
- `public/game-app.mjs`: one global browser animation loop and one input listener set regardless of starts and restarts; bounded catch-up after stalls; auto-pause on blur/tab background; accessible HUD and optional browser-local best score. No server-trusted score, identity, payments or remote multiplayer. The `?test=1` hook supplies read-only state snapshots and a local reset for browser tests; it provides no authority.
- `public/index.html`: adds a separate free-preview link without changing the three live checkout links, product prices or billing copy.
- `vercel.json`: allows **same-origin external modules only** with `script-src 'self'` while keeping `connect-src 'none'`, `object-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`, and forbidding inline scripts and remote JS. The global CSP is widened only to local scripts needed for the playable page; the static landing page has no executable script.

## Verification

`tests/game-core.test.mjs` checks seeded reproducibility, bounded pseudorandom output, no movement before start, single-use start, deterministic steps, diagonal normalization, boost exhaustion, speed/boundary caps, paused-state invariants, asteroid/moon impact, goal scoring, collision-before-goal ordering, timeout, reset, safe pricing and CSP routing.

`tests/game-browser-smoke.mjs` runs a real local Chromium browser on desktop and mobile in GitHub Actions, checks page loading, the actual storefront-to-game route, 60 Hz clock behavior, keyboard movement, single-keypress boost, pause/resume, triple restart, mobile touch movement, horizontal overflow, JavaScript exceptions, and third-party network traffic. Screenshots are uploaded as non-authenticated CI artifacts.

**Important:** Browser/CI tests establish only the tested web-build behavior. They do not prove real phone hardware performance, gameplay skill balance, accessibility compliance, production availability or security of a future multiplayer system.

## Gates after test pass

1. Manual pilot on actual Android touch devices and mainstream desktop browsers; log CPU/frame latency, controls, crashes and performance on low-end hardware.
2. Independent gameplay tuning: seeded scenario distribution, collision hazards, difficulty levels, and objective clarity with blinded testers.
3. Separately authenticated multiplayer, authoritative score computation, rate limits, anti-cheat and networking only after a real backend and abuse review exist. Historical PeerJS scores never authorize paid competition.
4. Keep Stripe entitlement/backend separate until sandbox-generated signed events, trusted storage, identity and refund/dispute revocation are independently verified.

**Authority:** `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. No production deployment, promotion, live money movement or paid access granted by this branch.
