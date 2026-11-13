#!/usr/bin/env python3
"""Mars-center 499 ephemeris cross-check at four independent TDB epochs.

Fetches real HTTPS Horizons VECTORS states for 399/301/4/499, and compares
against CSPICE spkezr using DE440s + MAR099s kernels. Source code is
independent of browser math; dynamical provenance is still shared JPL.
All numerical results remain RESEARCH_ONLY, never production authorization.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
DE440 = "https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp"
MAR099S = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/mar099s.bsp"
OUT = Path("artifacts/mars499-multiepoch")
EPOCHS = (2461355.5, 2461356.5, 2461357.5, 2461360.5)
TARGETS = {"earth":399, "moon":301, "mars_barycenter":4, "mars_center":499}
POSITION_TOLERANCE_KM = 1.0
VELOCITY_TOLERANCE_KM_S = 1e-4
MAX_JSON_BYTES = 1_000_000
MAX_DE440_BYTES = 40_000_000
MAX_MAR099_BYTES = 85_000_000
# Post-first-run custody pins: captured genuine bytes on 2026-11-12.
# They are frozen for subsequent replay, not falsely called preregistered.
EXPECTED_KERNEL_SHA256 = {
    "de440s": "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2",
    "mar099s": "997dc93ba640e476da7a494d2237dcdeb145e528db37be8ccee588c615e4e1ff",
}
J2000_JD = 2451545.0
DAY_SEC = 86400.0
VALUE = r"([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)"
XYZ = re.compile(r"^\s*X\s*=\s*"+VALUE+r"\s+Y\s*=\s*"+VALUE+r"\s+Z\s*=\s*"+VALUE+r"\s*$", re.M)
VXYZ = re.compile(r"^\s*VX\s*=\s*"+VALUE+r"\s+VY\s*=\s*"+VALUE+r"\s+VZ\s*=\s*"+VALUE+r"\s*$", re.M)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def fetch(url, cap):
    req = urllib.request.Request(url, headers={"User-Agent":"ZENITH-Mars499-ResearchGate/0.1"})
    with urllib.request.urlopen(req, timeout=110) as response:
        if response.status != 200:
            raise ValueError("NON_200_HTTP")
        data = response.read(cap+1)
    if not data or len(data)>cap:
        raise ValueError("INVALID_RESPONSE_SIZE")
    return data

def request_vector(body, jd):
    params = {
        "format":"json", "COMMAND":f"'{body}'", "OBJ_DATA":"NO",
        "MAKE_EPHEM":"YES", "EPHEM_TYPE":"VECTORS", "CENTER":"'500@0'",
        "REF_SYSTEM":"ICRF", "REF_PLANE":"FRAME", "VEC_CORR":"NONE",
        "OUT_UNITS":"KM-S", "VEC_TABLE":"2", "VEC_LABELS":"YES",
        "CSV_FORMAT":"NO", "TIME_TYPE":"TDB", "TLIST":f"'{jd:.9f}'",
        "TLIST_TYPE":"JD", "CAL_FORMAT":"BOTH"
    }
    url=API+"?"+urllib.parse.urlencode(params)
    raw=fetch(url, MAX_JSON_BYTES)
    parsed=json.loads(raw)
    if "error" in parsed or parsed.get("signature",{}).get("source")!="NASA/JPL Horizons API":
        raise ValueError("NOT_EXPECTED_HORIZONS_RESPONSE")
    if not isinstance(parsed.get("result"),str):
        raise ValueError("NO_VECTOR_TEXT")
    return url,raw,parsed["result"]

def read_state(text, target, expected_jd):
    hdr,end=text.split("$$SOE",1) if text.count("$$SOE")==1 else (None,None)
    if hdr is None or end.count("$$EOE")!=1:
        raise ValueError("MISSING_OR_DUPLICATE_MARKER")
    block=end.split("$$EOE",1)[0]
    target_header=re.findall(r"^Target body name:\s*[^\r\n]*\(\s*(\d+)\s*\)",hdr,re.M)
    if len(target_header)!=1 or int(target_header[0])!=target:
        raise ValueError("TARGET_ID_MISMATCH")
    center=re.findall(r"^Center body name:\s*([^\r\n]+)",hdr,re.M)
    if len(center)!=1 or not re.search(r"Solar System Barycenter\s*\(\s*0\s*\)",center[0],re.I):
        raise ValueError("CENTER_MISMATCH")
    for marker,pattern in {
        "UNITS":r"^Output units\s*:\s*KM-S\s*$",
        "FRAME":r"^Reference frame\s*:\s*ICRF(?:/J2000\.0)?\s*$",
        "CORRECTION":r"^Output type\s*:\s*GEOMETRIC\s+cartesian\s+states\s*$"
    }.items():
        if len(re.findall(pattern,hdr,re.M|re.I))!=1:
            raise ValueError(marker+"_MISMATCH")
    if not re.search(r"^\s*JDTDB\s*$",hdr,re.M):
        raise ValueError("NO_TDB_HEADER")
    times=re.findall(r"^\s*(\d{7}\.\d+)\s*=\s*[^\r\n]*\bTDB\s*$",block,re.M)
    if len(times)!=1 or abs(float(times[0])-expected_jd)>1e-8:
        raise ValueError("TDB_EPOCH_MISMATCH")
    if len(re.findall(r"^\s*\d{7}\.\d+\s*=",block,re.M))!=1:
        raise ValueError("AMBIGUOUS_EPOCH")
    x,v=XYZ.findall(block),VXYZ.findall(block)
    if len(x)!=1 or len(v)!=1:
        raise ValueError("POSITION_VELOCITY_COUNT")
    state=tuple(float(z) for z in (*x[0],*v[0]))
    if not all(math.isfinite(n) and abs(n)<1e13 for n in state):
        raise ValueError("NONFINITE_STATE")
    return state

def validated_paths():
    OUT.mkdir(parents=True,exist_ok=True)
    binaries={}
    for label,url,limit in (
       ("de440s", DE440,MAX_DE440_BYTES),("mar099s",MAR099S,MAX_MAR099_BYTES)):
        raw=fetch(url,limit)
        actual_sha=sha(raw)
        if actual_sha!=EXPECTED_KERNEL_SHA256[label]:
            raise ValueError("SOURCE_KERNEL_SHA256_CHANGED_"+label.upper())
        path=OUT/(label+".bsp")
        path.write_bytes(raw)
        binaries[label]={"url":url,"sha256":actual_sha,"bytes":len(raw)}
    return binaries

def distance(a,b):
    return math.sqrt(math.fsum((x-y)**2 for x,y in zip(a,b)))

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    receipt={"status":"ABSTAIN_NOT_RUN","productionAuthority":"NONE",
       "referenceFrame":"ICRF/J2000","referencePlane":"FRAME_requested_not_independently_attested",
       "timeScale":"TDB","positionUnit":"km","velocityUnit":"km/s",
       "epochs_jd_tdb":list(EPOCHS),"position_tolerance_km":POSITION_TOLERANCE_KM,
       "velocity_tolerance_km_s":VELOCITY_TOLERANCE_KM_S,
       "horizons_raw":{},"kernel":{},"comparisons":[]}
    try:
        import spiceypy as spice
        states={}
        for jd in EPOCHS:
            states[jd]={}
            for name,body in TARGETS.items():
                url,raw,text=request_vector(body,jd)
                filename=f"{name}_{jd:.1f}.json"
                (OUT/filename).write_bytes(raw)
                states[jd][name]=read_state(text,body,jd)
                receipt["horizons_raw"][filename]={"sha256":sha(raw),"bytes":len(raw),
                   "target":body,"jd_tdb":jd,"request_url":url}
        receipt["kernel"]=validated_paths()
        try:
            spice.kclear()
            spice.furnsh(str(OUT/"de440s.bsp"))
            spice.furnsh(str(OUT/"mar099s.bsp"))
            mars_kernel_ids=set(int(i) for i in spice.spkobj(str(OUT/"mar099s.bsp")))
            if 499 not in mars_kernel_ids:
                raise ValueError("MARS499_KERNEL_SEGMENT_MISSING")
            receipt["mar099s_target_ids"]=sorted(mars_kernel_ids)
            all_ok=True
            for jd in EPOCHS:
                moment=(jd-J2000_JD)*DAY_SEC
                row={"jd_tdb":jd,"bodies":{}}
                for name,body in TARGETS.items():
                    state,light_time=spice.spkezr(str(body),moment,"J2000","NONE","0")
                    real=states[jd][name]
                    calc=tuple(float(x) for x in state)
                    error_pos=distance(real[:3],calc[:3])
                    error_vel=distance(real[3:],calc[3:])
                    ok=error_pos<=POSITION_TOLERANCE_KM and error_vel<=VELOCITY_TOLERANCE_KM_S
                    row["bodies"][name]={"target":body,"horizons_state_km_kms":real,
                        "spice_state_km_kms":calc,"position_residual_km":error_pos,
                        "velocity_residual_km_s":error_vel,"pass":ok}
                    all_ok=all_ok and ok
                e=states[jd]["earth"][:3]; m=states[jd]["moon"][:3]; mars=states[jd]["mars_center"][:3]
                row["instantaneous_center_distances_km"]={
                    "earth_moon":distance(e,m),"earth_mars":distance(e,mars),
                    "moon_mars":distance(m,mars)}
                receipt["comparisons"].append(row)
            if not all_ok:
                raise ValueError("POSITION_OR_VELOCITY_RESIDUAL_EXCEEDED_GATE")
            receipt["status"]="PASS_JPL_KERNEL_NUMERICAL_MARS499_MULTIEPOCH"
        finally:
            spice.kclear()
    except Exception as e:
        receipt["status"]="ABSTAIN_GATE_FAILURE"
        receipt["error_type"]=type(e).__name__
        receipt["error"]=str(e)[:600]
    finally:
        # Kernel downloads are large: retain exact hashes, but publish only the
        # raw API requests, metadata, and bounded receipt artifact.
        (OUT/"receipt.json").write_text(json.dumps(receipt,sort_keys=True,indent=2)+"\n")
        print(json.dumps({"status":receipt["status"],"error":receipt.get("error"),
                          "epochs":len(receipt["comparisons"]),
                          "mars_center_residuals":[
                            {"jd":r["jd_tdb"],
                             "position_km":r["bodies"]["mars_center"]["position_residual_km"],
                             "velocity_km_s":r["bodies"]["mars_center"]["velocity_residual_km_s"]}
                            for r in receipt["comparisons"] if "mars_center" in r["bodies"]],
                          "kernel":receipt["kernel"]},sort_keys=True,indent=2))
    return 0 if receipt["status"]=="PASS_JPL_KERNEL_NUMERICAL_MARS499_MULTIEPOCH" else 1

if __name__=="__main__":
    sys.exit(run())
