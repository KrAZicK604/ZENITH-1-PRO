"""Short host observation, not calibration against an independent reference."""
import json
import time
import threading
import unittest
from datetime import datetime, timezone


def observe(n=1000):
    widths, residuals = [], []
    anchor = None
    for _ in range(n):
        before = time.monotonic_ns()
        wall = time.time_ns()
        after = time.monotonic_ns()
        mid = (before + after)//2
        if anchor is None:
            anchor = wall, mid
        widths.append(after-before)
        residuals.append(abs((wall-anchor[0])-(mid-anchor[1])))
        time.sleep(0.0001)
    def stats(values):
        ordered = sorted(values)
        return {"max_ns": ordered[-1], "p99_ns": ordered[(99*len(ordered)-1)//100]}
    return {"samples": n, "bracket": stats(widths), "divergence": stats(residuals)}


class HostMeasurementTests(unittest.TestCase):
    def test_host_observation(self):
        start = time.monotonic_ns()
        idle = observe()
        stop = threading.Event()
        def load():
            while not stop.is_set():
                sum(range(1000))
        worker = threading.Thread(target=load)
        worker.start()
        try:
            loaded = observe(200)
        finally:
            stop.set()
            worker.join()
        report = {"utc": datetime.now(timezone.utc).isoformat(),
                  "clock": "UTC_HOST_UNATTESTED",
                  "elapsed_ns": time.monotonic_ns()-start,
                  "idle": idle, "thread_contention": loaded,
                  "policy": "UNCHANGED_NOT_CALIBRATED"}
        print("CLOCK_MEASUREMENT "+json.dumps(report, sort_keys=True), flush=True)
        self.assertEqual(idle["samples"], 1000)
        self.assertEqual(loaded["samples"], 200)
        for result in (idle, loaded):
            for key in ("bracket", "divergence"):
                self.assertGreaterEqual(result[key]["max_ns"], result[key]["p99_ns"])
                self.assertGreaterEqual(result[key]["p99_ns"], 0)
