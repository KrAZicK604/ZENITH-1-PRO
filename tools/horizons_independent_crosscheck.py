#!/usr/bin/env python3
"""Source-separated, same-author independent arithmetic + Astropy builtin check.

Does not import or call real_ephemeris_gate. Reads retained raw source files,
recomputes vector arithmetic at 50-digit Decimal precision, then compares
against a different, lower-accuracy ERFA/Astropy analytical ephemeris.
This is NOT an external blind referee, a different observational dataset,
or a metrological/production certification.
"""
from __future__ import annotations
from decimal import Decimal, localcontext
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys

BASE = Path("evidence/gate5")
NAMES = {
    "earth_barycentric": (399, 0),
    "moon_barycentric": (301, 0),
    "mars_barycentric": (499, 0),
    "moon_from_earth": (301, 399),
    "mars_from_earth": (499, 399),
    "mars_from_moon": (499, 301),
}
PAIRS = {
    "earthMoon": ("moon_barycentric", "earth_barycentric", "moon_from_earth", "earth", "moon"),
    "earthMars": ("mars_barycentric", "earth_barycentric", "mars_from_earth", "earth", "mars"),
    "moonMars": ("mars_barycentric", "moon_barycentric", "mars_from_moon", "moon", "mars"),
}


def read_raw(name: str, expected_sha: str) -> tuple[Decimal, ...]:
    path = BASE / (name + ".txt")
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected_sha:
        raise ValueError("RAW_SHA256_MISMATCH:" + name)
    text = data.decode("utf-8")
    if text.count("$$SOE") != 1 or text.count("$$EOE") != 1:
        raise ValueError("RAW_MARKER_COUNT:" + name)
    part = text.split("$$SOE")[1].split("$$EOE")[0]
    pattern = r"^\s*X\s*=\s*([+-]?[\d.]+(?:[Ee][+-]?\d+)?)\s+Y\s*=\s*([+-]?[\d.]+(?:[Ee][+-]?\d+)?)\s+Z\s*=\s*([+-]?[\d.]+(?:[Ee][+-]?\d+)?)"
    xyz = re.findall(pattern, part, re.M)
    if len(xyz) != 1:
        raise ValueError("RAW_XYZ_FORMAT:" + name)
    return tuple(Decimal(value) for value in xyz[0])


def delta(a: tuple, b: tuple) -> tuple:
    return tuple(x - y for x, y in zip(a, b))


def norm(v: tuple) -> Decimal:
    return sum(x * x for x in v).sqrt()


def check() -> dict:
    from astropy import units as u
    from astropy.coordinates import solar_system_ephemeris, get_body_barycentric
    from astropy.time import Time

    record = json.loads((BASE / "capture.json").read_text(encoding="utf-8"))
    if record.get("status") != "HORIZONS_SOURCE_FORMAT_VALID_DIRECT_RELATIVE_MATCH":
        raise ValueError("CAPTURE_NOT_ACCEPTED")
    if Decimal(str(record["epoch"]["jd_tdb"])) != Decimal("2461356.5"):
        raise ValueError("WRONG_EPOCH")
    with localcontext() as ctx:
        ctx.prec = 50
        xyz = {
            name: read_raw(name, record["sources"][name]["text_sha256"])
            for name in NAMES
        }
        for name in NAMES:
            listed = record["vectors"][name]
            if (int(listed["target"]), int(listed["center"])) != NAMES[name]:
                raise ValueError("BODY_ID_MISMATCH:" + name)
            for k, expected in zip(("x", "y", "z"), xyz[name]):
                # Parsed numeric values in the capture round-trip through JSON
                # floats; tolerance is below the printed ephemeris resolution.
                if abs(Decimal(str(listed[k])) - expected) > Decimal("0.000005"):
                    raise ValueError("CAPTURE_RAW_VECTOR_MISMATCH:" + name + "." + k)

        time = Time(2461356.5, format="jd", scale="tdb")
        with solar_system_ephemeris.set("builtin"):
            approx = {
                key: tuple(Decimal(str(x)) for x in get_body_barycentric(key, time).xyz.to_value(u.km))
                for key in ("earth", "moon", "mars")
            }
        results = {}
        for name, (target, origin, direct, origin_body, target_body) in PAIRS.items():
            v = delta(xyz[target], xyz[origin])
            relative = xyz[direct]
            dd = norm(v)
            dd_direct = norm(relative)
            direct_residual = norm(delta(v, relative))
            reference = norm(delta(approx[target_body], approx[origin_body]))
            model_residual = abs(dd - reference)
            model_relative_fraction = model_residual / dd
            # The astropy builtin ERFA approximation is different from the
            # Horizons numerical solution. 2% is a loose sanity bound, NOT
            # an accuracy guarantee, and is never used as a substitute source.
            if direct_residual > Decimal("0.01"):
                raise ValueError("DIRECT_RELATIVE_DISAGREEMENT:" + name)
            if model_relative_fraction > Decimal("0.02"):
                raise ValueError("ASTROPY_APPROXIMATION_DISAGREEMENT:" + name)
            if abs(dd - Decimal(str(record["direct_relative_consistency"][name]["barycentric_subtraction_km"]))) > Decimal("0.0001"):
                raise ValueError("CAPTURE_DISTANCE_DISAGREEMENT:" + name)
            results[name] = {
                "direct_jpl_barycentric_3d_km": float(dd),
                "direct_jpl_relative_3d_km": float(dd_direct),
                "jpl_vector_crosscheck_residual_km": float(direct_residual),
                "astropy_builtin_approximate_3d_km": float(reference),
                "astropy_builtin_residual_km": float(model_residual),
                "astropy_builtin_relative_residual_fraction": float(model_relative_fraction),
            }

    report = {
        "schema": "zenith.horizons.gate5.audit.v1",
        "status": "LOCAL_ARITHMETIC_AND_APPROXIMATE_MODEL_COMPARISON_PASSED",
        "results": results,
        "comparison": "JPL Horizons direct relative vectors + source-separated Decimal arithmetic + Astropy builtin ERFA approximations",
        "independence_limit": "Both Horizons query modes rely on JPL. Astropy builtin uses an approximate analytical model, not a second authenticated observational source.",
        "external_custody": "NOT_ATTESTED",
        "utc_clock": "UNATTESTED",
        "productionAuthority": "NONE",
        "github_commit": os.environ.get("GITHUB_SHA", "LOCAL_UNATTESTED"),
    }
    receipt = BASE / "independent_arithmetic_crosscheck.json"
    receipt.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("GATE5_ARITHMETIC_ASTROPY_CROSSCHECK_OK", json.dumps(results, sort_keys=True), flush=True)
    print("CROSSCHECK_RECEIPT_SHA256", hashlib.sha256(receipt.read_bytes()).hexdigest())
    return report


if __name__ == "__main__":
    try:
        check()
    except Exception as exc:
        print("GATE5_CROSSCHECK_FAILED", type(exc).__name__, str(exc)[:450], file=sys.stderr)
        raise
