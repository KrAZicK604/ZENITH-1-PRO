# ZENITH spacecraft v9 — true 3D model within existing 4D gameplay

## Goal and confirmed implementation

Replace the fixed chase-view image as the **primary rendering mode** for the existing `public/game-4d.html` browser game. Retain the original approved concept-derived image only as a selectable fallback, plus automatic fallback when WebGL2 is unavailable or a context fails. No destructive changes to the original `game-4d-core.mjs` physics, race rules, planetary JPL catalog or payment/deployment settings.

The replacement is **actual local geometric 3D** rendered in native WebGL2: independently projected triangles, per-face normals, perspective/depth, metallic illumination, a layered gunmetal fuselage, armor plating, raised canopy, broad swept delta wings, two stabilizers, three individually modeled radial thruster nacelles and internal cores, semi-transparent blue exhaust cones, small blue/orange navigation lights, and animated emissive material. These features were designed from the user's prior spacecraft concept and assembled as mathematical geometry in `public/ship-3d-mesh.mjs`. This is not a disguised flat 2D texture or a photo plane.

The `public/ship-3d-webgl.mjs` renderer adds a deterministic distant point-star background on genuinely black space, perspective and depth-buffer occlusion, low-cost surface reflections, optional wireframe mode, and five viewpoints (chase, orbit, top, side and front). Dragging or touching the WebGL canvas changes the inspection orbit; scrolling changes inspection distance. Camera controls do not change spacecraft physics. Three past simulated states may appear as translucent 3D wireframe time-slice ghosts. This represents **time history** along the fourth coordinate `(x,y,z,t)`; there is no invented fourth spatial dimension, tesseract physics, FTL speed, or claim of real spacecraft dimensions.

The existing free-roam game is not silently combined with the 4D race engine; this branch changes **the 4D spaceship scene only**. The race retains its 90-second arcade timer and obstacles, and the time-dependent planetary view remains a separate, physically scaled JPL reference. The ship and asteroid model coordinates continue to use **fictional game units**, never astronomical kilometers. Live hardware safety, fuel, collisions with real bodies and flight paths have not been verified.

## Safety and runtime constraints

- Zero runtime external networking, CDN, third-party 3D assets, unsafe dynamic import, payment calls, shader downloads, file writes or application-level browser storage.
- WebGL2 program sources are fixed JavaScript string literals compiled on the device. Shader compilation/context failure fails closed to the existing local cinematic image. A context loss does not falsely claim that unrecreated GPU resources are valid.
- Fixed geometry size and vertex count bounds, finite vertex/normal/material values, consistent three modeled engine centers.
- The game continues to use original deterministic 60Hz update path. Planetarium switch suspends arcade simulation while the real astronomy map is displayed.
- Desktop/mobile and synthetic-precision browser emulator testing are **not** hardware-calibrated GPU/real-phone reviews. Metal shading and dimensions are design art, not CAD/FEA/aerospace certification.
- The original ship reference asset, source repo and archived scientific data remain unchanged.

## Validation gates

`tests/ship-3d-mesh.test.mjs`: procedural polygon counts, deterministic geometry, finite 3D vertex coordinates, unit normals, wings/fins/canopy, tri-engine arrangement, 3D transforms, five camera modes, and separation from astronomical data.

`tests/ship-3d-browser-smoke.mjs`: Chromium desktop and mobile touch WebGL2 paths, actual 3D renderer frame counts and geometry status, top/side/front/orbit/chase, wireframe, time-ghost toggles, existing flight controls and pause, JPL planetarium toggle, original 2D rendering fallback, viewport overflow and no JavaScript errors/remote calls. A CI-only SwiftShader graphics backend may be enabled to prove execution on a GitHub-hosted runner; this does not represent production hardware GPU performance.

Inherited scientific/arcade regression tests continue to run; the one test asserting the old ship was image-only was intentionally updated to check that the new app truthfully announces real 3D while retaining the 2D fallback.

The next physical simulation gate, if chosen separately, is an independently benchmarked orbital propagation with physically defined spacecraft acceleration, frame/time conversion, error budgets and external source custody. **This branch does not do that.**

Gate status: `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `ABSTAIN_REAL_4D_PHYSICS`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. No production merge or manual deployment retry.
