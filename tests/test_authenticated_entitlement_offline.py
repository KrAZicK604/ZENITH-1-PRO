"""Synthetic-only internal identity boundary tests; no actual login provider."""
import os
import tempfile
import unittest
from unittest.mock import patch

import authenticated_entitlement as access
import subscription_store as store

BASE = 1800000000
BINDING = {"subject": "player:123", "customer_id": "cus_test123", "subscription_id": "sub_test123"}


class AuthenticatedEntitlementTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        env = patch.dict(os.environ, {"DATABASE_PATH": tmp.name + "/ledger.sqlite3"})
        env.start()
        self.addCleanup(env.stop)

    def populate(self):
        store.record_checkout("sub_test123", "cs_test123", "cus_test123", "p@example.invalid", BASE)
        store.record_paid_invoice("in_test123", "sub_test123", "cus_test123",
                                  BASE, BASE + 2000, BASE + 10)

    def test_no_authenticated_subject_or_binding_denied(self):
        self.populate()
        for subject, binding in ((None, BINDING), ("", BINDING),
                                 ("player:123", None), ("player:123", {}),
                                 ("player:other", BINDING)):
            with self.subTest(subject=subject, binding=binding):
                self.assertFalse(access.entitled(subject, binding, BASE + 20))

    def test_correct_identity_and_paid_period_required(self):
        self.populate()
        self.assertTrue(access.entitled("player:123", BINDING, BASE + 20))
        self.assertFalse(access.entitled("player:123", BINDING, BASE + 2000))

    def test_cross_customer_and_subscription_denied(self):
        self.populate()
        for change in ({"customer_id": "cus_other123"},
                       {"subscription_id": "sub_other123"},
                       {"subject": "player:other"}):
            with self.subTest(change=change):
                self.assertFalse(access.entitled("player:123", {**BINDING, **change}, BASE + 20))

    def test_revocation_denies_authenticated_player(self):
        self.populate()
        store.block("sub_test123", BASE + 30, terminal=True)
        self.assertFalse(access.entitled("player:123", BINDING, BASE + 40))

    def test_missing_database_fails_closed_by_exception(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            with self.assertRaises(OSError):
                access.entitled("player:123", BINDING, BASE + 20)


if __name__ == "__main__":
    unittest.main()
