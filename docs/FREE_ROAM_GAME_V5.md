# ACE Vector Free Roam v5 — Research-only Gameplay Gate

The goal is **unrestricted player choice**: the craft may remain stationary, coast after engine cutoff, turn, strafe, brake, burn toward a selected Moon/Mars landmark or roam away from all destinations. No obligatory mission, win, score, ninety-second timeout, arena box, automatically completed task or player-initiated physical control outside the game.

## Controls and dynamics

- Fixed `dt=1/60` simulation clock with bounded frame catch-up; deterministic mathematical state.
- Position and velocity in fictional **game units**, orientation through yaw/pitch/roll; 4D notation is (x,y,z,t), where the fourth dimension is elapsed simulation time.
- Starts at game-space (340,0,0) with velocity=0, throttle=0, optional dampers OFF. No default acceleration, so doing nothing is a legitimate stable behavior.
- Flight joystick and keyboard pitch/yaw/roll, throttle 0–100%, vertical/lateral thrusters, thermal-limited afterburner, air brake, immediate engine cutoff, optional inertial dampers.
- Engine cutoff and no dampers preserve coasting velocity. Velocity cap and 1e12 safe-coordinate precision gate prevent floating-point overflow. The latter is a fail-closed computational limit, not a game-space wall or deadline.
- Earth, Moon and Mars are optional **fictional-compressed** destinations with directional beacons and flyby notifications; no collision-based compulsory game over or automatic arrival ending.
- UI screen relative to ship is rendered as original low-poly triangulated polygonal craft, depth-projected planets, star field, radar-style target cue. Not copied character/ship art.
- Desktop keyboard and gamepad; mobile/touch press-and-hold controls; browser auto-pause when hidden or unfocused.
- Local practice only; no networking, payments, real prize ledger, weapon functions or production authority.

## Astronomical truth separation

The free-roam ship's position is **not kilometers**. Distances in the flight HUD are marked **gu**. The optional read-only reference selector shows four instantaneous **actual JPL Horizons-derived** Earth–Moon/Mars-center separations in km, compared with CSPICE using DE440s/MAR099s. The selected reference date does not move or propagate the arcade planets or ship. The original 17-file source and receipt ZIP SHA-256 is `8dd3c3679be601976aa88bc5a5a33464cd31eec86a42c06cc13d918f7bbc2271`; [scientific run 43333118978](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978), [raw evidence](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978/artifacts/13995288640).

This does **not** establish a continuous four-body orbital simulation, 4th spatial dimension, physical flight time, fuel performance, asteroid observation, or real-world mission navigation. A real-km flight mode requires validated moving ephemerides, continuous interpolation or SPICE lookup, consistent gravitational constants, bounded numerical integrator and trajectory benchmarking.

## Checks

CI `.github/workflows/free-roam-game-ci.yml` executes Node deterministic tests (idle for two hours of simulated time; unbounded-duration session; 3D control axes; engine cutoff and exact drift; optional assist; thermal lockout; Moon/Mars waypoint selection; flyby without victory; finite-precision failure; no billing/remote code) and Chromium desktop/mobile browser smoke (ship idle, touch/keyboard throttle, coast, target selection, pause/reset, static real-km reference, no JavaScript exceptions or remote requests). Automated mobile emulation is not an actual physical phone test.

**Authority:** `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. Separate draft branch above the existing ACE Vector v3; protect existing game, preserve billing untouched, do not merge/deploy until reviewed.
