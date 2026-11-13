"""End-to-end cryptographic webhook tests using actual stripe.Webhook verification.

All payloads and HMAC-SHA256 headers are locally authored. They are NOT
Stripe-delivered webhooks and this suite never connects to Stripe.
"""
import hashlib
import hmac
import importlib
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

BASE = 1800000000
END = BASE + 30 * 86400
SIGNING_SECRET = "whsec_authentic_local_test_123"


def event(event_type, object_data, created=BASE+20, livemode=False):
    evidence = {
        "object": "event",
        "type": event_type,
        "created": created,
        "livemode": livemode,
        "data": {"object": object_data},
    }
    digest = hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest()
    return {"id": "evt_fixture_" + digest[:24], **evidence}


def checkout():
    return {
        "id": "cs_signed_123",
        "mode": "subscription",
        "subscription": "sub_signed_123",
        "customer": "cus_signed_123",
        "payment_status": "paid",
        "amount_total": 2900,
        "currency": "cad",
        "payment_link": "plink_signed_race",
        "customer_details": {"email": "signed@example.test"},
    }


def invoice(invoice_id="in_signed_123"):
    return {
        "id": invoice_id, "status": "paid", "paid": True,
        "currency": "cad", "amount_paid": 2900, "total": 2900,
        "customer": "cus_signed_123",
        "parent": {"subscription_details": {"subscription": "sub_signed_123"}},
        "billing_reason": "subscription_create",
        "lines": {"has_more": False, "data": [
            {"pricing": {"price_details": {"price": "price_signed_monthly"}},
             "quantity": 1, "period": {"start": BASE, "end": END}}
        ]},
    }


def signed(payload, timestamp=None, secret=SIGNING_SECRET):
    """Construct Stripe-compatible t/v1 headers, not a mock of Stripe SDK."""
    timestamp = int(time.time()) if timestamp is None else timestamp
    mac = hmac.new(secret.encode("utf-8"),
                   str(timestamp).encode("ascii") + b"." + payload,
                   hashlib.sha256).hexdigest()
    return "t=%d,v1=%s" % (timestamp, mac)


class CryptographicWebhookTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "DATABASE_PATH": str(Path(self.directory.name) / "signed.sqlite3"),
            "STRIPE_WEBHOOK_SECRET": SIGNING_SECRET,
            "STRIPE_EXPECT_LIVEMODE": "false",
            "RACE_PAYMENT_LINK_ID": "plink_signed_race",
            "RACE_PRICE_ID": "price_signed_monthly",
        })
        self.env.start()
        self.module = importlib.import_module("cloud_webhook")
        self.client = self.module.app.test_client()

    def tearDown(self):
        self.env.stop()
        self.directory.cleanup()

    def send(self, value, header=None, body=None):
        body = (json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
                if body is None else body)
        return self.client.post("/webhook", data=body,
            headers={"Stripe-Signature": signed(body) if header is None else header},
            content_type="application/json")

    def active(self, now=BASE+21):
        return self.module.store.is_active("sub_signed_123", now=now)

    def test_actual_stripe_sdk_accepts_valid_hmac_and_grants_paid_period(self):
        self.assertEqual(self.send(event("checkout.session.completed", checkout())).status_code, 200)
        self.assertFalse(self.active())
        response = self.send(event("invoice.paid", invoice(), created=BASE+21))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["handled"])
        self.assertTrue(self.active())
        self.assertFalse(self.active(now=END))
        # Distinct connections to durable SQLite and identical repeated delivery.
        self.assertEqual(self.send(event("invoice.paid", invoice(), created=BASE+21)).status_code, 200)
        self.assertTrue(self.active())

    def test_authentic_hmac_is_invalid_for_mutated_payload(self):
        data = event("checkout.session.completed", checkout())
        original = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
        header = signed(original)
        altered = original.replace(b'"amount_total":2900', b'"amount_total":1')
        self.assertNotEqual(altered, original)
        self.assertEqual(self.send(data, header=header, body=altered).status_code, 400)
        self.assertFalse(self.active())

    def test_wrong_signing_secret_rejected(self):
        data = event("checkout.session.completed", checkout())
        payload = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
        self.assertEqual(self.send(data, header=signed(payload, secret="whsec_another")).status_code, 400)

    def test_correctly_signed_but_expired_timestamp_rejected(self):
        data = event("checkout.session.completed", checkout())
        payload = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
        self.assertEqual(self.send(data, header=signed(payload, timestamp=int(time.time())-600)).status_code, 400)
        self.assertFalse(self.active())

    def test_signed_malformed_json_rejected(self):
        self.assertEqual(self.send({}, body=b"{malformed}").status_code, 400)

    def test_signed_wrong_livemode_cannot_grant(self):
        response = self.send(event("checkout.session.completed", checkout(), livemode=True))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["error"], "wrong_stripe_mode")

    def test_signed_school_checkout_does_not_grant_race(self):
        data = checkout()
        data["payment_link"] = "plink_school"
        self.assertFalse(self.send(event("checkout.session.completed", data)).json["handled"])
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        self.assertFalse(self.active())

    def test_future_signed_paid_event_does_not_grant_early(self):
        self.send(event("checkout.session.completed", checkout(), created=BASE+20))
        self.send(event("invoice.paid", invoice(), created=BASE+100))
        self.assertFalse(self.active(now=BASE+50))
        self.assertTrue(self.active(now=BASE+100))

    def test_future_signed_checkout_does_not_grant_early(self):
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        self.send(event("checkout.session.completed", checkout(), created=BASE+100))
        self.assertFalse(self.active(now=BASE+50))
        self.assertTrue(self.active(now=BASE+100))

    def test_signed_failure_revokes_and_later_invoice_recovers(self):
        self.send(event("checkout.session.completed", checkout(), created=BASE+20))
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        failure = {"id": "in_failed", "parent": {"subscription_details": {
            "subscription": "sub_signed_123"}}}
        self.send(event("invoice.payment_failed", failure, created=BASE+30))
        self.assertFalse(self.active(now=BASE+40))
        self.send(event("invoice.paid", invoice("in_recovered"), created=BASE+50))
        self.assertFalse(self.active(now=BASE+49))
        self.assertTrue(self.active(now=BASE+50))

    def test_signed_terminal_cancellation_blocks_late_payment(self):
        self.send(event("checkout.session.completed", checkout(), created=BASE+20))
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        self.send(event("customer.subscription.deleted", {"id": "sub_signed_123"}, created=BASE+30))
        self.send(event("invoice.paid", invoice("in_after"), created=BASE+50))
        self.assertFalse(self.active(now=BASE+55))

    def test_placeholder_configuration_fails_without_trying_signature(self):
        data = event("checkout.session.completed", checkout())
        for field, value in (
            ("STRIPE_WEBHOOK_SECRET", "whsec_REPLACE_WITH_SANDBOX_SECRET"),
            ("RACE_PAYMENT_LINK_ID", "plink_REPLACE_WITH_SANDBOX_LINK"),
            ("RACE_PRICE_ID", "price_REPLACE_WITH_SANDBOX_PRICE"),
            ("STRIPE_WEBHOOK_SECRET", "whsec_"),
        ):
            with self.subTest(field=field, value=value):
                with patch.dict(os.environ, {field: value}):
                    self.assertEqual(self.send(data).status_code, 503)
        self.assertFalse(self.active())

    def test_database_reopening_preserves_evidence(self):
        self.send(event("checkout.session.completed", checkout()))
        self.send(event("invoice.paid", invoice(), created=BASE+21))
        reloaded_store = importlib.reload(self.module.store)
        self.assertTrue(reloaded_store.is_active("sub_signed_123", BASE+21))
        with reloaded_store.database() as db:
            self.assertEqual(db.execute("SELECT count(*) FROM race_paid_periods").fetchone()[0], 1)
            self.assertEqual(db.execute("SELECT count(*) FROM race_subscriptions").fetchone()[0], 1)

    def test_unconfigured_or_missing_storage_is_retryable(self):
        with patch.dict(os.environ, {"DATABASE_PATH": ""}):
            response = self.send(event("checkout.session.completed", checkout()))
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json["error"], "storage_unavailable")


if __name__ == "__main__":
    unittest.main()
