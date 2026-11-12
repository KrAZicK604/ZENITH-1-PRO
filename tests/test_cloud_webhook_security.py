"""Mocked Stripe event tests; no account writes, real payments, or network."""
import importlib
import os
import tempfile
import unittest
from unittest.mock import patch

BASE = 1800000000
END = BASE + 30 * 86400


class WebhookSecurityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "DATABASE_PATH": self.tmp.name + "/ledger.sqlite3",
            "STRIPE_WEBHOOK_SECRET": "whsec_local_mock",
            "RACE_PAYMENT_LINK_ID": "plink_race_test",
            "RACE_PRICE_ID": "price_race_test",
            "STRIPE_EXPECT_LIVEMODE": "false",
        })
        self.env.start()
        self.module = importlib.import_module("cloud_webhook")
        self.client = self.module.app.test_client()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def event(self, typ, obj, created=BASE+2, live=False):
        return {"id": "evt_test", "created": created, "livemode": live,
                "type": typ, "data": {"object": obj}}

    def checkout(self, **changes):
        obj = {"id": "cs_test_1", "mode": "subscription",
               "subscription": "sub_test_1", "customer": "cus_test_1",
               "payment_status": "paid", "amount_total": 2900, "currency": "cad",
               "payment_link": "plink_race_test",
               "customer_details": {"email": "player@example.com"}}
        obj.update(changes)
        return self.event("checkout.session.completed", obj)

    def invoice(self, iid="in_test_1", created=BASE+3, **changes):
        obj = {"id": iid, "status": "paid", "paid": True,
               "currency": "cad", "amount_paid": 2900, "total": 2900,
               "customer": "cus_test_1",
               "parent": {"subscription_details": {"subscription": "sub_test_1"}},
               "billing_reason": "subscription_create",
               "lines": {"has_more": False, "data": [{
                   "price": {"id": "price_race_test"}, "quantity": 1,
                   "period": {"start": BASE, "end": END},
               }]}}
        obj.update(changes)
        return self.event("invoice.paid", obj, created)

    def post(self, event):
        with patch.object(self.module.stripe.Webhook, "construct_event", return_value=event):
            return self.client.post("/webhook", data=b"mock-signed-payload",
                                    headers={"Stripe-Signature": "t=1,v1=mock"})

    def active(self):
        return self.module.store.is_active("sub_test_1", BASE+20)

    def test_missing_and_invalid_signature(self):
        self.assertEqual(self.client.post("/webhook", data=b"{}").status_code, 400)
        from stripe import SignatureVerificationError
        with patch.object(self.module.stripe.Webhook, "construct_event",
                          side_effect=SignatureVerificationError("bad", "sig")):
            self.assertEqual(self.client.post("/webhook", data=b"{}",
                headers={"Stripe-Signature": "bad"}).status_code, 400)

    def test_fail_closed_missing_configuration(self):
        for key in ("STRIPE_WEBHOOK_SECRET", "RACE_PAYMENT_LINK_ID",
                    "RACE_PRICE_ID", "STRIPE_EXPECT_LIVEMODE"):
            with self.subTest(key=key), patch.dict(os.environ, {key: ""}):
                self.assertEqual(self.post(self.checkout()).status_code, 503)

    def test_reject_live_event_with_test_config(self):
        self.assertEqual(self.post(self.event("checkout.session.completed", {},
                                             live=True)).status_code, 400)

    def test_checkout_only_is_not_entitlement(self):
        self.assertEqual(self.post(self.checkout()).status_code, 200)
        self.assertEqual(self.post(self.checkout()).status_code, 200)
        self.assertFalse(self.active())

    def test_verified_checkout_and_paid_invoice(self):
        self.post(self.checkout()); self.post(self.invoice())
        self.assertTrue(self.active())
        self.assertFalse(self.module.store.is_active("sub_test_1", END))

    def test_out_of_order_paid_invoice_before_checkout(self):
        self.post(self.invoice())
        self.assertFalse(self.active())
        self.post(self.checkout())
        self.assertTrue(self.active())

    def test_reject_wrong_checkout(self):
        for changes in ({"payment_link": "plink_wrong"}, {"amount_total": 1},
                        {"currency": "usd"}, {"mode": "payment"},
                        {"payment_status": "unpaid"}, {"subscription": None},
                        {"customer": None}, {"customer_details": {}}):
            with self.subTest(changes=changes):
                self.assertFalse(self.post(self.checkout(**changes)).json["handled"])
        self.assertFalse(self.active())

    def test_reject_wrong_invoice(self):
        self.post(self.checkout())
        for changes in ({"amount_paid": 1}, {"total": 1}, {"currency": "usd"},
                        {"paid": False}, {"status": "open"},
                        {"billing_reason": "manual"}, {"customer": "cus_other"}):
            with self.subTest(changes=changes):
                self.post(self.invoice(**changes))
        self.assertFalse(self.active())

    def test_reject_wrong_price_and_incomplete_lines(self):
        self.post(self.checkout())
        wrong = self.invoice()["data"]["object"]
        wrong["lines"]["data"][0]["price"]["id"] = "price_other"
        self.post(self.event("invoice.paid", wrong))
        self.assertFalse(self.active())
        extra = self.invoice()["data"]["object"]
        extra["lines"]["has_more"] = True
        self.post(self.event("invoice.paid", extra))
        self.assertFalse(self.active())

    def test_new_price_details_invoice_shape(self):
        self.post(self.checkout())
        inv = self.invoice()["data"]["object"]
        line = inv["lines"]["data"][0]
        del line["price"]
        line["pricing"] = {"price_details": {"price": "price_race_test"}}
        self.post(self.event("invoice.paid", inv))
        self.assertTrue(self.active())

    def test_failure_revokes_until_later_paid_invoice(self):
        self.post(self.checkout()); self.post(self.invoice())
        self.post(self.event("invoice.payment_failed", {
            "id": "in_failed", "parent": {"subscription_details": {"subscription": "sub_test_1"}}
        }, BASE+10))
        self.assertFalse(self.active())
        self.post(self.invoice(iid="in_later", created=BASE+11))
        self.assertTrue(self.active())

    def test_cancel_remains_revoked_after_later_paid_event(self):
        self.post(self.checkout()); self.post(self.invoice())
        self.post(self.event("customer.subscription.deleted", {"id": "sub_test_1"}, BASE+10))
        self.post(self.invoice(iid="in_later", created=BASE+20))
        self.assertFalse(self.active())

    def test_past_due_blocks_stale_paid_event(self):
        self.post(self.checkout())
        self.post(self.event("customer.subscription.updated",
                             {"id": "sub_test_1", "status": "past_due"}, BASE+80))
        self.post(self.invoice(created=BASE+70))
        self.assertFalse(self.active())

    def test_cancel_at_period_end_keeps_paid_interval(self):
        self.post(self.checkout()); self.post(self.invoice())
        self.post(self.event("customer.subscription.updated", {"id": "sub_test_1",
                             "status": "active", "cancel_at_period_end": True}, BASE+20))
        self.assertTrue(self.active())

    def test_no_public_email_lookup(self):
        self.assertEqual(self.client.get("/check/player@example.com").status_code, 404)
        self.assertEqual(self.client.get("/paid_users").status_code, 404)

    def test_storage_failure_returns_retryable_error(self):
        with patch.object(self.module.store, "record_checkout", side_effect=OSError("disk down")):
            self.assertEqual(self.post(self.checkout()).status_code, 503)

    def test_unrelated_event_ignored(self):
        self.assertEqual(self.post(self.event("charge.succeeded", {})).status_code, 200)


if __name__ == "__main__":
    unittest.main()
