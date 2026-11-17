# Moon orbit mathematical scope

- 21 selected prominent natural satellites of Earth, Mars, Jupiter, Saturn, Uranus and Neptune; **not all known moons**.
- Mercury and Venus have no known natural satellites.
- Circular coplanar approximation: r=(a cos(theta), a sin(theta)), theta=phase+direction*2*pi*t/P.
- Moon's approximate Sun-centered 2D position = parent planet model position + moon's parent-relative displacement.
- Moon-to-parent distance = sqrt(dx^2+dy^2)=a, in km, **center to center**, not surface altitude.
- Relative periods are sidereal days; model epoch and phase are arbitrary. Inclinations, eccentricity, perturbations, light-time, and real date-specific ephemerides are omitted.
- The circular model is deliberately unsuitable for Nereid's highly eccentric orbit, so Nereid is excluded. Triton is retrograde.
- Sources: https://ssd.jpl.nasa.gov/sats/elem/sep.html ; https://science.nasa.gov/mission/voyager/fact-sheet/ ; https://www.webassign.net/seedsfoundations14/a-table-11.pdf
- Mixed published reference tables are approximate, with different reference epochs. Do not use for actual spacecraft navigation or claim JPL date-matched verification.
- All values are illustrative offline model inputs; external provenance and 4K browser performance remain unverified.
