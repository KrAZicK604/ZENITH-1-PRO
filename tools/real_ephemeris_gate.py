#!/usr/bin/env python3
"""Read-only, provenance-explicit Horizons capture; never invent coordinates.

Gate 5 fixed event: JD(TDB)=2461356.500000000 (2026-11-12 00:00:00 TDB).
Queries Horizons six times: 399, 301, 499 barycentric plus three
independent-request relative vectors. The latter is an internal consistency
crosscheck of the SAME NASA/JPL Horizons engine, not an independent oracle.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time
import urllib.parse
import urllib.request

JD_TDB = 2461356.5
JULIAN_TEXT = "2461356.500000000"
OUTPUT = Path("evidence/gate5")
ENDPOINT = "https://ssd.jpl.nasa.gov/api/horizons.api"
CASES = (
    ("earth_barycentric", 399, "500@0", 0),
    ("moon_barycentric", 301, "500@0", 0),
    ("mars_barycentric", 499, "500@0", 0),
    ("moon_from_earth", 301, "500@399", 399),
    ("mars_from_earth", 499, "500@399", 399),
    ("mars_from_moon", 499, "500@301", 301),
)
MAX_RESPONSE = 250_000


def query_params(target: int, center: str) -> dict[str, str]:
    return {
        "format": "json",
        "COMMAND": "'%s'" % target,
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'VECTORS'",
        "CENTER": "'%s'" % center,
        "REF_PLANE": "'FRAME'",
        "REF_SYSTEM": "'ICRF'",
        "VEC_TABLE": "'2'",
        "VEC_LABELS": "'YES'",
        "CSV_FORMAT": "'NO'",
        "VEC_CORR": "'NONE'",
        "OUT_UNITS": "'KM-S'",
        "TIME_TYPE": "'TDB'",
        "TLIST_TYPE": "'JD'",
        "TLIST": "'%s'" % JULIAN_TEXT,
    }


def fetch(target: int, center: str) -> tuple[str, str, str]:
    params = query_params(target, center)
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "ZENITH-Mars-Race-Research-Gate5/1.0",
                 "Accept": "application/json"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=35) as response:
        if response.status != 200:
            raise ValueError("HORIZONS_HTTP_" + str(response.status))
        rawbytes = response.read(MAX_RESPONSE + 1)
        if len(rawbytes) > MAX_RESPONSE:
            raise ValueError("HORIZONS_RESPONSE_TOO_LARGE")
        content_type = response.headers.get("Content-Type", "")
        if "json" not in content_type.lower():
            raise ValueError("UNEXPECTED_CONTENT_TYPE:" + content_type)
    message = json.loads(rawbytes)
    if message.get("error"):
        raise ValueError("HORIZONS_ERROR: " + str(message["error"])[:300])
    if message.get("signature", {}).get("source") != "NASA/JPL Horizons API":
        raise ValueError("SOURCE_SIGNATURE_FIELD_MISMATCH")
    text = message.get("result")
    if not isinstance(text, str) or not text:
        raise ValueError("MISSING_HORIZONS_RESULT")
    return url, text, hashlib.sha256(rawbytes).hexdigest()


def parse_xyz(text: str, target: int, center_id: int) -> dict:
    if text.count("$$SOE") != 1 or text.count("$$EOE") != 1:
        raise ValueError("WRONG_RECORD_MARKERS")
    head, rest = text.split("$$SOE", 1)
    body, tail = rest.split("$$EOE", 1)
    if "$$SOE" in tail or "$$EOE" in head or "$$EOE" in tail:
        raise ValueError("DUPLICATE_MARKERS")
    target_hdr = re.search(r"^\s*Target body name\s*:\s*[^\r\n]*?\(\s*(\d+)\s*\)", head, re.M | re.I)
    center_hdr = re.search(r"^\s*Center body name\s*:\s*[^\r\n]*?\(\s*(\d+)\s*\)", head, re.M | re.I)
    if not target_hdr or int(target_hdr.group(1)) != target:
        raise ValueError("WRONG_TARGET")
    if not center_hdr or int(center_hdr.group(1)) != center_id:
        raise ValueError("WRONG_CENTER")
    required = {
        "Output units": r"KM-S\b",
        "Reference frame": r"ICRF(?:/J2000\.0)?\b",
        "Output type": r"GEOMETRIC\s+cartesian\s+states\b",
    }
    for label, value in required.items():
        matches = re.findall(r"^\s*" + re.escape(label) + r"\s*:\s*([^\r\n]*)", head, re.M | re.I)
        if len(matches) != 1 or not re.match(value, matches[0].strip(), re.I):
            raise ValueError("INVALID_HEADER_" + label.replace(" ", "_"))
    plane = re.findall(r"^\s*Coordinate\s+(?:systm|system)\s*:\s*([^\r\n]+)", head, re.M | re.I)
    if len(plane) != 1 or not re.match(
        r"(?:Earth Mean Equator and Equinox of Reference Epoch|ICRF equatorial(?: coordinates)?)\b",
        plane[0].strip(), re.I
    ):
        raise ValueError("BAD_OR_MISSING_COORDINATE_PLANE")
    if not re.search(r"^\s*JDTDB\b", head, re.M):
        raise ValueError("MISSING_JDTDB")
    epoch = re.findall(r"^\s*(\d{7}\.\d+)\s*=\s*(?:A\.D\.|B\.C\.).*\bTDB\s*$", body, re.M)
    if len(epoch) != 1 or len(re.findall(r"^\s*\d{7}\.\d+\s*=", body, re.M)) != 1:
        raise ValueError("ONE_TDB_EPOCH_REQUIRED")
    jd = float(epoch[0])
    if abs(jd - JD_TDB) > 1e-10:
        raise ValueError("MISMATCHED_EPOCH")
    number = r"([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)"
    pattern = r"^\s*X\s*=\s*" + number + r"\s+Y\s*=\s*" + number + r"\s+Z\s*=\s*" + number
    xyz = re.findall(pattern, body, re.M | re.I)
    if len(xyz) != 1:
        raise ValueError("ONE_VECTOR_REQUIRED")
    vector = tuple(float(v) for v in xyz[0])
    if not all(math.isfinite(v) and abs(v) < 1e13 for v in vector):
        raise ValueError("NONFINITE_OR_EXTREME_VECTOR")
    return {"target": target, "center": center_id, "jd_tdb": jd,
            "x": vector[0], "y": vector[1], "z": vector[2]}


def subtraction(a: dict, b: dict) -> tuple[float, float, float]:
    return (a["x"] - b["x"], a["y"] - b["y"], a["z"] - b["z"])


def norm(v: tuple[float, float, float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def result_check(rows: dict) -> dict:
    e, m, r = [rows[n] for n in ("earth_barycentric", "moon_barycentric", "mars_barycentric")]
    pairs = {
        "earthMoon": ("moon_from_earth", subtraction(m, e)),
        "earthMars": ("mars_from_earth", subtraction(r, e)),
        "moonMars": ("mars_from_moon", subtraction(r, m)),
    }
    calculations = {}
    for label, (name, predicted) in pairs.items():
        reported = rows[name]
        actual = (reported["x"], reported["y"], reported["z"])
        difference = tuple(a - b for a, b in zip(predicted, actual))
        residual = norm(difference)
        if not math.isfinite(residual) or residual > 0.01:
            raise ValueError("DIRECT_RELATIVE_VECTOR_MISMATCH: " + label + " residual km=" + str(residual))
        calculations[label] = {
            "barycentric_subtraction_km": norm(predicted),
            "direct_relative_range_km": norm(actual),
            "max_coordinate_residual_km": max(abs(v) for v in difference),
            "vector_residual_km": residual,
        }
    return calculations


def capture() -> dict:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    vectors, sources = {}, {}
    for index, (name, target, center, center_id) in enumerate(CASES):
        if index:
            time.sleep(1.1)
        url, raw, response_sha = fetch(target, center)
        data = parse_xyz(raw, target, center_id)
        path = OUTPUT / (name + ".txt")
        path.write_text(raw, encoding="utf-8")
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        vectors[name] = data
        sources[name] = {
            "url": url,
            "raw_file": path.name,
            "text_sha256": sha,
            "http_json_sha256": response_sha,
            "bytes": path.stat().st_size,
        }
        print("HORIZONS_FETCH_OK", name, "JD(TDB)", data["jd_tdb"],
              "XYZ_KM", tuple(data[k] for k in ("x", "y", "z")),
              "sha256", sha, flush=True)
    checks = result_check(vectors)
    record = {
        "schema": "zenith.horizons.gate5.v1",
        "status": "HORIZONS_SOURCE_FORMAT_VALID_DIRECT_RELATIVE_MATCH",
        "epoch": {"jd_tdb": JD_TDB, "calendar_tdb": "2026-11-12T00:00:00 TDB"},
        "center": "500@0",
        "frame": "ICRF",
        "reference_plane": "FRAME",
        "vector_correction": "NONE",
        "units": "KM-S",
        "capture_utc_host_unattested": dt.datetime.now(dt.timezone.utc).isoformat(),
        "github_commit": os.environ.get("GITHUB_SHA", "LOCAL_UNATTESTED"),
        "vectors": vectors,
        "sources": sources,
        "direct_relative_consistency": checks,
        "productionAuthority": "NONE",
        "limitations": [
            "Six requests use the same NASA/JPL Horizons authority and ephemeris family.",
            "TLS response and hashes are not a signed or independently witnessed release receipt.",
            "This snapshot gives distances at one TDB epoch; not trajectory or travel time.",
            "Host UTC clock is not externally attested.",
        ],
    }
    receipt = OUTPUT / "capture.json"
    receipt.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("HORIZONS_3D_DISTANCE_KM", json.dumps({k: v["barycentric_subtraction_km"] for k, v in checks.items()}, sort_keys=True))
    print("CAPTURE_RECEIPT_SHA256", hashlib.sha256(receipt.read_bytes()).hexdigest())
    return record


if __name__ == "__main__":
    try:
        capture()
    except Exception as exc:
        print("GATE5_CAPTURE_FAILED", type(exc).__name__, str(exc)[:450], file=sys.stderr)
        raise
