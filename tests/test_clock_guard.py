import unittest
from unittest.mock import patch
from clock_guard import ClockGuard
import protected_actions as actions


class ClockTests(unittest.TestCase):
    def setUp(self):
        self.wall = 1800000000 * 10**9
        self.mono = 10**9
        self.guard = ClockGuard(lambda: self.wall, lambda: self.mono)

    def advance(self, wall, mono):
        self.wall += wall * 10**9
        self.mono += mono * 10**9

    def test_normal_progress(self):
        self.assertEqual(self.guard.sample(), 1800000000)
        self.advance(60, 60)
        self.assertEqual(self.guard.sample(), 1800000060)

    def test_wall_rollback_latches(self):
        self.guard.sample()
        self.advance(-1, 1)
        self.assertIsNone(self.guard.sample())
        self.advance(3, 1)
        self.assertIsNone(self.guard.sample())

    def test_monotonic_rollback(self):
        self.guard.sample()
        self.advance(1, -1)
        self.assertIsNone(self.guard.sample())

    def test_forward_jump_and_accumulated_drift(self):
        self.guard.sample()
        for _ in range(2):
            self.advance(2, 1)
            self.assertIsNotNone(self.guard.sample())
        self.advance(2, 1)
        self.assertIsNone(self.guard.sample())

    def test_clock_source_failure(self):
        guard = ClockGuard(lambda: None, lambda: 0)
        self.assertIsNone(guard.sample())
        self.assertIsNone(guard.sample())
