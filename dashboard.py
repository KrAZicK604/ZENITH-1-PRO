import time, os
from astro_core import AstroCore
from datetime import datetime
core = AstroCore()
try:
    while True:
        os.system("cls")
        now = core.get_now()
        best, days_to, best_date = core.get_launch_window()
        print(f"ZENITH-1-PRO LIVE | {datetime.now():%H:%M:%S} | REAL JPL de421")
        print(f"NOW: {now['au']:.4f} AU | {now['km']/1e6:.1f}M km | Psi {now['psi']:.4f} ({(now['psi']-1)*100:.1f}% saving)")
        print(f"NEXT OPTIMAL: {best_date:%Y-%m-%d} in {days_to}d | Min {best['au']:.3f} AU")
        bar = int((2.6-now['au'])/2.1*50)
        print("[" + "#"*bar + "-"*(50-bar) + "]")
        time.sleep(2)
except KeyboardInterrupt:
    print("\nStopped")
