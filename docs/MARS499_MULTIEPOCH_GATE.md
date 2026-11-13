# Mars 499 real ephemeris multi-epoch verification — draft scientific gate

**Scope**: Read-only GitHub Actions experiment. No production change, no bank/payment systems, no networked game control.

Ephemeris sources: genuine NASA/JPL Horizons VECTORS API; separately evaluated CSPICE using JPL DE440s plus **MAR099s** satellite ephemeris for Mars center NAIF 499, loaded from official NAIF archives. This is an independent numerical code path, **not independently governed scientific provenance**.

- Horizons target IDs: Earth 399, Moon 301, Mars-system barycenter 4 and **Mars center 499**.
- Reference origin: solar system barycenter `500@0`. Geometric `VEC_CORR=NONE`, ICRF `REF_SYSTEM=ICRF`, equatorial `REF_PLANE=FRAME`, km and km/s `OUT_UNITS=KM-S`, `VEC_TABLE=2`.
- Four preselected TDB Julian dates: **2461355.5**, **2461356.5**, **2461357.5**, **2461360.5**.
- Kernel state query: `spiceypy.spkezr(str(body), (jd-2451545)*86400, 'J2000', 'NONE', '0')`.
- Prospective tolerance: full 3D Cartesian position difference ≤ **1 km** per body per epoch; full Cartesian velocity difference ≤ **0.0001 km/s** per body per epoch. No average can conceal a per-epoch failure.
- Record four raw Horizons JSON responses for each date, their original SHA-256 bytes, external HTTPS query URLs, each kernel SHA-256/byte length, 16 comparisons and per-epoch Earth–Moon, Earth–Mars-center and Moon–Mars-center ranges.
- No timestamp, source-custody or physically calibrated traceability certification. Horizons and MAR099s both derive from JPL modeling; CSPICE is a separately implemented reader, not an external blind oracle.
- A passed numerical gate does not determine spacecraft route length, transfer trajectory, travel time, fuel, orbit mechanics or galactic positions. Those need time propagation and calibrated dynamics **separate from the arcade game**.
- The prior single-epoch gate returned `PARTIAL_INDEPENDENT_NUMERICAL_CROSSCHECK` for Earth, Moon and Mars barycenter but properly abstained on Mars center; this gate is specifically designed to close that coverage gap without swapping barycenter 4 for body center 499.

Trusted source metadata and example documentation: https://ssd.jpl.nasa.gov/sats/ephem/sep.html , https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ , https://ssd-api.jpl.nasa.gov/doc/horizons.html

Statuses: `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `ABSTAIN_PHYSICAL_METROLOGY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.
