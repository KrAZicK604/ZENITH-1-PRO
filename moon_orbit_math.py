"""Approximate major natural-satellite orbits, in km and days.

Selected prominent moons, not the complete discovered satellite inventory.
Circular coplanar orbits with arbitrary epoch phase, not Horizons ephemerides.
Mean center-to-center orbital distances and periods are approximate.
Data: NASA Voyager fact sheet; JPL satellite mean elements; principal satellites
table (see moon_orbit_sources.md). No network or production integration.
"""
from math import cos, sin, pi, hypot, isfinite
from planet_distance_math import position_km, PLANETS

# name -> (host, mean orbital radius km, sidereal period days, direction)
# negative direction for retrograde Triton; Nereid excluded due to high eccentricity.
MOONS = {
 "Moon": ("Earth",384400,27.3217,1),
 "Phobos": ("Mars",9375,0.3187,1),
 "Deimos": ("Mars",23457,1.2625,1),
 "Io": ("Jupiter",421800,1.762732,1),
 "Europa": ("Jupiter",671100,3.525463,1),
 "Ganymede": ("Jupiter",1070400,7.155588,1),
 "Callisto": ("Jupiter",1882700,16.690440,1),
 "Mimas": ("Saturn",185520,0.942,1),
 "Enceladus": ("Saturn",238020,1.370,1),
 "Tethys": ("Saturn",294660,1.888,1),
 "Dione": ("Saturn",377400,2.737,1),
 "Rhea": ("Saturn",527040,4.518,1),
 "Titan": ("Saturn",1221860,15.945,1),
 "Iapetus": ("Saturn",3560830,79.33,1),
 "Miranda": ("Uranus",129900,1.413,1),
 "Ariel": ("Uranus",190900,2.520,1),
 "Umbriel": ("Uranus",265969,4.144,1),
 "Titania": ("Uranus",436300,8.706,1),
 "Oberon": ("Uranus",583400,13.46,1),
 "Proteus": ("Neptune",117600,1.122,1),
 "Triton": ("Neptune",354760,5.877,-1),
}
NO_KNOWN_NATURAL_MOONS = ("Mercury", "Venus")


def moon_relative_km(name, days, phase_rad=0.0):
    """Moon's 2D displacement from its parent planet's center."""
    if name not in MOONS:
        raise ValueError("unknown or unsupported moon")
    if not all(isinstance(v,(int,float)) and isfinite(v) for v in (days,phase_rad)):
        raise ValueError("invalid time or phase")
    _, radius, period, direction=MOONS[name]
    angle=(phase_rad+direction*2*pi*days/period)%(2*pi)
    return (radius*cos(angle),radius*sin(angle))


def moon_position_km(name, days, moon_phase_rad=0.0, planet_phase_rad=0.0):
    """Approximate Sun-centered moon position by adding planet and relative vectors."""
    if name not in MOONS:
        raise ValueError("unknown moon")
    host=MOONS[name][0]
    px,py=position_km(host,days,planet_phase_rad)
    mx,my=moon_relative_km(name,days,moon_phase_rad)
    return (px+mx,py+my)


def moon_planet_distance_km(name, days, moon_phase_rad=0.0):
    """Approximate center-to-center distance, constant for circular model."""
    dx,dy=moon_relative_km(name,days,moon_phase_rad)
    return hypot(dx,dy)


def moon_to_planet_km(name, other_planet, days,
                      moon_phase_rad=0.0, host_phase_rad=0.0,
                      other_phase_rad=0.0):
    """Approximate moon-to-other-planet center distance in km."""
    if other_planet not in PLANETS:
        raise ValueError("unknown planet")
    moon=moon_position_km(name,days,moon_phase_rad,host_phase_rad)
    planet=position_km(other_planet,days,other_phase_rad)
    return hypot(moon[0]-planet[0],moon[1]-planet[1])
