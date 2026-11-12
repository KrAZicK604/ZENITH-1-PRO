# ACE Vector v3 — 3D fighter / 4D game-time dynamics

**Date:** 2026-11-12, host clock not independently attested. **Authority:** research/gameplay preview only. Versioned branch based on **draft PR #12**, following draft PR #10. No originals overwritten; no live Stripe, wallet, game rewards, branch promotion or production changes.

## Scope and visual provenance

An original angular delta-wing fighter, faceted asteroids, colored nebula, engine-glow animation, perspective chase camera, cockpit radar and target brackets. Visual direction references the *era and genre* of late-1990s console polygonal spaceflight, not copied characters, Arwing shape/branding, copyrighted art, original UI, voice lines, music, sound effects or actual Nintendo game source. Uses locally authored Canvas polygons without external textures, libraries, network requests or shader downloads.

The world is four-coordinate in the standard game sense: `(x,y,z,t)`, with three spatial axes and elapsed game time. This is *not* a fourth spatial axis, relativistic physics, actual spacecraft simulator, military cockpit, ballistics or real combat targeting. A separate ship attitude `(yaw,pitch,roll)` determines local forward/right/up thrust vectors, which is more informative than merely tilting a sprite.

## Flight control law (illustrative game units)

For a timestep `dt=1/60`:

```
v_(k+1) = cap( damping * [v_k + dt*(a_main + a_strafe + a_lift + a_gravity + a_burner) + pulse], speed_cap )
p_(k+1) = clamp_arena(p_k + dt*v_(k+1))
orientation_(k+1) = (yaw_k + yaw_input*ωy*dt, pitch_k + pitch_input*ωp*dt, roll_k + roll_input*ωr*dt)
```

The orientation basis is an explicit yaw/pitch/roll rotation of the model's local X-forward/Y-right/Z-up frame. The forward thruster's acceleration includes a settable throttle, a heat-limited afterburner, and optional inertial assistance. Air-brake increases drag, maneuver pulse spends one of three charges. Target acquisition is a local visual-angle/range heuristic, not a sensor or fire-control solution. Shield contact and cooldowns are gameplay abstractions; instantaneous Moon contact is terminal.

Swept relative-segment/sphere collision checks are inherited from the verified v2 code and still take priority over an arrival at Mars. Reproducible seeded worlds and fixed timestep allow deterministic simulation tests. 90-second limit and arena bounds remain frozen from v2.

## Controls

- Keyboard: W/S pitch, A/D yaw, Q/E roll, arrows up/down throttle, Shift afterburner, B air-brake, J/L lateral strafe, U/O vertical lift, F inertial-assist toggle, T cycle noncombat contacts, Space maneuver pulse, P pause.
- Pointer-capable mobile devices: independent hold-to-fly touch controls with safe pointerup/pointercancel release; mission actions via buttons.
- Gamepad: left analog pitch/yaw, right analog roll/throttle, triggers brake/burner, shoulder buttons lateral strafe, A pulse, X contact cycle, Y assist toggle, Start pause. No gyroscope, VR headset, authenticated multiplayer or live prize systems are implied.

## Tested invariants and limits

The new Node 22 suite `tests/ace-flight-core.test.mjs` covers source-independent test calculations of orientation orthonormality, 3D movement, bounded joystick inputs, throttle, boost overheating and lockout, brake/assist behavior, 3D velocity, shield-damage cooldown, goal-vs-collision priority, target lock transitions, reset/timeout, and no network or billing integration. It also runs inherited v2 3D-dynamics tests.

The Chromium suite `tests/ace-flight-browser.test.mjs` tests actual rendering and desktop/mobile controls, pause, restart, screen overflow, script errors, and third-party requests. Screenshots are uploaded as separate evidence. These are authored simulated game worlds and same-repository tests, not independent source-authenticated hardware verification. **No real Nintendo platform, Quest 3, GPU performance evaluation or physical avionics are tested.**

## Next gates

1. Evaluate full playability and balance across at least 50 disjoint seeded maps and 20 independent pilot trajectories. Report survival and completion rates rather than only unit-test success.
2. Instrument frame rate, main-thread stalls, and controller events in real Android and PC hardware, not merely Chromium CI.
3. Challenge numerical extremes: degenerate camera angles, rapid consecutive inputs, long paused sessions, collision motion at maximum speed, visibility changes and disabled storage.
4. Add independently reviewed, separately authenticated game servers before considering remote combat, multiplayer, ranking, paid entitlements, or prize systems.

**Status:** `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.
