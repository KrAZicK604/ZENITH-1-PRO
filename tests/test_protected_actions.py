"""Synthetic concurrent SQLite tests, not a deployed API load test."""
from concurrent.futures import ThreadPoolExecutor
import os
import tempfile
import time
import unittest
from unittest.mock import patch
import player_sessions as sessions
import protected_actions as actions
import subscription_store as ledger


class ConcurrentActionsTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        env = patch.dict(os.environ, {"DATABASE_PATH": tmp.name + "/ledger.sqlite3"})
        env.start()
        self.addCleanup(env.stop)
        now = int(time.time())
        ledger.record_checkout("sub_a", "cs_a", "cus_a", "a@example.com", now-10)
        ledger.record_paid_invoice("in_a", "sub_a", "cus_a", now-10, now+3600, now-5)
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        self.token = sessions.issue("player_a")
        self.assertIsNotNone(self.token)

    def run_parallel(self, ids):
        with ThreadPoolExecutor(max_workers=8) as pool:
            return list(pool.map(lambda rid: actions.record_demo_action(self.token, rid), ids))

    def test_duplicate_concurrent_requests(self):
        self.assertEqual(sum(self.run_parallel(["same"]*24)), 1)

    def test_concurrent_quota(self):
        self.assertEqual(sum(self.run_parallel(["r"+str(i) for i in range(32)])), actions.LIMIT)
        with ledger.database() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM demo_action_receipts").fetchone()[0], actions.LIMIT)

    def test_revocation_and_invalid_inputs(self):
        self.assertFalse(actions.record_demo_action("x"*43, "r1"))
        self.assertFalse(actions.record_demo_action(self.token, "x"*129))
        self.assertTrue(actions.record_demo_action(self.token, "r1"))
        self.assertTrue(sessions.revoke(self.token))
        self.assertEqual(sum(self.run_parallel(["r"+str(i) for i in range(2,18)])), 0)

    def test_terminal_billing_block(self):
        ledger.block("sub_a", int(time.time()), terminal=True)
        self.assertEqual(sum(self.run_parallel(["r"+str(i) for i in range(16)])), 0)

    def test_storage_failure(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            self.assertFalse(actions.record_demo_action(self.token, "r1"))

    def test_clock_failure_denies_action(self):
        with patch.object(actions.PROCESS_CLOCK, "sample", return_value=None):
            self.assertFalse(actions.record_demo_action(self.token, "clock_failure"))
        self.assertFalse(actions.record_demo_action(self.token, "clock_failure"))
