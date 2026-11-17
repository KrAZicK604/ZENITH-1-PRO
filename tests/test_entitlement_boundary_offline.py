"""Offline entitlement invariants: synthetic evidence only, never Stripe delivery."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import subscription_store as store


class EntitlementBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_path = str(Path(self.tmp.name) / "ledger.sqlite3")
        self.env = patch.dict(os.environ, {"DATABASE_PATH": self.db_path})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_missing_persistent_database_path_abstains(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            with self.assertRaises(OSError):
                store.is_active("sub_offline", now=1500)

    def test_no_checkout_or_invoice_cannot_grant(self):
        self.assertFalse(store.is_active("sub_offline", now=1500))

    def test_checkout_without_paid_invoice_cannot_grant(self):
        self.assertTrue(store.record_checkout("sub_offline", "cs_offline", "cus_offline",
                                              "test@example.invalid", 1000))
        self.assertFalse(store.is_active("sub_offline", now=1500))

    def test_paid_invoice_without_checkout_cannot_grant(self):
        self.assertTrue(store.record_paid_invoice("in_offline", "sub_offline",
                                                   "cus_offline", 1100, 2000, 1200))
        self.assertFalse(store.is_active("sub_offline", now=1500))

    def test_matching_evidence_is_time_bounded_and_revocable(self):
        self.assertTrue(store.record_checkout("sub_offline", "cs_offline", "cus_offline",
                                              "test@example.invalid", 1000))
        self.assertTrue(store.record_paid_invoice("in_offline", "sub_offline",
                                                   "cus_offline", 1100, 2000, 1200))
        self.assertFalse(store.is_active("sub_offline", now=1199))
        self.assertTrue(store.is_active("sub_offline", now=1500))
        self.assertFalse(store.is_active("sub_offline", now=2000))
        store.block("sub_offline", 1600, terminal=True)
        self.assertFalse(store.is_active("sub_offline", now=1700))

    def test_customer_mismatch_never_grants(self):
        store.record_checkout("sub_offline", "cs_offline", "cus_offline",
                              "test@example.invalid", 1000)
        store.record_paid_invoice("in_offline", "sub_offline", "cus_different",
                                  1100, 2000, 1200)
        self.assertFalse(store.is_active("sub_offline", now=1500))

    def test_conflicting_checkout_identity_is_rejected(self):
        self.assertTrue(store.record_checkout("sub_offline", "cs_offline", "cus_offline",
                                              "test@example.invalid", 1000))
        self.assertFalse(store.record_checkout("sub_offline", "cs_different", "cus_offline",
                                               "test@example.invalid", 1001))


if __name__ == "__main__":
    unittest.main()
