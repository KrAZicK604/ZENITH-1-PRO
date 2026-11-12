"""Pure-Python ledger regression tests; no Stripe credentials or network."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import subscription_store as ledger

BASE = 1800000000
END = BASE + 30 * 86400


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"DATABASE_PATH": self.tmp.name + "/ledger.sqlite3"})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def checkout(self):
        return ledger.record_checkout("sub_test", "cs_test", "cus_player", "p@example.com", BASE)

    def paid(self, iid="in_1", created=BASE+10, cust="cus_player", end=END):
        return ledger.record_paid_invoice(iid, "sub_test", cust, BASE, end, created)

    def test_checkout_alone_never_grants(self):
        self.checkout()
        self.assertFalse(ledger.is_active("sub_test", BASE+15))

    def test_invoice_alone_never_grants(self):
        self.paid()
        self.assertFalse(ledger.is_active("sub_test", BASE+15))
        self.checkout()
        self.assertTrue(ledger.is_active("sub_test", BASE+15))

    def test_period_boundaries(self):
        self.checkout(); self.paid()
        self.assertFalse(ledger.is_active("sub_test", BASE-1))
        self.assertFalse(ledger.is_active("sub_test", BASE))
        self.assertFalse(ledger.is_active("sub_test", BASE+9))
        self.assertTrue(ledger.is_active("sub_test", BASE+10))
        self.assertTrue(ledger.is_active("sub_test", END-1))
        self.assertFalse(ledger.is_active("sub_test", END))

    def test_checkout_duplicate_and_conflict(self):
        self.assertTrue(self.checkout())
        self.assertTrue(self.checkout())
        self.assertFalse(ledger.record_checkout("sub_test", "cs_other", "cus_player", "p@example.com", BASE))
        self.assertFalse(ledger.record_checkout("sub_other", "cs_test", "cus_other", "x@example.com", BASE))

    def test_invoice_duplicate_and_conflict(self):
        self.assertTrue(self.paid())
        self.assertTrue(self.paid())
        self.assertFalse(self.paid(end=END+1))

    def test_customer_mismatch(self):
        self.checkout(); self.paid(cust="cus_other")
        self.assertFalse(ledger.is_active("sub_test", BASE+20))

    def test_failure_and_paid_recovery(self):
        self.checkout(); self.paid()
        ledger.block("sub_test", BASE+15)
        self.assertFalse(ledger.is_active("sub_test", BASE+20))
        self.paid("in_2", BASE+25)
        self.assertTrue(ledger.is_active("sub_test", BASE+30))

    def test_out_of_order_stale_payment_denied(self):
        self.checkout()
        ledger.block("sub_test", BASE+100)
        self.paid(created=BASE+99)
        self.assertFalse(ledger.is_active("sub_test", BASE+101))
        self.paid("in_2", BASE+100)
        self.assertFalse(ledger.is_active("sub_test", BASE+101))

    def test_permanent_cancel_before_checkout(self):
        ledger.block("sub_test", BASE+50, terminal=True)
        self.checkout(); self.paid(created=BASE+100)
        self.assertFalse(ledger.is_active("sub_test", BASE+120))

    def test_block_monotonic_timestamp(self):
        self.checkout(); ledger.block("sub_test", BASE+50)
        ledger.block("sub_test", BASE+10)
        self.paid(created=BASE+40)
        self.assertFalse(ledger.is_active("sub_test", BASE+60))

    def test_separate_subscription_never_entitled(self):
        self.checkout(); self.paid()
        self.assertFalse(ledger.is_active("sub_other", BASE+20))

    def test_missing_storage_config_fails_closed(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            with self.assertRaises(OSError):
                self.checkout()


if __name__ == "__main__":
    unittest.main()
