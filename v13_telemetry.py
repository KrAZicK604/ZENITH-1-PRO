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
