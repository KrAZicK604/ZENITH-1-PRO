import plotly.graph_objects as go
import numpy as np
import json
from pathlib import Path

print("=== ZENITH-1 v12 4D GENERATOR ===")

major_moons = {
 "Earth": [("Moon",0.00257)],
 "Mars": [("Phobos",0.000062),("Deimos",0.000156)],
 "Jupiter": [("Io",0.0028),("Europa",0.00448),("Ganymede",0.00715),("Callisto",0.0126)],
 "Saturn": [("Titan",0.00817),("Enceladus",0.00159),("Mimas",0.00124)],
 "Uranus": [("Titania",0.00291),("Oberon",0.00391)],
 "Neptune": [("Triton",0.00237)],
 "Pluto": [("Charon",0.00013)]
}

planets = {
 "Sun": (0, "yellow", 20),
 "Mercury": (0.39, "gray", 6),
 "Venus": (0.72, "orange", 8),
 "Earth": (1.0, "cyan", 10),
 "Mars": (1.52, "red", 9),
 "Jupiter": (5.2, "brown", 18),
 "Saturn": (9.5, "gold", 16),
 "Uranus": (19.2, "lightblue", 14),
 "Neptune": (30.1, "blue", 14)
}

fig = go.Figure()
frames = []

for t in range(12):
    frame_data=[]
    for name,(r,color,size) in planets.items():
        if name=="Sun":
            frame_data.append(go.Scatter3d(x=[0], y=[0], z=[0], mode="markers", marker=dict(size=size, color=color), name=name))
            continue
        theta = t*0.523 + (hash(name) % 10)*0.1
        x = r*np.cos(theta)
        y = r*np.sin(theta)
        z = np.sin(theta*0.5)*0.2
        frame_data.append(go.Scatter3d(x=[x], y=[y], z=[z], mode="markers+text", text=[name], textposition="top center", marker=dict(size=size, color=color), name=name))
Set-Content v13_telemetry.py -Value @'
import time, math, json
from datetime import datetime
from pathlib import Path
from astro_core import AstroCore

core = AstroCore()
print("=== ZENITH-1 v13 TELEMETRY - EN ROUTE TO MARS ===")

# Simulate en route
now = core.get_now()
distance = now["au"] * 149.6 # M km
for pct in range(0,101,5):
    remaining_au = now["au"] * (1 - pct/100) + 0.001
    speed = 24 # km/s avg
    fuel = (1000/core.get_now()["psi"]) * (1 - pct/100)
    print(f"T+{pct*2.6:.1f}d [{pct:3}%] Dist {remaining_au:.3f} AU Fuel {fuel:.1f}t Speed {speed}km/s Psi {now['psi']:.3f} {'>>> LANDING BURN' if pct>95 else ''}")
    time.sleep(0.2)

Path("LANDING.txt").write_text(f"LANDED {datetime.now()} MARS 0.0 AU FROM SURFACE - ZENITH-1 v13")
print("LANDED ON MARS - MISSION COMPLETE")
