# Planetarium V8 — Physically Scaled Planet Positions and UTC-Dependent 4D Game View

## Research objective and implementation

The **existing cinematic 4D ship** stays an arcade model with 3 positional axes (game units) and simulation time `t`. The new **JPL planetarium**, accessible directly from `/game-4d.html`, is a separate, read-only physical position visualization using **actual kilometer-based barycentric geometric vectors**. Switching modes suspends arcade stepping; it never silently converts arcade position/velocity into real space.

The astronomy view uses an actual UTC calendar selector, "device UTC now" mode (the device clock is **not attested**), free pause/play and acceleration at 1×, 60×, 3,600× or 86,400×. A physical linear distance scale and three camera choices (full solar system, inner solar system, Earth–Moon closeup) keep distance relationships consistent. Planet visual radii are enlarged by default for legibility, explicitly disclosed; true-radius mode removes enlargement and may reduce bodies to unresolved subpixel markers.

## Scientific data provenance

- NASA/JPL DE440s `de440s.bsp`: SHA-256 `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`.
- NAIF Mars satellite ephemeris `mar099s.bsp`: SHA-256 `997dc93ba640e476da7a494d2237dcdeb145e528db37be8ccee588c615e4e1ff`.
- Official NAIF leap-second kernel `naif0012.tls`: SHA-256 `678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b`.
- Static, canonical JSON payload SHA-256 `94720b633529defcfc8b3f9ce4000e34680d00942482b0488ca6e0a461339384`, original length 232,052 bytes, embedded compressed and decoded with native browser `DecompressionStream`. The decoded SHA-256 is checked with `crypto.subtle` before any astronomical result appears, and the sample grid and metadata are checked again.
- Real source generation [GitHub Actions run 43681650929](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43681650929), `tools/build_planet_time_catalog.py`; retained raw JSON and numerical evidence in that run's archive.
- SPICE code path: `spice.str2et` for UTC input using the official leap-second kernel, `spice.spkezr(target, ET, 'J2000', 'NONE', '0')` for position (km) and velocity (km/s).
- IERS Bulletin C 72 (issued July 6, 2026) confirms **no leap second at the end of December 2026**, relevant to this bounded UTC window: https://datacenter.iers.org/data/html/bulletinc-072.html.
- Prior independent numerical Horizons ↔ MAR099s/DE440s comparisons for Earth 399, Moon 301 and Mars body center 499 at four distinct epochs passed [Gate 6](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978), but both sources rely on JPL models; this is **not independent astrophysical custody or physical proof**.

### Exactly what each marker denotes

| Display marker | NAIF code | Scientific referent |
| --- | ---: | --- |
| Sun | 10 | Sun center |
| Mercury | 1 | Mercury system barycenter |
| Venus | 2 | Venus system barycenter |
| Earth | 399 | Earth body center |
| Moon | 301 | Moon body center |
| Mars | 499 | Mars body center, requires MAR099s |
| Jupiter | 5 | Jupiter system barycenter |
| Saturn | 6 | Saturn system barycenter |
| Uranus | 7 | Uranus system barycenter |
| Neptune | 8 | Neptune system barycenter |

A planet-system barycenter is **not automatically the planet's physical center**, especially for a planet with massive moons. We intentionally do not relabel such data as body-center observations. Marker colors/planet radii are illustrative, rather than observed telescope textures. Rendering geometry has a fixed projection of ICRF x/y/z to screen.

## Temporal accuracy and permitted range

- Data time window: **2026-11-01T00:00:00Z to 2027-03-01T00:00:00Z** inclusive, 241 source points at **12-hour** UTC intervals.
- Each source knot has the complete 6-vector `(x,y,z,vx,vy,vz)`; intermediate times use **piecewise cubic Hermite** state interpolation from those two position and velocity vectors with `Δt=43,200` seconds.
- Tested at **2,400 independently evaluated interval midpoint/body combinations**. Observed maximum 3D position difference against direct SPICE computation: **1.2536526079272146 km**. Observed maximum 3D velocity difference: **5.497745383126421e−7 km/s**.
- Acceptance thresholds frozen in the generator before successful execution: 10 km in position and 0.001 km/s in velocity. These are **measured midpoint results, not a rigorous worst-case bound over all continuous times**, and not an accuracy bound on astronomical truth itself.
- Outside the time window, the UI gives `ABSTAIN_OUTSIDE_VERIFIED_EPOCHS`, shows no fictional positional interpolation and stops accelerated time progression. There is no Horizons fetch at gameplay time and no arbitrary orbital extrapolation.
- The displayed solar-system geometry is real-scale for **center positions/separations**, but body disks are deliberately enlarged unless true-radius mode is chosen. The local ship is still not rendered in physically calibrated km.

## Engineering validation and safety

All public-source data is pinned, hash verified and embedded in the repository without runtime networking. Browser source rejects malformed time strings and non-finite vectors; the original arcade physics remains in its separate module. The parent source archives are untouched. Tests cover exact source-knot reproduction, derivative continuity, Earth–Moon/Earth–Mars distance changes, barycenter labeling, real-scale projection, UTC bounds, malicious synthetic vector mutations, and desktop/mobile browser interactions.

**Science limitations:** The body positions are JPL **model** states; the date/time source is either user entered or an **unattested device clock**, not an independently witnessed time source. Planetary time progression does not implement spacecraft orbital mechanics, gravity integration, collision physics with real-sized bodies, measured acceleration, actual travel times, NASA mission planning or physically certified rendering. There is no 4th spatial dimension: here 4D means `(x,y,z,t)`.

**Authority:** `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `ABSTAIN_PHYSICAL_METROLOGY`, `ABSTAIN_CONTINUOUS_SHIP_DYNAMICS`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. Draft branch; not merged or production deployed.
