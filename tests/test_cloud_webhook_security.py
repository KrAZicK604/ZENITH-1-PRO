"""Offline webhook security tests: no Stripe account or live keys required."""
import importlib
import os
import tempfile
import unittest
from unittest.mock import patch

class WebhookSecurityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "DATABASE_PATH": self.tmp.name + "/entitlements.db",
            "STRIPE_WEBHOOK_SECRET": "whsec_test_only",
            "RACE_PAYMENT_LINK_ID": "plink_race_test",
        })
        self.env.start()
        self.module = importlib.import_module("cloud_webhook")
        self.client = self.module.app.test_client()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def event(self, **changes):
        session = {
            "id": "cs_test_payment_123", "payment_status": "paid",
            "amount_total": 2900, "currency": "cad",
            "payment_link": "plink_race_test",
            "customer_details": {"email": "player@example.com"},
        }
        session.update(changes)
        return {"type": "checkout.session.completed", "data": {"object": session}}

    def post(self, event):
        with patch.object(self.module.stripe.Webhook, "construct_event", return_value=event):
            return self.client.post("/webhook", data=b"signed-test-payload",
                                    headers={"Stripe-Signature": "t=1,v1=simulated"})

    def count(self):
        with self.module._connect() as db:
            return db.execute("SELECT count(*) FROM entitlements").fetchone()[0]

    def test_missing_signature_rejected(self):
        self.assertEqual(self.client.post("/webhook", data=b"{}").status_code, 400)
        self.assertEqual(self.count(), 0)

    def test_invalid_signature_rejected(self):
        from stripe.error import SignatureVerificationError
        with patch.object(self.module.stripe.Webhook, "construct_event",
                          side_effect=SignatureVerificationError("bad", "sig")):
            response = self.client.post("/webhook", data=b"{}",
                headers={"Stripe-Signature": "bad"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.count(), 0)

    def test_missing_secret_fails_closed(self):
        with patch.dict(os.environ, {"STRIPE_WEBHOOK_SECRET": ""}):
            self.assertEqual(self.post(self.event()).status_code, 503)
        self.assertEqual(self.count(), 0)

    def test_paid_exact_product_granted_only_once(self):
        self.assertEqual(self.post(self.event()).status_code, 200)
        self.assertEqual(self.post(self.event()).status_code, 200)
        self.assertEqual(self.count(), 1)

    def test_unpaid_wrong_amount_wrong_link_and_wrong_currency(self):
        cases = [
            {"payment_status": "unpaid"}, {"amount_total": 1},
            {"payment_link": "plink_other"}, {"currency": "usd"},
            {"customer_details": {}}, {"id": "invalid"},
        ]
        for change in cases:
            with self.subTest(change=change):
                self.assertEqual(self.post(self.event(**change)).status_code, 200)
        self.assertEqual(self.count(), 0)

    def test_unconfigured_link_fails_closed(self):
        with patch.dict(os.environ, {"RACE_PAYMENT_LINK_ID": ""}):
            self.assertEqual(self.post(self.event()).status_code, 503)
        self.assertEqual(self.count(), 0)

    def test_other_events_ignored(self):
        self.assertEqual(self.post({"type": "charge.succeeded"}).status_code, 200)
        self.assertEqual(self.count(), 0)

    def test_public_email_lookup_removed(self):
        self.assertEqual(self.client.get("/check/player@example.com").status_code, 404)
        self.assertEqual(self.client.get("/paid_users").status_code, 404)

    def test_storage_error_retries(self):
        with patch.object(self.module, "_connect", side_effect=OSError("disk unavailable")):
            self.assertEqual(self.post(self.event()).status_code, 503)

if __name__ == "__main__":
    unittest.main()
