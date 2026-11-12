# Gate 5 — real Horizons acquisition and DE440s numerical comparison

**Research-only, draft, no production or gameplay integration.**

This branch deliberately uses GitHub Actions network access rather than fabricated planet positions. The pinned experiment requests a common epoch **JD(TDB) 2461356.500000000**, target codes 399 Earth, 301 Moon, 499 Mars center and 4 Mars-system barycenter. All requests use JPL Horizons API, center 500@0, ICRF/FRAME, VEC_CORR NONE, KM-S, VEC_TABLE 2 and TDB.

`tools/horizons_real_gate.py` preserves raw JPL JSON payloads and SHA-256 digests, rejects missing/ambiguous coordinate metadata and malformed epochs, computes the three true 3D distances from returned Earth/Moon/Mars center positions, and compares independent numerical states for Earth, Moon and **Mars barycenter** using Skyfield with a downloaded JPL DE440s BSP kernel.

**Important limitation:** DE440s contains Mars-system barycenter, not the Mars 499 body center. A passing DE440s Mars barycenter comparison does **not** independently verify Mars-center XYZ. Full cross-source Mars-center verification remains **ABSTAIN_NO_MARS_CENTER_KERNEL** until an appropriate independently retained Mars satellite ephemeris/kernel and source governance are provided. Skyfield vs Horizons are different implementations but not independently governed astronomical truth: both use JPL ephemerides. The fixed 0.5 km residual is a prospective engineering gate, not an empirical error estimate. A mismatch fails closed.

GitHub Actions runs the acquisition, uploads source JSON and receipt, and fails on fetch/parse/kernel or numerical mismatches. A passing partial check still **cannot** authorize flight dynamics or production. The action intentionally excludes the 30+ MB kernel from uploaded artifacts, while retaining its SHA-256 in the receipt; for full reproducibility preserve the independently obtained kernel with its recorded hash.

References: https://ssd-api.jpl.nasa.gov/doc/horizons.html and https://ssd.jpl.nasa.gov/horizons/manual.html

`PAPER_ONLY` · `ABSTAIN_EXTERNAL_PROVENANCE` · `ABSTAIN_PHYSICAL_METROLOGY` · `PROMOTION_BLOCKED` · `productionAuthority NONE`.

## Live parser falsification

The first GitHub-run real Horizons response for Earth was retrieved and preserved, but did **not** contain the synthetic fixture's `Coordinate systm` header. Strict header-based verification correctly abstained (`UNVERIFIED_EQUATORIAL`). The parser was changed to rely on the explicitly pinned request `REF_PLANE=FRAME`, while recording that the response header does not independently attest the plane. This is a provenance limitation, not an independently measured coordinate-system guarantee. The original failed run is https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43331470962 and the raw Earth response is retained as a GitHub Actions artifact.

## Real acquisition result (GitHub-hosted execution)

The **actual** GitHub Actions run [43331560278](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43331560278) completed successfully on source commit `1ace2cb7fbcd8f23270f8391d7239d7ac283407b`, with 4 original Horizons JSON responses and a machine-readable receipt retained in [artifact 13994264228](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43331560278/artifacts/13994264228).

- Epoch: JD(TDB) `2461356.500000000` (fixed future research epoch; **not today's current position**).
- Horizons Earth–Moon center separation: **404167.02830620465 km**.
- Horizons Earth–Mars center separation: **200668210.37076584 km**.
- Horizons Moon–Mars center separation: **200845354.18174806 km**.
- Horizons vs separately executed Skyfield DE440s barycentric XYZ residual: Earth **0.000027136247063612894 km**, Moon **0.002208555288685525 km**, Mars **system barycenter** **0.000000029802322387695312 km**.
- Kernel SHA-256: `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`.
- Numerical gate status: `PARTIAL_INDEPENDENT_NUMERICAL_CROSSCHECK`. Mars **body-center 499** remains `ABSTAIN_NO_MARS_CENTER_KERNEL`; the kernel only checked the Mars-system barycenter (4). No production or flight-dynamics authorization.
- Source payloads were obtained via HTTPS in GitHub Actions and hashed, but the API is not a cryptographically signed measurement and GitHub-hosted timestamps are not independently attested custody. The raw output omitted the explicit coordinate-plane declaration, so the FRAME property is supported by the pinned request rather than an independent response-header assertion.
- The first strict parser correctly failed on the missing output coordinate header; its error and corrected replay are preserved in GitHub run history. No scientific threshold was relaxed to achieve this passing result.
