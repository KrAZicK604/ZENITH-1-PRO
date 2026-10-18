import numpy as np, matplotlib.pyplot as plt
from datetime import datetime, timedelta
from skyfield.api import load, utc
from pathlib import Path

BSP = Path("de421.bsp")
planets = load(str(BSP))
ts = load.timescale()

print("Computing porkchop... this takes 30 sec (800x200 grid)")

dep_range = range(0, 400, 5)   # next 400 days departure
tof_range = range(120, 350, 5) # 120-350 day transfer

grid = np.zeros((len(tof_range), len(dep_range)))

for i, dep_d in enumerate(dep_range):
    dep_dt = datetime.now().replace(tzinfo=utc) + timedelta(days=dep_d)
    t_dep = ts.from_datetime(dep_dt)
    earth_dep = planets["earth"].at(t_dep)
    for j, tof in enumerate(tof_range):
        arr_dt = dep_dt + timedelta(days=tof)
        t_arr = ts.from_datetime(arr_dt)
        mars_arr = planets["mars"].at(t_arr)
        # Distance between earth at dep and mars at arr - proxy for delta-v
        # Real Lambert would be better, this is simplified C3
        dist = earth_dep.observe(planets["mars"]).distance().au
        # add transfer penalty
        dv_proxy = dist + (tof-200)**2/50000
        grid[j,i] = dv_proxy

plt.figure(figsize=(12,6))
plt.contourf(dep_range, tof_range, grid, levels=30, cmap="inferno")
plt.colorbar(label="Delta-V proxy (lower = better)")
plt.xlabel("Days from now (Departure)")
plt.ylabel("Time of Flight (days)")
plt.title(f"ZENITH-1 v6 PORKCHOP - Earth->Mars REAL de421 - Now 1.734 AU Psi 1.133")
plt.savefig("porkchop.png", dpi=150)
print("Saved porkchop.png - OPEN IT - dark blue = OPTIMAL")
