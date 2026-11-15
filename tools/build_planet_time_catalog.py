#!/usr/bin/env python3
"""Build a finite, real-date planet ephemeris catalogue from NAIF SPICE.
Read-only: writes a JSON artifact; never deploys or modifies the game.
All state vectors share barycentric J2000/ICRF axes, km and km/s.
The four earlier external Horizons-vs-CSPICE anchor comparisons are separate
and must not be misrepresented as independent observatory calibration.
"""
import base64
import gzip
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import sys
import urllib.request
import zipfile

ROOT=Path("artifacts/planet-time")
BEGIN=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
END=dt.datetime(2027,3,1,tzinfo=dt.timezone.utc)
STEP_SECONDS=12*3600
JPL_DE440="https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp"
JPL_MAR099="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/mar099s.bsp"
JPL_LSK="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls"
KNOWN={
 "de440s.bsp":("c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2",40_000_000,JPL_DE440),
 "mar099s.bsp":("997dc93ba640e476da7a494d2237dcdeb145e528db37be8ccee588c615e4e1ff",80_000_000,JPL_MAR099),
 "naif0012.tls":("678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b",80_000,JPL_LSK),
}
TARGETS=[
 {"id":"sun","name":"Sun","naif":10,"kind":"body_center","radiusKm":696340,"color":"#ffdc85"},
 {"id":"mercury","name":"Mercury","naif":1,"kind":"system_barycenter","radiusKm":2439.7,"color":"#a8a8a1"},
 {"id":"venus","name":"Venus","naif":2,"kind":"system_barycenter","radiusKm":6051.8,"color":"#ecd8ab"},
 {"id":"earth","name":"Earth","naif":399,"kind":"body_center","radiusKm":6371,"color":"#378bef"},
 {"id":"moon","name":"Moon","naif":301,"kind":"body_center","radiusKm":1737.4,"color":"#bcc9d3"},
 {"id":"mars","name":"Mars","naif":499,"kind":"body_center","radiusKm":3389.5,"color":"#de7655"},
 {"id":"jupiter","name":"Jupiter","naif":5,"kind":"system_barycenter","radiusKm":69911,"color":"#d5ad8a"},
 {"id":"saturn","name":"Saturn","naif":6,"kind":"system_barycenter","radiusKm":58232,"color":"#e7c38d"},
 {"id":"uranus","name":"Uranus","naif":7,"kind":"system_barycenter","radiusKm":25362,"color":"#9ce8f3"},
 {"id":"neptune","name":"Neptune","naif":8,"kind":"system_barycenter","radiusKm":24622,"color":"#497dd2"},
]
ANCHORS=[2461355.5,2461356.5,2461357.5,2461360.5]
ANCHOR_KM={
 "earth":[(98526145.164,100679572.557,43656870.943),(96549668.2525,102228807.201,44328393.277),
          (94543659.831,103746461.216,44986206.719),(88354866.016,108105138.783,46875339.093)],
 "moon":[(98372258.692,100353665.896,43478244.458),(96475957.1058,101878183.196,44141362.636),
         (94553298.058,103386948.206,44799237.599),(88596161.660,107813810.996,46737127.668)],
 "mars":[(-62893555.162,209291632.223,97721484.365),(-64831763.0967,208929680.543,97607731.647),
         (-66765350.783,208552750.396,97486983.965),(-72537103.198,207332642.841,97082990.323)]
}
MAX_ERROR_KM=10.
MAX_VELOCITY_ERROR_KM_S=.001
def sha(raw):
 return hashlib.sha256(raw).hexdigest()
def obtain(url,limit):
 req=urllib.request.Request(url,headers={"User-Agent":"ZENITH-Research-Planet-Catalog/1.0"})
 with urllib.request.urlopen(req,timeout=120) as response:
  if response.status!=200:raise ValueError("HTTP_NOT_200")
  data=response.read(limit+1)
 if not data or len(data)>limit:raise ValueError("INVALID_KERNEL_SIZE")
 return data
def compact(number):
 if not math.isfinite(float(number)):raise ValueError("NONFINITE_EPHEMERIS")
 return float(format(float(number),".13g"))
def hermite(x0,x1,u,seconds):
 p0,p1=x0[:3],x1[:3]
 v0,v1=x0[3:],x1[3:]
 h00=2*u*u*u-3*u*u+1
 h10=u*u*u-2*u*u+u
 h01=-2*u*u*u+3*u*u
 h11=u*u*u-u*u
 dh00=(6*u*u-6*u)/seconds
 dh10=3*u*u-4*u+1
 dh01=(-6*u*u+6*u)/seconds
 dh11=3*u*u-2*u
 pos=[h00*a+h10*seconds*b+h01*c+h11*seconds*d for a,b,c,d in zip(p0,v0,p1,v1)]
 vel=[dh00*a+dh10*b+dh01*c+dh11*d for a,b,c,d in zip(p0,v0,p1,v1)]
 return pos+vel
def distance(a,b):
 return math.sqrt(math.fsum((float(x)-float(y))**2 for x,y in zip(a,b)))
def utcstr(t):
 return t.strftime("%Y %b %d %H:%M:%S UTC")
def main():
 ROOT.mkdir(parents=True,exist_ok=True)
 receipt={"status":"ABSTAIN","productionAuthority":"NONE"}
 try:
  import spiceypy as spice
  binaries={}
  for filename,(expected,limit,url) in KNOWN.items():
   raw=obtain(url,limit)
   digest=sha(raw)
   if expected and digest!=expected:
    raise ValueError("PREPINNED_KERNEL_SHA_CHANGED:"+filename)
   (ROOT/filename).write_bytes(raw)
   binaries[filename]={"sha256":digest,"length":len(raw),"url":url}
  spice.kclear()
  try:
   for filename in ("naif0012.tls","de440s.bsp","mar099s.bsp"):
    spice.furnsh(str(ROOT/filename))
   if 499 not in set(int(x) for x in spice.spkobj(str(ROOT/"mar099s.bsp"))):
    raise ValueError("MARS_499_MISSING")
   catalog={"schema":"ZENITH_PLANET_EPHEMERIS_V1","label":"OFFLINE_JPL_NUMERICAL_MODEL",
    "coordinateSystem":"SSB origin; J2000/ICRF equatorial; geometric states",
    "timeScale":"UTC_INPUT_TO_SPICE_TDB_WITH_NAIF0012_LSK",
    "beginUtc":BEGIN.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "endUtc":END.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "stepSeconds":STEP_SECONDS,
    "targets":TARGETS,
    "kernels":binaries,
    "note":"Sun, Earth, Moon and Mars are body centers; Mercury, Venus and giant planets are SYSTEM BARYCENTERS, not proven physical body centers. Radii used for illustration, not astrometric accuracy.",
    "samples":[]}
   t=BEGIN
   while t<=END:
    et=spice.str2et(utcstr(t))
    entry=[]
    for body in TARGETS:
     vec,_=spice.spkezr(str(body["naif"]),et,"J2000","NONE","0")
     entry.append([compact(x) for x in vec])
    catalog["samples"].append(entry)
    t+=dt.timedelta(seconds=STEP_SECONDS)
   if len(catalog["samples"])<3:raise ValueError("CATALOG_TOO_SHORT")
   maximum_p=maximum_v=0.
   worst_p=worst_v=None
   for i in range(len(catalog["samples"])-1):
    midpoint=BEGIN+dt.timedelta(seconds=(i+.5)*STEP_SECONDS)
    et=spice.str2et(utcstr(midpoint))
    for j,body in enumerate(TARGETS):
     real,_=spice.spkezr(str(body["naif"]),et,"J2000","NONE","0")
     pred=hermite(catalog["samples"][i][j],catalog["samples"][i+1][j],.5,STEP_SECONDS)
     ep=distance(real[:3],pred[:3]);ev=distance(real[3:],pred[3:])
     if ep>maximum_p:maximum_p,worst_p=ep,(i,body["id"])
     if ev>maximum_v:maximum_v,worst_v=ev,(i,body["id"])
   if maximum_p>MAX_ERROR_KM or maximum_v>MAX_VELOCITY_ERROR_KM_S:
    raise ValueError(f"MIDPOINT_HOLDOUT_EXCEEDS_LIMIT p={maximum_p} v={maximum_v}")
   for index,jd in enumerate(ANCHORS):
    et=(jd-2451545.0)*86400.
    for key in ("earth","moon","mars"):
     n=next(b["naif"] for b in TARGETS if b["id"]==key)
     true,_=spice.spkezr(str(n),et,"J2000","NONE","0")
     if distance(true[:3],ANCHOR_KM[key][index])>1.:
      raise ValueError(f"PR19_FIXED_TDB_ANCHOR_DISAGREEMENT: {key} {jd}")
   catalog["holdout"]={"test":"independent SPICE midpoint evaluation vs quantized client Hermite",
    "checks":(len(catalog["samples"])-1)*len(TARGETS),"maxPositionErrorKm":maximum_p,
    "worstPositionSample":worst_p,"maxVelocityErrorKmS":maximum_v,"worstVelocitySample":worst_v,
    "positionThresholdKm":MAX_ERROR_KM,"velocityThresholdKmS":MAX_VELOCITY_ERROR_KM_S,
    "sourceAnchors":"PR19 Horizons 4-epoch independently checked states, 12 position checks <1km"}
   catalog["productionAuthority"]="NONE"
   data=(json.dumps(catalog,separators=(",",":"),sort_keys=True)+"\n").encode("utf8")
   (ROOT/"planet-ephemeris.json").write_bytes(data)
   # This output contains ONLY public JPL model data. Emit bounded, numbered
   # compressed chunks so the repo author can review/commit an exact static
   # module through a separate GitHub connector action. No CI write token.
   packed=base64.b64encode(gzip.compress(data,compresslevel=9,mtime=0)).decode("ascii")
   print(f"ZENITH_CATALOG_START sha256={sha(data)} raw_bytes={len(data)} packed_chars={len(packed)}")
   for n,k in enumerate(range(0,len(packed),1000)):
    print(f"ZENITH_CATALOG_CHUNK {n:04d} {packed[k:k+1000]}")
   print("ZENITH_CATALOG_END")

   receipt={"status":"PASS_BOUNDED_NUMERICAL_EPHEMERIS","productionAuthority":"NONE",
    "sha256":sha(data),"sizeBytes":len(data),"samples":len(catalog["samples"]),
    "targets":[{"id":b["id"],"naif":b["naif"],"kind":b["kind"]} for b in TARGETS],
    "beginUtc":catalog["beginUtc"],"endUtc":catalog["endUtc"],
    "sourceKernels":binaries,"holdout":catalog["holdout"],
    "limitations":["no external physical validation","valid only inside stated UTC interval",
      "JPL barycenters are not planet surface centers","planetary relative motion only; not spacecraft dynamics"]}
  finally:
   spice.kclear()
 except Exception as e:
  receipt={"status":"ABSTAIN","reason":type(e).__name__+":"+str(e)[:400],
   "productionAuthority":"NONE"}
 (ROOT/"receipt.json").write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n")
 print(json.dumps(receipt,indent=2,sort_keys=True))
 return 0 if receipt["status"]=="PASS_BOUNDED_NUMERICAL_EPHEMERIS" else 1
if __name__=="__main__":
 sys.exit(main())
