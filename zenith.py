"""
ZENITH-1-PRO v5.0 - REAL Ephemeris Dashboard
"""
from datetime import datetime
from astro_core import AstroCore

def main():
    print("="*60)
    print(" ZENITH-1-PRO v5.0 REAL - Earth-Mars Transit Computer")
    print("="*60)
    core = AstroCore()
    now = core.get_now()
    best, days_to, best_date = core.get_launch_window()
    print(f"\n[CURRENT] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Distance : {now['au']:.6f} AU / {now['km']/1e6:.2f}M km")
    print(f"  Psi      : {now['psi']:.6f} saving {(now['psi']-1)*100:.2f}%")
    print(f"  Mode     : {now['mode']} JPL de421.bsp")
    print(f"\n[LAUNCH]")
    print(f"  Next Optimal: {best_date.strftime('%Y-%m-%d')} in {days_to} days")
    print(f"  Min Dist    : {best['au']:.4f} AU")
    base_dv = 4.5
    dv = base_dv * (now['au'] / 0.5) * (2 - now['psi'])
    print(f"  Est Delta-V : {dv:.2f} km/s")
    print("\nNEXT: python dashboard.py for live view")

if __name__ == "__main__":
    main()
