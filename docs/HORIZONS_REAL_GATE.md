# Gate 5 — real Horizons acquisition and DE440s numerical comparison

**Research-only, draft, no production or gameplay integration.**

This branch deliberately uses GitHub Actions network access rather than fabricated planet positions. The pinned experiment requests a common epoch **JD(TDB) 2461356.500000000**, target codes 399 Earth, 301 Moon, 499 Mars center and 4 Mars-system barycenter. All requests use JPL Horizons API, center 500@0, ICRF/FRAME, VEC_CORR NONE, KM-S, VEC_TABLE 2 and TDB.

`tools/horizons_real_gate.py` preserves raw JPL JSON payloads and SHA-256 digests, rejects missing/ambiguous coordinate metadata and malformed epochs, computes the three true 3D distances from returned Earth/Moon/Mars center positions, and compares independent numerical states for Earth, Moon and **Mars barycenter** using Skyfield with a downloaded JPL DE440s BSP kernel.

**Important limitation:** DE440s contains Mars-system barycenter, not the Mars 499 body center. A passing DE440s Mars barycenter comparison does **not** independently verify Mars-center XYZ. Full cross-source Mars-center verification remains **ABSTAIN_NO_MARS_CENTER_KERNEL** until an appropriate independently retained Mars satellite ephemeris/kernel and source governance are provided. Skyfield vs Horizons are different implementations but not independently governed astronomical truth: both use JPL ephemerides. The fixed 0.5 km residual is a prospective engineering gate, not an empirical error estimate. A mismatch fails closed.

GitHub Actions runs the acquisition, uploads source JSON and receipt, and fails on fetch/parse/kernel or numerical mismatches. A passing partial check still **cannot** authorize flight dynamics or production. The action intentionally excludes the 30+ MB kernel from uploaded artifacts, while retaining its SHA-256 in the receipt; for full reproducibility preserve the independently obtained kernel with its recorded hash.

References: https://ssd-api.jpl.nasa.gov/doc/horizons.html and https://ssd.jpl.nasa.gov/horizons/manual.html

`PAPER_ONLY` · `ABSTAIN_EXTERNAL_PROVENANCE` · `ABSTAIN_PHYSICAL_METROLOGY` · `PROMOTION_BLOCKED` · `productionAuthority NONE`.
