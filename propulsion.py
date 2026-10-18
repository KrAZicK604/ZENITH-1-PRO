from astro_core import AstroCore
import matplotlib.pyplot as plt
import math
core = AstroCore()
now = core.get_now()
psi = now['psi']
au = now['au']
# Psi fuel calc
newton_fuel = 1000 # tons
psi_fuel = newton_fuel / psi
print(f"Newton fuel needed: {newton_fuel}t")
print(f"Psi-corrected fuel: {psi_fuel:.1f}t SAVING {newton_fuel-psi_fuel:.1f}t")
# Simple orbit plot
angles = [i*0.1 for i in range(63)]
earth_x = [math.cos(a) for a in angles]
earth_y = [math.sin(a) for a in angles]
mars_x = [1.52*math.cos(a*0.53) for a in angles]
mars_y = [1.52*math.sin(a*0.53) for a in angles]
plt.figure()
plt.plot(earth_x, earth_y, label="Earth")
plt.plot(mars_x, mars_y, label="Mars")
plt.plot([0, mars_x[20]], [0, mars_y[20]], "r--", label=f"Transit {au:.2f}AU")
plt.legend()
plt.title(f"ZENITH-1 REAL Psi {psi:.3f}")
plt.savefig("trajectory.png")
print("Saved trajectory.png")
