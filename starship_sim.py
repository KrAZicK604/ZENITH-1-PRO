from astro_core import AstroCore
from datetime import datetime
import time, os

core = AstroCore()
now = core.get_now()
best, days_to, best_date = core.get_launch_window()

STARSHIP_DRY = 120  # tons
FUEL_BASE = 1000
PAYLOAD = 100

psi = now['psi']
fuel_real = FUEL_BASE / psi
fuel_best = FUEL_BASE / best['psi']

print(f"=== ZENITH-1 v7 STARSHIP SIM ===")
print(f"NOW: {now['au']:.4f} AU Psi {psi:.4f}")
print(f"BEST: {best['au']:.3f} AU Psi {best['psi']:.4f} on {best_date:%Y-%m-%d}")
print(f"")
print(f"Newton Fuel: {FUEL_BASE}t")
print(f"Fuel NOW: {fuel_real:.1f}t (save {FUEL_BASE-fuel_real:.1f}t)")
print(f"Fuel OPTIMAL: {fuel_best:.1f}t (save {FUEL_BASE-fuel_best:.1f}t)")
print(f"")
print(f"Total Mass NOW: {STARSHIP_DRY+fuel_real+PAYLOAD:.1f}t")
print(f"Total Mass OPT: {STARSHIP_DRY+fuel_best+PAYLOAD:.1f}t")
print(f"")
# countdown loop
for i in range(10,0,-1):
    print(f"T-{days_to} days + {i}... Psi field stabilizing {psi:.4f}", end="\r")
    time.sleep(0.3)
print(f"\nLAUNCH WINDOW: {best_date:%Y-%m-%d} - MARK CALENDAR - {days_to} days remaining")
