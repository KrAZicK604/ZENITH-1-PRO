"""Offline illustrative circular-orbit distance model. NOT ephemeris navigation.

All distances are kilometres. Mean orbital radii and sidereal periods are
approximations; phases are arbitrary at t=0, not real calendar positions.
"""
from math import cos, sin, hypot, pi, isfinite

AU_KM = 149_597_870.7
# Approximate heliocentric semimajor axes (AU) and sidereal periods (days).
PLANETS = {
    "Mercury": (0.387098, 87.969),
    "Venus": (0.723332, 224.701),
    "Earth": (1.0, 365.256),
    "Mars": (1.523679, 686.980),
    "Jupiter": (5.2044, 4332.59),
    "Saturn": (9.5826, 10759.22),
    "Uranus": (19.2184, 30688.5),
    "Neptune": (30.11, 60182.0),
}


def position_km(body, days_since_model_epoch, phase_rad=0.0):
    """2D Sun-centered circular approximation; model epoch is arbitrary."""
    if body not in PLANETS:
        raise ValueError("unknown planet")
    if not all(isinstance(v, (int, float)) and isfinite(v)
               for v in (days_since_model_epoch, phase_rad)):
        raise ValueError("nonfinite or invalid time/phase")
    radius_au, period_days = PLANETS[body]
    angle = (phase_rad + 2 * pi * (days_since_model_epoch / period_days)) % (2 * pi)
    radius = radius_au * AU_KM
    return (radius * cos(angle), radius * sin(angle))


def distance_km(a, b):
    """Euclidean separation of two Cartesian positions in kilometres."""
    if len(a) != 2 or len(b) != 2 or not all(
        isinstance(v, (int, float)) and isfinite(v) for v in (*a, *b)
    ):
        raise ValueError("invalid 2D coordinates")
    return hypot(a[0] - b[0], a[1] - b[1])


def separation_km(first, second, days_since_model_epoch,
                  first_phase_rad=0.0, second_phase_rad=0.0):
    return distance_km(
        position_km(first, days_since_model_epoch, first_phase_rad),
        position_km(second, days_since_model_epoch, second_phase_rad),
    )


def project_km_to_canvas(point_km, center_km, km_per_pixel):
    """Camera projection only; never feed projected pixels into physics."""
    if not isinstance(km_per_pixel, (int, float)) or not isfinite(km_per_pixel) or km_per_pixel <= 0:
        raise ValueError("scale must be positive finite km/pixel")
    if len(point_km) != 2 or len(center_km) != 2 or not all(
        isinstance(v, (int, float)) and isfinite(v) for v in (*point_km, *center_km)
    ):
        raise ValueError("invalid camera coordinates")
    return ((point_km[0] - center_km[0]) / km_per_pixel,
            (point_km[1] - center_km[1]) / km_per_pixel)
