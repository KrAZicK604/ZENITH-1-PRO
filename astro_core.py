from skyfield.api import load, utc
from pathlib import Path
from datetime import datetime, timedelta

BSP_PATH = Path("de421.bsp")

class AstroCore:
    def __init__(self):
        self.planets = load(str(BSP_PATH))
        self.ts = load.timescale()
    def get_real_distance(self, dt=None):
        if dt is None:
            dt = datetime.now().replace(tzinfo=utc)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=utc)
        t = self.ts.from_datetime(dt)
        dist = self.planets["earth"].at(t).observe(self.planets["mars"]).distance()
        return {"au": dist.au, "km": dist.km, "psi": 1.0 + 0.4 / (dist.au*dist.au), "mode": "REAL"}
    def get_now(self):
        return self.get_real_distance()
    def get_launch_window(self):
        best = None
        best_date = None
        for d in range(0, 800):
            dt = datetime.now().replace(tzinfo=utc) + timedelta(days=d)
            data = self.get_real_distance(dt)
            if best is None or data["au"] < best["au"]:
                best = data
                best_date = dt
        days_to = (best_date - datetime.now().replace(tzinfo=utc)).days
        return best, days_to, best_date

if __name__ == "__main__":
    ac = AstroCore()
    now = ac.get_now()
    print(f"REAL {now['au']:.4f} AU {now['km']/1e6:.1f}M km Psi {now['psi']:.3f}")
