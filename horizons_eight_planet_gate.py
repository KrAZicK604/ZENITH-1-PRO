"""Fail-closed Horizons vector comparison for all eight planet centers.

Consumes externally obtained, date-matched Horizons JSON *results*.
No network, no automatic trust in synthetic/local fixtures, no production authority.
"""
import math
import re
from planet_distance_math import PLANETS, position_km, AU_KM

BODY_IDS = {"Mercury": 199, "Venus": 299, "Earth": 399, "Mars": 499,
            "Jupiter": 599, "Saturn": 699, "Uranus": 799, "Neptune": 899}
_NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?"
_VECTOR = re.compile(
    r"X\s*=\s*("+_NUMBER+r")\s+Y\s*=\s*("+_NUMBER+
    r")\s+Z\s*=\s*("+_NUMBER+r")")
_DATE = re.compile(r"^\s*\d+\.\d+\s*=\s*(.+?)\s*$")


def parse_horizons_vector(text, expected_body_id, expected_epoch):
    """Require exact target, SSB center, km output and exactly one vector epoch."""
    if not isinstance(text, str) or len(text) > 1_000_000:
        raise ValueError("missing or oversized Horizons text")
    if not isinstance(expected_epoch, str) or not expected_epoch:
        raise ValueError("missing epoch")
    if not re.search(r"Target body name:\s*[^\n]*\(\s*"+str(expected_body_id)+r"\s*\)", text):
        raise ValueError("target center mismatch")
    if not re.search(r"Center body name:\s*Solar System Barycenter\s*\(\s*0\s*\)", text, re.I):
        raise ValueError("origin mismatch")
    if "Output units    : KM-S" not in text and "Output units : KM-S" not in text:
        raise ValueError("units must be KM-S")
    if "Reference frame : ICRF" not in text and "Reference frame: ICRF" not in text:
        raise ValueError("frame must be ICRF")
    if text.count("$$SOE") != 1 or text.count("$$EOE") != 1:
        raise ValueError("missing or ambiguous ephemeris delimiters")
    section=text.split("$$SOE",1)[1].split("$$EOE",1)[0]
    matches=_VECTOR.findall(section)
    dates=[m.group(1) for line in section.splitlines() if (m:=_DATE.match(line))]
    if len(matches)!=1 or len(dates)!=1 or dates[0]!=expected_epoch:
        raise ValueError("epoch or vector count mismatch")
    values=tuple(float(v) for v in matches[0])
    if not all(math.isfinite(v) and abs(v)<1e12 for v in values):
        raise ValueError("nonfinite or implausible vector")
    return values


def compare_eight(raw_by_body, epoch, model_days, phases=None):
    """Return measured model-vs-Horizons discrepancies, not a pass certification.

    Model phases must be separately fixed; zero phases are arbitrary and cannot
    represent a date-specific ephemeris. External provenance is NOT verified.
    """
    if not isinstance(raw_by_body, dict) or set(raw_by_body)!=set(BODY_IDS):
        raise ValueError("exactly eight planet-center reports required")
    if not isinstance(model_days,(int,float)) or not math.isfinite(model_days):
        raise ValueError("invalid model time")
    if phases is None or set(phases)!=set(BODY_IDS):
        raise ValueError("explicit eight-body phase calibration required")
    results={}
    for name, body_id in BODY_IDS.items():
        p=parse_horizons_vector(raw_by_body[name],body_id,epoch)
        phase=phases[name]
        if not isinstance(phase,(int,float)) or not math.isfinite(phase):
            raise ValueError("invalid phase")
        approx=position_km(name,model_days,phase)
        results[name]={"horizons_xyz_km":p,
                       "model_xy_km":approx,
                       "xy_error_km":math.hypot(approx[0]-p[0],approx[1]-p[1]),
                       "reference_radius_km":math.sqrt(sum(v*v for v in p)),
                       "model_is_2d":True}
    return results


def pairwise_distances(vectors):
    """28 unique true 3D geometric separations for eight shared-frame vectors."""
    if set(vectors)!=set(BODY_IDS):
        raise ValueError("eight complete bodies required")
    result={}
    names=list(BODY_IDS)
    for i,a in enumerate(names):
        for b in names[i+1:]:
            va,vb=vectors[a],vectors[b]
            if len(va)!=3 or len(vb)!=3 or not all(math.isfinite(v) for v in (*va,*vb)):
                raise ValueError("invalid 3D vector")
            result[a+"—"+b]=math.dist(va,vb)
    return result
