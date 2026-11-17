"""Offline immutable-binding tests; no identity provider or Stripe requests."""
import os
import tempfile
import unittest
from unittest.mock import patch

import identity_bindings as binding

SUBJECT = "issuer.example/player-123"
CUSTOMER = "cus_test123"
SUB = "sub_test123"


class BindingTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        env = patch.dict(os.environ, {"DATABASE_PATH": tmp.name + "/ledger.sqlite3"})
        env.start()
        self.addCleanup(env.stop)

    def test_unbound_player_has_no_binding(self):
        self.assertIsNone(binding.lookup(SUBJECT))

    def test_exact_binding_is_idempotent_and_persistent(self):
        self.assertTrue(binding.bind_once(SUBJECT, CUSTOMER, SUB))
        self.assertTrue(binding.bind_once(SUBJECT, CUSTOMER, SUB))
        self.assertEqual(binding.lookup(SUBJECT), {
            "subject": SUBJECT, "customer_id": CUSTOMER, "subscription_id": SUB})

    def test_cannot_remap_subject_customer_or_subscription(self):
        self.assertTrue(binding.bind_once(SUBJECT, CUSTOMER, SUB))
        for args in ((SUBJECT, "cus_other123", "sub_other123"),
                     ("issuer.example/player-456", CUSTOMER, "sub_other123"),
                     ("issuer.example/player-456", "cus_other123", SUB)):
            with self.subTest(args=args):
                self.assertFalse(binding.bind_once(*args))
        self.assertIsNone(binding.lookup("issuer.example/player-456"))

    def test_malformed_or_injected_identity_rejected(self):
        for subject in (None, "", "x", "player' OR 1=1 --", "a" * 129):
            with self.subTest(subject=subject):
                self.assertFalse(binding.bind_once(subject, CUSTOMER, SUB))
                self.assertIsNone(binding.lookup(subject))
        self.assertFalse(binding.bind_once(SUBJECT, "cus_", SUB))
        self.assertFalse(binding.bind_once(SUBJECT, CUSTOMER, "sub_"))

    def test_missing_storage_abstains(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            with self.assertRaises(OSError):
                binding.lookup(SUBJECT)


if __name__ == "__main__":
    unittest.main()
