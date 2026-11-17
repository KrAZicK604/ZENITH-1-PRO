import math
import unittest

from planet_distance_math import AU_KM, PLANETS, position_km, distance_km, separation_km, project_km_to_canvas


class DistanceMathTests(unittest.TestCase):
    def test_exact_au_definition(self):
        self.assertEqual(AU_KM, 149_597_870.7)

    def test_circular_orbit_radius_stays_constant(self):
        for name, (au, period) in PLANETS.items():
            for day in (0, 1, period / 3, period):
                with self.subTest(name=name, day=day):
                    self.assertAlmostEqual(math.hypot(*position_km(name, day)) / AU_KM, au, places=10)

    def test_periodic_position(self):
        for name, (_, period) in PLANETS.items():
            a, b = position_km(name, 0), position_km(name, period)
            self.assertLess(distance_km(a, b), .01)

    def test_geometry_and_symmetry(self):
        self.assertEqual(distance_km((0, 0), (3, 4)), 5)
        self.assertAlmostEqual(separation_km("Earth", "Mars", 0),
                               (PLANETS["Mars"][0] - 1) * AU_KM, places=5)
        self.assertAlmostEqual(separation_km("Mars", "Earth", 17),
                               separation_km("Earth", "Mars", 17), places=5)

    def test_opposition_versus_conjunction_geometry(self):
        close = separation_km("Earth", "Mars", 0, 0, 0)
        far = separation_km("Earth", "Mars", 0, 0, math.pi)
        self.assertAlmostEqual(far, (1 + PLANETS["Mars"][0]) * AU_KM, places=5)
        self.assertGreater(far, close)

    def test_projection_is_reversible_at_fixed_scale(self):
        p = (100_000_000, -50_000_000)
        center = (20_000_000, 10_000_000)
        scale = 250_000
        x, y = project_km_to_canvas(p, center, scale)
        self.assertEqual((x * scale + center[0], y * scale + center[1]), p)

    def test_invalid_input_rejected(self):
        with self.assertRaises(ValueError):
            position_km("Pluto", 0)
        with self.assertRaises(ValueError):
            position_km("Earth", float("nan"))
        with self.assertRaises(ValueError):
            distance_km((0, 0), (float("inf"), 0))
        with self.assertRaises(ValueError):
            project_km_to_canvas((0, 0), (0, 0), 0)


if __name__ == "__main__":
    unittest.main()
