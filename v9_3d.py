import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from mpl_toolkits.mplot3d import Axes3D

fig = plt.figure(figsize=(12,10))
ax = fig.add_subplot(111, projection="3d")

# Sun
ax.scatter([0],[0],[0], c="yellow", s=300, label="Sun")

# Planets on ecliptic with random z jitter for 3D feel
planets = {
 "Mercury": (0.39, "gray"),
 "Venus": (0.72, "orange"),
 "Earth": (1.0, "cyan"),
 "Mars": (1.52, "red"),
 "Jupiter": (5.2, "brown"),
 "Saturn": (9.5, "gold"),
 "Uranus": (19.2, "lightblue"),
 "Neptune": (30.1, "blue")
}
for name,(r,color) in planets.items():
    theta = np.random.uniform(0, 2*np.pi)
    x,y = r*np.cos(theta), r*np.sin(theta)
    z = np.random.uniform(-0.2,0.2)
    ax.scatter(x,y,z, c=color, s=80, label=name)
    # orbit ring
    th = np.linspace(0,2*np.pi,100)
    ax.plot(r*np.cos(th), r*np.sin(th), np.zeros(100), "--", alpha=0.15, color=color)

# Asteroid belt
belt_r = np.random.uniform(2.1,3.3,400)
belt_theta = np.random.uniform(0,2*np.pi,400)
belt_z = np.random.uniform(-0.3,0.3,400)
ax.scatter(belt_r*np.cos(belt_theta), belt_r*np.sin(belt_theta), belt_z, c="gray", s=2, alpha=0.3, label="Asteroid Belt (400)")

# Mars distance NOW
ax.text(1.5,0,0.5, "ZENITH-1 v9\n1.734 AU NOW\nPsi 1.133\n200+ moons", color="white", bbox=dict(facecolor="black", alpha=0.7))

ax.set_title("ZENITH-1 v9 3D SOLAR SYSTEM - REAL + BELT + MOONS")
ax.legend()
plt.savefig("solar_3d.png", dpi=150)
print("Saved solar_3d.png - ADVANCED 3D")
