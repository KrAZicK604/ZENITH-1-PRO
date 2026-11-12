# Mars Race astronomy navigation — v4.1 calibration audit

**Date:** 2026-11-12 (repository/GitHub recorded time; no independently attested host clock).
**Branch:** `game/nasa-ephemeris-navigation-v4-20261112`, draft PR #17, stacked on the 4D arcade preview. Production remains unchanged.
**Status:** `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `ABSTAIN_PHYSICAL_METROLOGY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.

## Mathematical and source model

Earth (NAIF 399), Moon (301), and Mars (499) must have a **single common** TDB Julian date, center Solar System Barycenter (0, `CENTER='500@0'`), `REF_SYSTEM='ICRF'`, `REF_PLANE='FRAME'`, `VEC_CORR='NONE'`, `OUT_UNITS='KM-S'`, a position-containing vector table (`VEC_TABLE='2'` is a convenient choice) and non-CSV output. The intended query is `EPHEM_TYPE='VECTORS'`, `TIME_TYPE='TDB'`, `VEC_LABELS='YES'` and exactly one shared epoch (`TLIST`/`TLIST_TYPE='JD'`, for example). All three outputs must agree in units, center, plane and timestamp.

For (A,B\in\{Earth,Moon,Mars\}), with the same barycentric time and coordinate system, the instantaneous center separation is

```text
d_AB(t) = hypot(X_B(t)-X_A(t), Y_B(t)-Y_A(t), Z_B(t)-Z_A(t)) [km]
```

The shared reference origin cancels. This **does not** compute a spacecraft trajectory, traveled path length, orbital transfer, arrival date, gravity-assist plan, mission delta-v or fuel cost. The interactive arcade vehicle remains in separate, compressed game units. The public NASA reference 384,400 km is the mean Earth–Moon separation, not a live lunar position; approximate Earth–Mars near/far figures are illustrative and not hard physical bounds. No constant Moon–Mars distance is assumed.

**Primary technical references:**
- JPL Horizons API options and semantics: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- JPL Horizons manual, frames, vectors, time systems: https://ssd.jpl.nasa.gov/horizons/manual.html
- Horizons Web entrypoint for exporting genuine vectors: https://ssd.jpl.nasa.gov/horizons/app.html

## Evidence and defects found

1. **Original test harness false negatives.** The original Gate 4 CI had 14/17 passing, three failures due to misordered optional fixture arguments for frame/units and a string replacement with special dollar-sign semantics. These were test bugs, not confirmed astronomical discoveries.
2. **Real Horizons header incompatibility.** The initial parser demanded `Time format: CAL` even though a documented Horizons vector header typically uses `Calendar mode`. It now requires the `JDTDB` heading and one TDB-suffixed epoch record.
3. **Reference-plane ambiguity.** Historical Horizons outputs print `Reference frame : ICRF/J2000.0` even for ecliptic XYZ output. A reference-frame line alone does not establish equatorial coordinates. The parser now requires an explicit `Coordinate systm`/`Coordinate system` declaration of equator-aligned coordinates, or it **abstains**. Ecliptic, body-fixed and missing coordinate-system metadata fail.
4. **Geometric-state requirement.** Non-geometric (light-time/astrometric) data, missing position output, incorrect center ID or center-site, wrong distance units, more than one epoch/XYZ line, duplicate `$$SOE`/`$$EOE` markers and mismatched body dates fail closed.
5. **New test-harness defect found during repair.** JavaScript `String.replace` replacement-text `$$` is interpreted as one literal dollar sign. Some tests inadvertently replaced valid `$$SOE`/`$$EOE` markers with malformed `$SOE`/`$EOE`. Replacements were changed to callback functions and full regression reruns were required.
6. **UI acceptance and provenance.** The browser uses the exact user-pasted data; a syntactically valid, fabricated Horizons-looking string is still *not* authenticated NASA/JPL data. The module is read-only and offline, does not execute command text, and shows no date-specific numbers until all three inputs pass validation.

## Test matrices

Baseline suite: 17 tests. Newly added adversarial suite: 19 tests, including reference-plane spoofing, mixed body frames, wrong center/site, missing time scale, duplicate marker/header/XYZ, inconsistent epochs, Euclidean 3D geometry, translated-coordinate invariance and triangle inequality. Total intended: 36 Node tests, plus desktop/mobile Chromium acceptance/rejection smoke.

Browser smoke uses **synthetic** sample positions to validate the data path, and must never be represented as a real ephemeris. It checks both valid and invalid submissions; invalid results must clear previously displayed distances and diagram markers. CI captures screenshots, console errors, mobile overflow, and external network requests.

## What must happen before real-spaceflight gameplay

Capture a genuine contemporaneous Horizons export for all three bodies through an independently inspected channel; preserve original raw text, request parameters, independent source hash and observation epoch; cross-compare against an independent SPICE/NAIF computation at the same TDB epoch. Then and only then consider trajectory integration with a documented frame/epoch transform, actual gravitational parameters, variable-step integration, collision/event handling, perturbation model, and numerical error budget. A one-epoch separation is inadequate to evolve orbital positions. No release, autopilot, real-world action or production promotion is authorized.

## Review gate

No live Horizons vector bundle has been downloaded or independently authenticated in this phase. Passing synthetic math and Chromium checks do not prove actual astronomy metrology or external provenance. Any validation failure must remain **ABSTAIN**, never default to a fictitious set of planet coordinates.
