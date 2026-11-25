"""Process-local continuity detector, not a trusted clock or restart anchor."""
import threading
import time

TOLERANCE_NS = 2_000_000_000


class ClockGuard:
    def __init__(self, wall=time.time_ns, monotonic=time.monotonic_ns):
        self._wall = wall
        self._mono = monotonic
        self._lock = threading.Lock()
        self._anchor = None
        self._last = None
        self._failed = False

    def sample(self):
        """Return epoch seconds or None; anomaly remains latched until restart."""
        with self._lock:
            if self._failed:
                return None
            try:
                before = self._mono()
                wall = self._wall()
                after = self._mono()
                if any(type(v) is not int or v < 0 for v in (before, wall, after)):
                    raise ValueError("invalid clock sample")
                if after < before or after-before > TOLERANCE_NS:
                    raise ValueError("ambiguous clock sample")
                mono = (before+after)//2
                if self._anchor is None:
                    self._anchor = (wall, mono)
                if self._last is not None:
                    last_wall, last_mono = self._last
                    if wall < last_wall or mono < last_mono:
                        raise ValueError("clock rollback")
                base_wall, base_mono = self._anchor
                if abs((wall-base_wall)-(mono-base_mono)) > TOLERANCE_NS:
                    raise ValueError("clock divergence")
                self._last = (wall, mono)
                return wall//1_000_000_000
            except Exception:
                self._failed = True
                return None


PROCESS_CLOCK = ClockGuard()
