# Mars Race v4 — real astronomical coordinates, provenance, and limitations

## What this branch actually does

The tactical game now includes a **separate astronomical navigation computer** showing real-scale geometric center-to-center distances and Earth-centered 3D vectors for Earth, Moon, and Mars at **five exact UTC sample dates**. The underlying ephemeris is calculated from **Swiss Ephemeris 2.10.03, Moshier analytic backend**, using heliocentric Cartesian equatorial-of-date vectors converted from AU to km. It is **not JPL Horizons**, a NASA-issued numerical ephemeris, a measured spacecraft position, or an authenticated external catalog. The five snapshots are locally generated source-attributed research values.

The original arcade ship physics is deliberately **not** reinterpreted as physical kilometres, seconds, real gravitational acceleration, real travel time, or a valid Earth–Mars transfer. The game canvas has compressed distance and exaggerated object radii; using those positions as real orbital coordinates would be scientifically false. The navigation computer is an honest separate readout. The Moon at full Earth–Mars scale is subpixel: the game explicitly marks it and provides a separately labelled enlarged inset.

## Coordinate system and distance mathematics

At each timestamp, all three body positions are heliocentric equatorial-of-date vectors in km:
`r_earth(t), r_moon(t), r_mars(t)`.

For two bodies A,B:
`d_AB(t) = sqrt((Bx-Ax)^2+(By-Ay)^2+(Bz-Az)^2)`.

Earth-centered vectors are `r'_earth=(0,0,0)`, `r'_moon=r_moon-r_earth`, `r'_mars=r_mars-r_earth`. This preserves all distances. One-way geometric light-time is `d/299792.458 km/s`; this excludes electronics delays and relativistic correction. These are **simultaneous geometric separations**, not transfer-orbit distances or launch-to-arrival ETAs.

### Dated results (UTC 00:00, approximate Moshier)

| UTC date | Earth–Moon km | Earth–Mars km | Moon–Mars km |
|---|---:|---:|---:|
| 2026-11-12 | 404,141.274 | 200,669,747.880 | 200,846,503.958 |
| 2026-11-19 | 389,929.424 | 191,740,015.323 | 192,112,741.448 |
| 2026-11-26 | 359,348.187 | 182,682,984.009 | 182,541,903.884 |
| 2026-12-03 | 386,227.133 | 173,546,074.507 | 173,211,333.171 |
| 2026-12-10 | 405,816.836 | 164,396,856.003 | 164,558,866.719 |

The figures are approximate ephemeris outputs, not NASA-confirmed exact values. Three decimals indicate the frozen serialization precision, **not** physical accuracy of 1 metre. Coordinates were generated with `swe.calc_ut(..., FLG_MOSEPH|FLG_HELCTR|FLG_XYZ|FLG_EQUATORIAL)`; the read-only replay script checks the actual backend and Swiss version. UTC civil date and internal ephemeris timescale conversion are handled by the library. No cross-epoch interpolation is allowed: heliocentric equatorial-of-date axes can vary and the Moon moves quickly. To add dates, generate a new frozen dataset with provenance and verify it.

## NASA/CSA reference sources

- NASA Moon reference mean: 384,400 km: https://science.nasa.gov/moon/by-the-numbers/
- NASA Moon orbital variability: https://science.nasa.gov/planetary-science/focus-areas/
- NASA Mars Earth minimum and maximum geometric separation (approximately 54.6 million to >400 million km): https://www.nasa.gov/wp-content/uploads/2024/12/esdmd-001-add-rev-b.pdf
- CSA Moon and Mars mission-distance context: https://www.asc-csa.gc.ca/eng/youth-educators/why-the-moon.asp
- Swiss Ephemeris documentation: https://www.astro.com/swisseph/swephprg.htm
- JPL Horizons official API **future higher-fidelity source**, not used to produce this dataset: https://ssd-api.jpl.nasa.gov/doc/horizons.html

## Verification and gate

The CI runs (1) pure Node distance and source-binding tests, including independently pinned values, triangle inequality, invalid-data rejection and no interpolation, (2) separate Python recomputation using pinned Swiss Ephemeris Moshier, (3) real Chromium desktop/mobile navigation tests including date selection, visible figures, network isolation, console errors and screenshots. If the source replay cannot install or reproduce exactly, CI fails; do not silently substitute a different ephemeris.

The data file and browser mirror are separate to keep the site's CSP `connect-src 'none'` unchanged. Tests compare their entire vector arrays. This is still **same-author synthetic verification**, not an independent astronomer audit or externally signed data custody.

## Next scientific gate

For genuine mission simulation, obtain source-authenticated JPL DE440/DE441 SPICE kernel or JPL Horizons state vectors at common epochs in a fixed ICRF frame with barycentric positions and velocities, hash-pin the original kernel/response, cross-check independently, then integrate gravitational N-body motion in SI units with a validated adaptive integrator and documented numerical error. Real Earth-to-Mars transfer distance depends on the trajectory, departure date, delta-v and spacecraft dynamics; a single straight-line range is not enough. Only after this gate should the ship's in-game kilometre readout be presented as physically simulated position or travel duration.

**Status:** research gameplay preview; PAPER_ONLY, PROMOTION_BLOCKED, productionAuthority NONE. No Stripe, production billing or original protected game files modified.
