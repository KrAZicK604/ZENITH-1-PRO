"""Fetch Earth/Moon/Mars geometric JPL Horizons vectors for a fixed time grid.

This script has NO authority to edit GitHub, deploy, access Stripe, or modify
customer data. It prints bounded normalized rows for controlled ingestion.
Fails closed if Horizons cannot provide unambiguous common-frame records.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import math
import re
import sys
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
BEGIN = dt.date(2026, 11, 12)
END = dt.date(2026, 12, 13)
DAYS = (END - BEGIN).days + 1

FIXED = {
    "format": "json",
    "OBJ_DATA": "'NO'",
    "MAKE_EPHEM": "'YES'",
    "EPHEM_TYPE": "'VECTORS'",
    "REF_PLANE": "'FRAME'",
    "REF_SYSTEM": "'ICRF'",
    "VEC_CORR": "'NONE'",
    "TIME_TYPE": "'TDB'",
    "OUT_UNITS": "'KM-S'",
    "CSV_FORMAT": "'YES'",
    "VEC_LABELS": "'NO'",
    "VEC_TABLE": "'2'",
    "START_TIME": "'2026-Nov-12 00:00'",
    "STOP_TIME": "'2026-Dec-13 00:00'",
    "STEP_SIZE": "'1 d'",
}
QUERIES = {
    "moon_earth": {"COMMAND": "'301'", "CENTER": "'500@399'"},
    "mars_earth": {"COMMAND": "'499'", "CENTER": "'500@399'"},
    "mars_moon": {"COMMAND": "'499'", "CENTER": "'500@301'"},
}
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
DATE = re.compile(r"A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})")
JD_LINE = re.compile(r"^\s*\d{7}\.\d+\s*,")


def norm(v):
    return math.sqrt(sum(float(x) * float(x) for x in v))


def subtract(a, b):
    return [a[i] - b[i] for i in range(3)]


def fetch_vectors(kind):
    args = dict(FIXED, **QUERIES[kind])
    url = API + "?" + urllib.parse.urlencode(args)
    request = urllib.request.Request(url, headers={"User-Agent": "ZENITH-ACE-Vector-Research/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError("Horizons response over 2 MB bound")
    if not data:
        raise ValueError("empty Horizons response")
    blob = json.loads(data)
    if "error" in blob:
        raise ValueError("Horizons reported error: " + str(blob["error"])[:300])
    if blob.get("signature", {}).get("source") != "NASA/JPL Horizons API":
        raise ValueError("unrecognized Horizons response signature")
    raw = blob.get("result", "")
    if not isinstance(raw, str) or raw.count("$$SOE") != 1 or raw.count("$$EOE") != 1:
        raise ValueError("missing or repeated Horizons SOE/EOE vector delimiters")
    if ("Target body name: Moon (301)" if kind == "moon_earth" else "Target body name: Mars (499)") not in raw:
        raise ValueError("unexpected target Horizons body")
    expected_center = "Center body name: Moon (301)" if kind == "mars_moon" else "Center body name: Earth (399)"
    if expected_center not in raw:
        raise ValueError("unexpected Horizons vector origin")
    table = raw.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    out = []
    for line in table:
        if not JD_LINE.match(line):
            if line.strip():
                raise ValueError("unexpected nonvector line in Horizons table")
            continue
        cells = [c.strip() for c in line.split(",")]
        if len(cells) < 8:
            raise ValueError("incomplete vector record")
        jd = float(cells[0])
        stamp = DATE.search(cells[1])
        if not stamp:
            raise ValueError("missing unambiguous calendar TDB timestamp")
        yr, mon, day, hour, minute, second = stamp.groups()
        if mon not in MONTHS or (hour, minute, second) != ("00", "00", "00"):
            raise ValueError("nonmidnight Horizons TDB record")
        date = dt.date(int(yr), MONTHS.index(mon) + 1, int(day))
        row = [float(c) for c in cells[2:8]]
        if len(row) != 6 or not all(map(math.isfinite, row)):
            raise ValueError("nonfinite or incomplete JPL state vector")
        if max(abs(x) for x in row[:3]) > 500_000_000 or max(abs(x) for x in row[3:]) > 200:
            raise ValueError("physically unexpected JPL state magnitude")
        out.append({"day": date.isoformat(), "jdTDB": jd, "positionKM": row[:3], "velocityKMPS": row[3:]})
    if len(out) != DAYS:
        raise ValueError(f"expected {DAYS} JPL records for {kind}, got {len(out)}")
    for i, item in enumerate(out):
        if item["day"] != (BEGIN + dt.timedelta(days=i)).isoformat():
            raise ValueError("nonsequential Horizons date records")
    return out, {"query": args, "url": url, "responseSHA256": hashlib.sha256(data).hexdigest()}


def run():
    sets = {}
    sources = {}
    for kind in QUERIES:
        sets[kind], sources[kind] = fetch_vectors(kind)
    data = []
    for i in range(DAYS):
        moon = sets["moon_earth"][i]
        mars = sets["mars_earth"][i]
        direct = sets["mars_moon"][i]
        if not all(abs(moon["jdTDB"] - item["jdTDB"]) < 1e-8 for item in [mars, direct]):
            raise ValueError("vector epochs are not identical")
        rm, rr = moon["positionKM"], mars["positionKM"]
        d_emoon = norm(rm)
        d_emars = norm(rr)
        d_mmoon = norm(subtract(rr, rm))
        independently_queried_d_mmoon = norm(direct["positionKM"])
        err = abs(d_mmoon - independently_queried_d_mmoon)
        if err > .01:
            raise ValueError(f"Moon-to-Mars subtraction disagrees with direct JPL query: {err} km")
        if not 325_000 < d_emoon < 440_000:
            raise ValueError("Earth-Moon range outside plausible ephemeris bounds")
        if not 50_000_000 < d_emars < 430_000_000:
            raise ValueError("Earth-Mars range outside plausible ephemeris bounds")
        if not abs(d_emars - d_emoon) <= d_mmoon <= d_emars + d_emoon + .01:
            raise ValueError("triangle inequality violated")
        data.append({
            "dateTDB": moon["day"],
            "julianDateTDB": moon["jdTDB"],
            "earthToMoonKM": rm,
            "earthToMarsKM": rr,
            "moonVelocityKMPS": moon["velocityKMPS"],
            "marsVelocityKMPS": mars["velocityKMPS"],
            "distancesKM": {
                "earthMoon": d_emoon, "earthMars": d_emars, "moonMars": d_mmoon
            },
            "moonMarsIndependentCheckKM": independently_queried_d_mmoon,
        })
    meta = {
        "authority": "NASA/JPL Horizons API",
        "scope": "2026-11-12 through 2026-12-13 at 00:00 TDB daily",
        "frame": "ICRF FRAME, geometric, common Earth-center 399 origin",
        "center": "500@399 (Earth geocenter at 0,0,0)",
        "moonId": 301, "marsId": 499,
        "distanceUnit": "km", "velocityUnit": "km/s",
        "method": "three Horizons vector queries, direct Moon-relative Mars cross-check",
        "limitations": "daily samples; not live positions between epochs; straight-line centers, not trajectories or travel times",
        "sources": sources,
    }
    print("NAV_META:" + json.dumps(meta, separators=(",", ":"), sort_keys=True))
    for row in data:
        print("NAV_ROW:" + json.dumps(row, separators=(",", ":"), sort_keys=True))
    print("NAV_DONE:" + json.dumps({
        "count": len(data), "first": data[0]["dateTDB"], "last": data[-1]["dateTDB"],
        "maxDirectCrosscheckErrorKM": max(abs(x["distancesKM"]["moonMars"] -
                                             x["moonMarsIndependentCheckKM"]) for x in data),
        "startDistancesKM": data[0]["distancesKM"],
        }, separators=(",", ":"), sort_keys=True))


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        print("NAV_FAIL:" + type(exc).__name__ + ":" + str(exc)[:500], file=sys.stderr)
        raise SystemExit(2)
