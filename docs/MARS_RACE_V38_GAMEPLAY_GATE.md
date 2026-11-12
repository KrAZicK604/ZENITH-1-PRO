# Mars Race v38 — Gameplay repair branch

**Source inspected:** `FINAL_VR_v37_ONLINE_SIMPLE.html` from protected `main`. Original remains unchanged.

## Reproduced by code inspection (not yet browser reproduction)

The v37 `startGame()` function installs new global `keydown` and `keyup` listeners on each restart; its nested animation loop can report victory after collision in the same frame. It uses mutable, client-controlled PeerJS scores and locally stored leaderboards, and displays a hardcoded localhost share URL. Those are not verified global multiplayer or authoritative rankings.

## Implemented

A separate `public/game/index.html` playable browser prototype with a pure seeded simulation `public/game/mars-engine.js`: fixed 60 Hz physics step, bounded speed, deterministic asteroid generation and collisions, terminal win/crash resolution with crash precedence, limited boosts, explicit pause/reset, touch/keyboard input, and honest practice-only scoring. Controls register once at page load. The game is entirely offline and does not connect to Stripe, PeerJS, or a game account. All gameplay uses illustrative forces and scoring; it is not an orbital mechanics simulator.

## Tests and gates

`node --test game-tests/mars-engine.test.cjs` checks seed reproducibility, distinct seeds, invalid inputs, boost accounting, bounds and finite dynamics across 5,000 simulated frames, terminal states, collision-vs-win precedence, asteroid reflection, network/payment isolation, and input-handler structure. The workflow runs Node 22 on a separate game PR. A green workflow is evidence of the local JS test suite, **not** mobile-browser, WebXR, cross-device, multiplayer, anti-cheat, accessibility or production readiness.

## Next work

Test in real Chromium desktop and mobile browser; instrument and measure frame pacing; test keyboard/touch on actual devices; add deterministic level design and collision fairness; then a separately authenticated server-authoritative multiplayer protocol and independently verified leaderboards. Do not imply browser scores are secure, do not use fabricated prize pools or paid entry, and do not tie game access to a checkout redirect. A download distribution should package the reviewed game code and content with signed releases and a separate update mechanism.

**Status:** Game development preview only, `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. No change to live billing, production storefront, original game HTML or Stripe accounts.
