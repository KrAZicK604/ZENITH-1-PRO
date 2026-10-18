from skyfield.api import load
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

BSP = Path("de421.bsp")
planets = load(str(BSP))
ts = load.timescale()
t = ts.now()

bodies = ["mercury","venus","earth","moon","mars","jupiter barycenter","saturn barycenter","uranus barycenter","neptune barycenter","pluto barycenter","sun"]
earth = planets["earth"].at(t)

print("=== ZENITH-1 v8 SOLAR SYSTEM REAL ===")
results=[]
for name in bodies:
    try:
        body = planets[name]
        dist_au = earth.observe(body).distance().au
        dist_km = dist_au * 149597870.7
        results.append((name, dist_au, dist_km))
        print(f"{name:22} {dist_au:.4f} AU {dist_km/1e6:.1f}M km")
    except Exception as e:
        print(f"{name} err {e}")

# Advanced visual - polar map
fig = plt.figure(figsize=(10,10))
ax = plt.subplot(111, polar=True)
angles = np.linspace(0, 2*np.pi, len(results), endpoint=False)
for i,(name,au,km) in enumerate(results):
    if name=="sun": continue
    # radius = distance from sun proxy (use au)
    r = abs(au) if name!="earth" else 0.1
    if name=="moon": r=0.15
    ax.plot(angles[i], r, "o", markersize=12 if "barycenter" in name else 8, label=name)

# draw orbits
for r in [0.4,0.7,1.0,1.5,5.2,9.5,19.2,30.1]:
    theta = np.linspace(0, 2*np.pi, 100)
    ax.plot(theta, [r]*100, "--", alpha=0.2, color="gray")

ax.set_title("ZENITH-1 v8 SOLAR SYSTEM MAP - REAL de421 - T NOW", va="bottom")
ax.legend(bbox_to_anchor=(1.3,1.0))
plt.tight_layout()
plt.savefig("solar_system.png", dpi=150)
print("Saved solar_system.png")

# 3D distance bar
plt.figure(figsize=(12,5))
names = [r[0][:10] for r in results]
aus = [r[1] for r in results]
plt.bar(names, aus, color=["orange" if "sun" in n else "cyan" if "earth" in n else "red" if "mars" in n else "gray" for n in names])
plt.ylabel("Distance from Earth (AU)")
plt.title(f"v8 ALL PLANETS DISTANCE FROM EARTH - NOW {datetime.now():%Y-%m-%d} - Mars {results[4][1]:.3f} AU")
plt.xticks(rotation=20)
plt.tight_layout()
plt.savefig("solar_distances.png", dpi=150)
print("Saved solar_distances.png")
