"""Local synthetic tests only; no identity provider or Stripe network."""
import os
import tempfile
import unittest
from unittest.mock import patch
import player_sessions as sessions
import subscription_store as ledger

NOW = 1800000000


class PlayerSessionsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        env = patch.dict(os.environ, {"DATABASE_PATH": self.tmp.name + "/ledger.sqlite3"})
        env.start()
        self.addCleanup(env.stop)
        clock = patch("clock_guard.PROCESS_CLOCK.sample", return_value=NOW)
        self.clock = clock.start()
        self.addCleanup(clock.stop)
        ledger.record_checkout("sub_a", "cs_a", "cus_a", "a@example.com", NOW-10)
        ledger.record_paid_invoice("in_a", "sub_a", "cus_a", NOW-10, NOW+3600, NOW-5)

    def test_binding_requires_matching_evidence_and_unique_owner(self):
        self.assertFalse(sessions.bind_verified("player_a", "cus_b", "sub_a"))
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        self.assertFalse(sessions.bind_verified("player_b", "cus_a", "sub_a"))
        self.assertIsNone(sessions.issue("player_b"))

    def test_token_hash_expiry_and_revocation(self):
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        token = sessions.issue("player_a", ttl=10)
        self.assertTrue(sessions.eligible(token))
        with ledger.database() as db:
            stored = db.execute("SELECT digest FROM player_sessions").fetchone()[0]
        self.assertNotEqual(stored, token)
        self.assertEqual(len(stored), 64)
        self.assertFalse(sessions.eligible("x"*43))
        self.clock.return_value = NOW+10
        self.assertFalse(sessions.eligible(token))
        token2 = sessions.issue("player_a")
        self.assertTrue(sessions.eligible(token2))
        self.assertTrue(sessions.revoke(token2))
        self.assertFalse(sessions.eligible(token2))

    def test_billing_revocation_and_storage_failure(self):
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        token = sessions.issue("player_a")
        self.assertTrue(sessions.eligible(token))
        ledger.block("sub_a", NOW, terminal=True)
        self.assertFalse(sessions.eligible(token))
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            self.assertFalse(sessions.eligible(token))
            self.assertIsNone(sessions.issue("player_a"))

    def test_invalid_inputs(self):
        for token in (None, "", "a"*10000, 1):
            self.assertFalse(sessions.eligible(token))
            self.assertFalse(sessions.revoke(token))
        for ttl in (0, -1, 3601, True, "900"):
            self.assertIsNone(sessions.issue("player_a", ttl))

    def test_clock_fault_denies_grants_but_not_revocation(self):
        self.assertTrue(sessions.bind_verified("player_a", "cus_a", "sub_a"))
        token = sessions.issue("player_a")
        self.assertIsNotNone(token)
        self.clock.return_value = NOW-1
        self.assertIsNone(sessions.issue("player_a"))
        self.assertFalse(sessions.eligible(token))
        self.assertTrue(sessions.revoke(token))
        self.clock.return_value = NOW+100
        self.assertIsNone(sessions.issue("player_a"))
        with ledger.database() as db:
            self.assertEqual(db.execute("SELECT revoked FROM player_sessions").fetchone()[0], 1)
