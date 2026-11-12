#!/usr/bin/env python3
"""Read-only scientific replay of five frozen Swiss Ephemeris Moshier samples.

Requires pyswisseph 2.10.3.2 (library swisseph.version 2.10.03).
Does NOT write into the source catalog. Replays on a separate Python runtime.
This is not JPL Horizons or independent physical metrology.
"""
import datetime as dt
import json
import math
import pathlib
import sys

try:
    import swisseph as swe
except ImportError as exc:
    raise SystemExit("ABSTAIN: pyswisseph missing; install in isolated research environment") from exc

AU_KM = 149597870.7
ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/data/earth-moon-mars-2026-moshier.json"
flags = swe.FLG_MOSEPH | swe.FLG_HELCTR | swe.FLG_XYZ | swe.FLG_EQUATORIAL
if swe.version != "2.10.03":
    raise SystemExit(f"ABSTAIN: expected Swiss Ephemeris 2.10.03, got {swe.version}")
catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
for row in catalog["epochs"]:
    epoch = dt.datetime.strptime(row["utc"], "%Y-%m-%dT%H:%M:%SZ")
    jd = swe.julday(epoch.year, epoch.month, epoch.day, 0.0)
    for name, body in [("earth", swe.EARTH), ("moon", swe.MOON), ("mars", swe.MARS)]:
        xyz, actual_flags = swe.calc_ut(jd, body, flags)
        if actual_flags & swe.FLG_MOSEPH == 0:
            raise SystemExit(f"ABSTAIN: unexpected ephemeris backend for {name}")
        expected = row[name]
        errors = [abs(x * AU_KM - expected[i]) for i, x in enumerate(xyz[:3])]
        if max(errors) > 0.005:
            raise SystemExit(f"FAIL {row['utc']} {name}: max coordinate error {max(errors)} km")
    em = math.dist(row["earth"], row["moon"])
    er = math.dist(row["earth"], row["mars"])
    mr = math.dist(row["moon"], row["mars"])
    print(f"{row['utc']} Earth-Moon {em:.3f} km; Earth-Mars {er:.3f} km; Moon-Mars {mr:.3f} km")
print(f"REPLAY_PASS: {len(catalog['epochs'])} epochs x 3 bodies; Swiss Ephemeris {swe.version} Moshier")
