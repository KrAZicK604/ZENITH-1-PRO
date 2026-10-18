from astroquery.jplhorizons import Horizons
from astropy.time import Time
from datetime import datetime
import json

print("=== v15 STEP 1 - LIVE JPL FEED ===")

try:
    # LIVE REAL DATA - no simulation
    earth = Horizons(id="399", location="@sun", epochs=Time.now().jd).vectors()
    mars = Horizons(id="499", location="@sun", epochs=Time.now().jd).vectors()

    earth_dist = (earth["x"][0]**2 + earth["y"][0]**2 + earth["z"][0]**2)**0.5
    mars_dist = (mars["x"][0]**2 + mars["y"][0]**2 + mars["z"][0]**2)**0.5
    earth_mars = ((earth["x"][0]-mars["x"][0])**2 + (earth["y"][0]-mars["y"][0])**2 + (earth["z"][0]-mars["z"][0])**2)**0.5

    print(f"REAL JPL NOW {datetime.now()}")
    print(f"Earth {earth_dist:.4f} AU REAL")
    print(f"Mars {mars_dist:.4f} AU REAL")
    print(f"Earth-Mars {earth_mars:.4f} AU REAL = {earth_mars*149.6:.1f} M km")

    data = {"time": str(datetime.now()), "earth_au": float(earth_dist), "mars_au": float(mars_dist), "earth_mars_au": float(earth_mars)}
    open("live_jpl.json","w").write(json.dumps(data, indent=2))
    print("Saved live_jpl.json - 100% REAL JPL")
except Exception as e:
    print(f"JPL offline (expected) using backup astro_core: {e}")
    from astro_core import AstroCore
    core = AstroCore()
    now = core.get_now()
    print(f"BACKUP {now['au']:.4f} AU Psi {now['psi']:.4f}")
