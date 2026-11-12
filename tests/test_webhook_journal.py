"""Gate 5: atomic event receipt, parallel delivery, restart and restore controls.

All signatures are locally HMAC generated and checked by the Stripe Python SDK.
No externally delivered Stripe events or production customer data is used.
"""
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from test_webhook_crypto import SIGNING_SECRET, BASE, checkout, event, invoice, signed

ROOT = Path(__file__).resolve().parents[1]


class JournalIntegrityTests(unittest.TestCase):
    def setUp(self):
        import cloud_webhook
        self.module = cloud_webhook
        self.directory = tempfile.TemporaryDirectory()
        self.db_path = Path(self.directory.name) / "evidence.sqlite3"
        self.env = patch.dict(os.environ, {
            "DATABASE_PATH": str(self.db_path),
            "STRIPE_WEBHOOK_SECRET": SIGNING_SECRET,
            "STRIPE_EXPECT_LIVEMODE": "false",
            "RACE_PAYMENT_LINK_ID": "plink_signed_race",
            "RACE_PRICE_ID": "price_signed_monthly",
        })
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.directory.cleanup()

    @staticmethod
    def payload(obj):
        return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()

    def send(self, obj):
        raw = self.payload(obj)
        with self.module.app.test_client() as client:
            return client.post("/webhook", data=raw,
                headers={"Stripe-Signature": signed(raw)},
                content_type="application/json")

    def records(self):
        with self.module.store.database() as db:
            return {
                table: db.execute("SELECT COUNT(*) FROM " + table).fetchone()[0]
                for table in ("race_subscriptions", "race_paid_periods",
                              "race_blocks", "race_webhook_receipts")
            }

    def test_verified_receipt_hash_and_no_raw_body(self):
        e = event("checkout.session.completed", checkout())
        raw = self.payload(e)
        response = self.send(e)
        self.assertEqual(response.status_code, 200)
        with self.module.store.database() as db:
            row = db.execute("SELECT event_id,raw_sha256,event_type,event_created,handled "
                             "FROM race_webhook_receipts").fetchone()
        self.assertEqual(row, (e["id"], hashlib.sha256(raw).hexdigest(),
                               e["type"], e["created"], 1))
        self.assertEqual(self.records()["race_subscriptions"], 1)

    def test_identical_event_retries_acknowledged_only_once(self):
        e = event("checkout.session.completed", checkout())
        self.assertEqual(self.send(e).status_code, 200)
        second = self.send(e)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json["duplicate"])
        self.assertEqual(self.records()["race_subscriptions"], 1)
        self.assertEqual(self.records()["race_webhook_receipts"], 1)

    def test_same_event_id_different_signed_payload_refused(self):
        e = event("checkout.session.completed", checkout())
        self.assertEqual(self.send(e).status_code, 200)
        altered = event("checkout.session.completed", dict(checkout(), amount_total=1))
        altered["id"] = e["id"]
        response = self.send(altered)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json["error"], "event_id_collision")
        self.assertEqual(self.records()["race_webhook_receipts"], 1)
        self.assertEqual(self.records()["race_subscriptions"], 1)

    def test_same_event_id_cannot_be_repurposed_to_revoke(self):
        c = event("checkout.session.completed", checkout())
        p = event("invoice.paid", invoice(), created=BASE+21)
        self.send(c); self.send(p)
        self.assertTrue(self.module.store.is_active("sub_signed_123", now=BASE+22))
        cancel = event("customer.subscription.deleted", {"id": "sub_signed_123"}, created=BASE+30)
        cancel["id"] = c["id"]
        self.assertEqual(self.send(cancel).status_code, 409)
        self.assertTrue(self.module.store.is_active("sub_signed_123", now=BASE+31))

    def test_receipt_failure_rolls_back_checkout_effect(self):
        e = event("checkout.session.completed", checkout())
        with patch.object(self.module.store, "put_receipt",
                          side_effect=sqlite3.OperationalError("injected disk error")):
            self.assertEqual(self.send(e).status_code, 503)
        self.assertEqual(self.records()["race_subscriptions"], 0)
        self.assertEqual(self.records()["race_webhook_receipts"], 0)
        self.assertEqual(self.send(e).status_code, 200)
        self.assertEqual(self.records()["race_subscriptions"], 1)

    def test_parallel_same_event_delivery_is_idempotent(self):
        e = event("checkout.session.completed", checkout())
        with ThreadPoolExecutor(max_workers=8) as pool:
            responses = list(pool.map(self.send, [e] * 16))
        self.assertEqual([x.status_code for x in responses], [200] * 16)
        self.assertEqual(self.records()["race_subscriptions"], 1)
        self.assertEqual(self.records()["race_webhook_receipts"], 1)

    def test_parallel_invoice_and_checkout_do_not_lose_evidence(self):
        c = event("checkout.session.completed", checkout())
        p = event("invoice.paid", invoice(), created=BASE+21)
        with ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(lambda e: self.send(e).status_code, (c, p)))
        self.assertEqual(codes, [200, 200])
        self.assertTrue(self.module.store.is_active("sub_signed_123", now=BASE+22))
        self.assertEqual(self.records()["race_webhook_receipts"], 2)

    def test_process_restart_reads_same_durable_sqlite_file(self):
        self.send(event("checkout.session.completed", checkout()))
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        code = (
            "import sys;sys.path.insert(0,sys.argv[1]);"
            "import subscription_store as s;"
            "print('ACTIVE' if s.is_active('sub_signed_123', 1800000022) else 'BLOCKED')"
        )
        proc = subprocess.run([sys.executable, "-I", "-c", code, str(ROOT)],
                              capture_output=True, text=True, timeout=10,
                              env=os.environ.copy())
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.strip(), "ACTIVE")

    def test_sqlite_consistent_snapshot_restore(self):
        self.send(event("checkout.session.completed", checkout()))
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        backup = Path(self.directory.name) / "snapshot.sqlite3"
        with sqlite3.connect(str(self.db_path)) as source:
            with sqlite3.connect(str(backup)) as dst:
                source.backup(dst)
        with sqlite3.connect(str(backup)) as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        with patch.dict(os.environ, {"DATABASE_PATH": str(backup)}):
            self.assertTrue(self.module.store.is_active("sub_signed_123", BASE+22))
            with self.module.store.database() as db:
                self.assertEqual(db.execute("SELECT count(*) FROM race_webhook_receipts")
                                 .fetchone()[0], 2)

    def test_unsigned_or_bad_event_id_rejected_no_receipt(self):
        bad = event("checkout.session.completed", checkout())
        bad["id"] = "not_an_event_id"
        self.assertEqual(self.send(bad).status_code, 400)
        self.assertEqual(self.records()["race_webhook_receipts"], 0)

    def test_unsupported_signed_event_does_not_mutate_ledger(self):
        e = event("charge.succeeded", {"id": "ch_example"})
        response = self.send(e)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["handled"], False)
        self.assertEqual(self.records()["race_webhook_receipts"], 0)


if __name__ == "__main__":
    unittest.main()
