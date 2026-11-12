#!/usr/bin/env python3
"""Fail-closed REAL Horizons acquisition with separate Skyfield DE440s check.

No gameplay or production writes. Output is evidence only, never flight authorization.
All raw API results are preserved byte-for-byte with SHA-256 hashes.
"""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

EPOCH = "2461356.500000000"  # fixed TDB Julian date; not "current time"
API = "https://ssd.jpl.nasa.gov/api/horizons.api"
KERNEL_URL = "https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp"
ROOT = Path("artifacts/real-horizons-gate")
TARGETS = {"earth": 399, "moon": 301, "mars": 499, "mars_barycenter": 4}
MAX_RESPONSE = 750_000
MAX_KERNEL = 40_000_000
TIMEOUT = 35
THRESHOLD_KM = 0.5

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def download(url, cap):
    req = urllib.request.Request(url, headers={"User-Agent": "ZENITH-Research-Ephemeris-Gate/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        if r.status != 200:
            raise ValueError("HTTP_NON_200")
        data = r.read(cap + 1)
    if len(data) > cap or not data:
        raise ValueError("DOWNLOAD_SIZE_INVALID")
    return data

def horizons(body):
    params = {
        "format": "json", "COMMAND": "'%s'" % body, "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES", "EPHEM_TYPE": "VECTORS",
        "CENTER": "'500@0'", "REF_PLANE": "FRAME",
        "REF_SYSTEM": "ICRF", "VEC_CORR": "NONE",
        "OUT_UNITS": "KM-S", "VEC_TABLE": "2",
        "VEC_LABELS": "YES", "CSV_FORMAT": "NO",
        "TIME_TYPE": "TDB", "TLIST": "'%s'" % EPOCH,
        "TLIST_TYPE": "JD", "CAL_FORMAT": "BOTH"
    }
    url = API + "?" + urllib.parse.urlencode(params)
    raw = download(url, MAX_RESPONSE)
    data = json.loads(raw)
    if "error" in data:
        raise ValueError("HORIZONS_API_ERROR: " + str(data["error"])[:180])
    if data.get("signature", {}).get("source") != "NASA/JPL Horizons API":
        raise ValueError("HORIZONS_SIGNATURE_METADATA_UNEXPECTED")
    if not isinstance(data.get("result"), str):
        raise ValueError("HORIZONS_RESULT_MISSING")
    return url, raw, data["result"]

def parse(raw, body):
    target = re.search(r"^Target body name:\s*[^\r\n]*\(\s*(\d+)\s*\)", raw, re.M)
    center = re.search(r"^Center body name:\s*([^\r\n]+)", raw, re.M)
    if not target or int(target.group(1)) != body:
        raise ValueError("WRONG_TARGET")
    if not center or not re.search(r"Solar System Barycenter\s*\(\s*0\s*\)", center.group(1), re.I):
        raise ValueError("WRONG_CENTER")
    checks = {
        "units": r"^Output units\s*:\s*KM-S\s*$",
        "geometric": r"^Output type\s*:\s*GEOMETRIC\s+cartesian\s+states\s*$",
        "icrf": r"^Reference frame\s*:\s*ICRF(?:/J2000\.0)?\s*$",
        "equatorial": r"^Coordinate\s+(?:systm|system)\s*:\s*(?:Earth Mean Equator and Equinox of Reference Epoch|ICRF equatorial(?: coordinates)?)\s*$",
        "tdb": r"^\s*JDTDB\s*$",
    }
    for label, pattern in checks.items():
        if len(re.findall(pattern, raw, re.M | re.I)) != 1:
            raise ValueError("UNVERIFIED_" + label.upper())
    if raw.count("$$SOE") != 1 or raw.count("$$EOE") != 1:
        raise ValueError("WRONG_MARKERS")
    block = raw.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    epoch_lines = re.findall(r"^\s*(\d{7}\.\d+)\s*=\s*[^\r\n]*\bTDB\s*$", block, re.M)
    if len(epoch_lines) != 1 or abs(float(epoch_lines[0]) - float(EPOCH)) > 1e-8:
        raise ValueError("WRONG_EPOCH")
    number = r"([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)"
    vectors = re.findall(r"^\s*X\s*=\s*" + number + r"\s+Y\s*=\s*" + number + r"\s+Z\s*=\s*" + number + r"\s*$", block, re.M)
    if len(vectors) != 1:
        raise ValueError("WRONG_VECTOR_COUNT")
    xyz = tuple(map(float, vectors[0]))
    if not all(math.isfinite(v) and abs(v) < 1e13 for v in xyz):
        raise ValueError("NONFINITE_VECTOR")
    return xyz

def dist(a, b):
    return math.dist(a, b)

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    receipt = {"status": "ABSTAIN_NOT_YET_VERIFIED", "productionAuthority": "NONE",
               "epoch_jd_tdb": EPOCH, "source": "NASA/JPL Horizons API",
               "kernel": KERNEL_URL, "request_hashes": {}, "comparisons": {}}
    try:
        vectors = {}
        for name, body in TARGETS.items():
            url, raw, result = horizons(body)
            (ROOT / (name + ".json")).write_bytes(raw)
            receipt["request_hashes"][name] = {"sha256": sha(raw), "url": url, "bytes": len(raw)}
            vectors[name] = parse(result, body)
        from skyfield.api import load, load_file
        kernel_raw = download(KERNEL_URL, MAX_KERNEL)
        (ROOT / "de440s.bsp").write_bytes(kernel_raw)
        receipt["kernel_sha256"] = sha(kernel_raw)
        eph = load_file(str(ROOT / "de440s.bsp"))
        ts = load.timescale()
        t = ts.tdb_jd(float(EPOCH))
        # Kernel states use a different implementation, but both sources are
        # ultimately JPL dynamical ephemerides; this is NOT external custody.
        for name, key in (("earth", "earth"), ("moon", "moon"), ("mars_barycenter", "mars barycenter")):
            sky = eph[key].at(t).position.km
            actual = tuple(float(x) for x in sky)
            delta = dist(vectors[name], actual)
            receipt["comparisons"][name] = {"horizons_xyz_km": vectors[name],
                                             "de440s_xyz_km": actual, "residual_km": delta,
                                             "pass": delta <= THRESHOLD_KM}
        distances = {pair: dist(vectors[a], vectors[b]) for pair, a, b in
                     (("earth_moon", "earth", "moon"), ("earth_mars", "earth", "mars"),
                      ("moon_mars", "moon", "mars"))}
        receipt["distances_km"] = distances
        # DE440s only has the Mars-system barycenter, not the Mars 499
        # center. Never silently substitute Mars barycenter for Mars center.
        receipt["mars_center_independent_check"] = "ABSTAIN_NO_MARS_CENTER_KERNEL"
        receipt["status"] = ("PARTIAL_INDEPENDENT_NUMERICAL_CROSSCHECK"
                             if all(x["pass"] for x in receipt["comparisons"].values())
                             else "ABSTAIN_NUMERICAL_MISMATCH")
        receipt["productionAuthority"] = "NONE"
    except Exception as e:
        receipt["status"] = "ABSTAIN_FETCH_OR_PARSE_OR_KERNEL_FAILURE"
        receipt["error_type"] = type(e).__name__
        receipt["error"] = str(e)[:300]
    finally:
        (ROOT / "receipt.json").write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
        print(json.dumps({k: v for k, v in receipt.items() if k not in ("request_hashes",)}, indent=2))
    # Partial results cannot authorize game integration.
    return 0 if receipt["status"] == "PARTIAL_INDEPENDENT_NUMERICAL_CROSSCHECK" else 1

if __name__ == "__main__":
    sys.exit(main())
