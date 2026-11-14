# ZENITH Mars Race — Cinematic 4D Ship Visual Gate

**Scope:** Non-destructive, draft-only visual successor to original game-4D branch in PR #12. The original physics source `public/game-4d-core.mjs` is unchanged.

## User-approved visual reference
Derived from the original generated concept image `cinematic_4d_flight_hud_in_deep_space.png` supplied in the immediately preceding conversation. A rear-chase spacecraft crop was scaled to an embedded 510×245 RGB WebP so it can be served **entirely offline** with no remote assets. The approved reference shows an original metallic spacecraft with two lateral wings, a central hull, stabilizers and three glowing blue engines. This is generated original visual art, not a proprietary Star Fox N64 model.

- Embedded image: `public/ship-cinematic-asset.mjs` `SHIP_IMAGE_URI` as `data:image/webp;base64,...`.
- Asset payload size: **7,234 bytes**.
- Asset SHA-256: **`d19cfaef3de512250401ad36c647fa24c681785ab9329371a6adf9f8efb36b72`**.
- Browser image source is decoded and rendered every frame as a **banking, attitude-linked 2.5D chase sprite**. This is **not** a true textured volumetric model with free camera orbit, normal mapping or physically-based rendering. The distinction is explicit in the public UI.
- The old small triangular ship and prominent luminous flight-corridor grid were removed from the 4D renderer.
- `public/game-4d-cinematic-render.mjs` paints **pure black space** with seeded, sparse, distant stellar points (subtle glow on brighter stars only). Moon/Mars/asteroids are drawn dimly instead of as emissive colored orbs. The ship displays dark metallic hull panels with original blue exhaust art and a small engine-speed effect.
- A minimal head-up display reports true simulated `X/Y/Z` in **game units (gu)**, simulation time `t` in seconds, speed in **gu/s**. The concept mockup's fictional `c` and `km` values were **not** copied as if they were current physical data.

## Safety, functionality and testing
- Keeps the inherited deterministic 60 Hz three-coordinate arcade flight, collisions, three boosts, terminal game states, pause/restart and existing desktop/mobile steering controls.
- No outside API, user data transfer, downloads, prizes, billing, auth or multiplayer is introduced.
- Offline image data URI is compatible with existing Vercel CSP `img-src 'self' data:` and `script-src 'self'`.
- Node 22 tests validate source image exact SHA, RIFF/WebP header, size, no network/payment code, black-space renderer and original physics regressions.
- Browser Chromium desktop/mobile smoke validates that the image **actually decodes** at 510×245, canvas background is near-black, controls advance real game state, pause freezes ticks, restart resets boosts, and no page errors or external requests occur. Screenshots are retained as CI artifacts.
- Device tests use emulated mobile Chrome, not a physical phone or headset. Visual adaptation is a software-rendered concept sprite, not native 3D GPU rendering.

## Verification and release boundary
See [GitHub Actions cinematic 4D test workflow](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/workflows/cinematic-4d-ci.yml) and [draft PR #22](https://github.com/KrAZicK604/ZENITH-1-PRO/pull/22). No merge to `main`, no live deployment promotion, and no editing original science/billing archives.

`PAPER_ONLY` · `PROMOTION_BLOCKED` · `productionAuthority NONE`. Future genuine volumetric 3D ship would require a modeled asset (glTF/WebGL), an independently tested GPU renderer and mobile performance budgets.
