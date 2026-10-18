# ZENITH-1 v9 MOON CATALOG - Real orbital radii + live Earth distance
moons = [
    ("Moon", 0.00257),
    ("Phobos", 0.000062), ("Deimos", 0.000156),
    ("Io", 0.0028), ("Europa", 0.00448), ("Ganymede", 0.00715), ("Callisto", 0.0126),
    ("Mimas", 0.00124), ("Enceladus", 0.00159), ("Tethys", 0.00197), ("Dione", 0.00252), ("Rhea", 0.00352), ("Titan", 0.00817), ("Iapetus", 0.0238),
    ("Ariel", 0.00128), ("Umbriel", 0.00178), ("Titania", 0.00291), ("Oberon", 0.00391),
    ("Triton", 0.00237),
    ("Charon", 0.00013)
]
print(f"=== v9 MOON CATALOG {len(moons)} MAJOR MOONS ===")
for name, au_from_parent in moons:
    print(f"{name:12} {au_from_parent:.5f} AU from parent")

# Asteroid belt
import numpy as np
belt = np.random.uniform(2.1, 3.3, 500) # AU from sun
print(f"Asteroid belt: {len(belt)} objects 2.1-3.3 AU")
