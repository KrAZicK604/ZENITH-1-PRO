"""Gate 7 sandbox readiness falsification and refund/dispute negative controls.

The snapshot contains only the read-only account catalog observed in sandbox.
HMAC events in this suite are locally constructed, not Stripe-delivered.
"""
import copy
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools.stripe_sandbox_preflight import DEFAULT_SNAPSHOT, REQUIRED_EVENTS, inspect

from test_webhook_crypto import SIGNING_SECRET, BASE, checkout, event, invoice, signed


class SandboxReadinessTests(unittest.TestCase):
    def setUp(self):
        self.snap = json.loads(DEFAULT_SNAPSHOT.read_text(encoding="utf-8"))

    def ready_fixture(self):
        s = copy.deepcopy(self.snap)
        s["prices"].append({
            "id": "price_sandbox_mars_29", "currency": "cad",
            "unit_amount": 2900, "recurring_interval": "month",
            "product_name": "Mars Race",
        })
        s["payment_links"].append({
            "id": "plink_sandbox_mars_29", "price_id": "price_sandbox_mars_29",
            "url": "https://buy.stripe.com/sandbox-only", "active": True,
            "livemode": False,
        })
        s["webhook_endpoints"].append({
            "status": "enabled", "livemode": False,
            "url": "https://sandbox.example.test/webhook",
            "enabled_events": sorted(REQUIRED_EVENTS),
        })
        return s

    def test_command_line_require_ready_exits_blocked(self):
        result = subprocess.run(
            [sys.executable, "-I", str(ROOT / "tools" / "stripe_sandbox_preflight.py"),
             "--snapshot", str(DEFAULT_SNAPSHOT), "--require-ready"],
            cwd=str(ROOT), capture_output=True, text=True, timeout=10
        )
        self.assertEqual(result.returncode, 2, result.stderr)
        output = json.loads(result.stdout)
        self.assertFalse(output["ready"])
        self.assertEqual(output["production_authority"], "NONE")

    def test_actual_observed_sandbox_blocks_paid_test(self):
        result = inspect(self.snap)
        self.assertFalse(result["ready"])
        self.assertEqual(result["matching_race_price_count"], 0)
        self.assertEqual(result["matching_race_link_count"], 0)
        self.assertEqual(result["matching_subscription_webhook_count"], 0)
        self.assertEqual(set(result["blockers"]), {
            "missing_or_ambiguous_sandbox_race_price",
            "missing_or_ambiguous_sandbox_race_payment_link",
            "missing_subscription_test_webhook_destination",
        })
        self.assertEqual(result["production_authority"], "NONE")
        self.assertFalse(result["stripe_originated_delivery_proven"])

    def test_source_snapshot_only_non_race_products_and_admin_events(self):
        self.assertEqual(self.snap["account_name"], "Qoiin sandbox")
        self.assertFalse(self.snap["livemode"])
        self.assertEqual(self.snap["subscription_count"], 0)
        self.assertEqual(self.snap["checkout_session_count"], 0)
        self.assertEqual(self.snap["events_count"], 33)
        self.assertEqual(sum(self.snap["event_type_counts"].values()), 33)
        self.assertFalse(any("invoice" in k or "checkout" in k
                             for k in self.snap["event_type_counts"]))
        self.assertTrue(all(p["currency"] == "usd" and p["recurring_interval"] is None
                            for p in self.snap["prices"]))

    def test_synthetic_full_prerequisites_only_prove_readiness_not_delivery(self):
        result = inspect(self.ready_fixture())
        self.assertTrue(result["ready"])
        self.assertFalse(result["stripe_originated_delivery_proven"])

    def test_missing_any_prerequisite_blocks(self):
        valid = self.ready_fixture()
        for key in ("prices", "payment_links", "webhook_endpoints"):
            with self.subTest(missing=key):
                corrupted = copy.deepcopy(valid)
                corrupted[key] = []
                self.assertFalse(inspect(corrupted)["ready"])

    def test_wrong_live_mode_blocks_even_complete_fixture(self):
        valid = self.ready_fixture()
        for field, container in [
            ("livemode", None),
            ("livemode", "payment_links"),
            ("livemode", "webhook_endpoints"),
        ]:
            with self.subTest(container=container):
                trial = copy.deepcopy(valid)
                if container is None:
                    trial["livemode"] = True
                else:
                    trial[container][0]["livemode"] = True
                self.assertFalse(inspect(trial)["ready"])

    def test_wrong_product_currency_amount_interval_and_link_block(self):
        valid = self.ready_fixture()
        changes = [
            ("prices", "currency", "usd"),
            ("prices", "unit_amount", 3000),
            ("prices", "recurring_interval", None),
            ("prices", "product_name", "School"),
            ("payment_links", "price_id", "price_school"),
            ("payment_links", "active", False),
            ("payment_links", "url", "https://example.com/checkout"),
            ("webhook_endpoints", "status", "disabled"),
            ("webhook_endpoints", "enabled_events", ["checkout.session.completed"]),
        ]
        for section, field, value in changes:
            with self.subTest(section=section, field=field):
                trial = copy.deepcopy(valid)
                # Only the synthetic race price is last in the observed list.
                target = trial[section][-1 if section == "prices" else 0]
                target[field] = value
                self.assertFalse(inspect(trial)["ready"])

    def test_incomplete_pagination_or_unknown_schema_fail_closed(self):
        for page in ("prices_has_more", "links_has_more", "webhooks_has_more"):
            trial = self.ready_fixture()
            trial["pagination"][page] = True
            self.assertFalse(inspect(trial)["ready"])
        self.assertFalse(inspect({"schema": "unknown"})["ready"])

    def test_duplicates_and_ambiguous_sandbox_race_products_block(self):
        trial = self.ready_fixture()
        duplicate = copy.deepcopy(trial["prices"][-1])
        duplicate["id"] = "price_other"
        trial["prices"].append(duplicate)
        self.assertFalse(inspect(trial)["ready"])

    def test_malformed_webhook_event_lists_never_raise_or_grant(self):
        for unexpected in ([{"bad": "event"}], [[]], [None], [1], ["x", []]):
            with self.subTest(unexpected=unexpected):
                obj = self.ready_fixture()
                obj["webhook_endpoints"][0]["enabled_events"] = unexpected
                self.assertFalse(inspect(obj)["ready"])

    def test_malformed_injections_never_raise_or_grant(self):
        for bad in (None, "", 0, [], {"schema": "zenith-stripe-sandbox-preflight-v1",
                                     "prices": None, "payment_links": True,
                                     "webhook_endpoints": {}}):
            with self.subTest(bad=repr(bad)):
                self.assertFalse(inspect(bad)["ready"])


class PaymentReversalGapTests(unittest.TestCase):
    """Intentionally records an unresolved safety defect, not a successful gate."""

    def setUp(self):
        import cloud_webhook
        self.module = cloud_webhook
        self.tmp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {
            "DATABASE_PATH": self.tmp.name + "/reversal-gap.db",
            "STRIPE_WEBHOOK_SECRET": SIGNING_SECRET,
            "STRIPE_EXPECT_LIVEMODE": "false",
            "RACE_PAYMENT_LINK_ID": "plink_signed_race",
            "RACE_PRICE_ID": "price_signed_monthly",
        })
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def post(self, obj):
        raw = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
        with self.module.app.test_client() as client:
            return client.post("/webhook", data=raw, headers={
                "Stripe-Signature": signed(raw)}, content_type="application/json")

    def test_refund_and_dispute_are_not_handled_and_active_remains_true(self):
        """Counterexample: a $29 paid interval is not automatically revoked on refund."""
        self.assertEqual(self.post(event("checkout.session.completed", checkout())).status_code, 200)
        self.assertEqual(self.post(event("invoice.paid", invoice(), BASE+21)).status_code, 200)
        self.assertTrue(self.module.store.is_active("sub_signed_123", BASE+22))
        for typ in ("charge.refunded", "charge.dispute.created"):
            # True Stripe correlation to payment intent/customer is NOT supplied.
            result = self.post(event(typ, {"id": "ch_or_dp_synthetic"}, BASE+30))
            self.assertEqual(result.status_code, 200)
            self.assertFalse(result.json["handled"])
        self.assertTrue(self.module.store.is_active("sub_signed_123", BASE+31),
                        "Known fraud/refund revocation gap vanished unexpectedly")
        # The current policy is not safe to promote to real paid game entitlement
        # until an independently authenticated Stripe payment-to-subscription mapping exists.


if __name__ == "__main__":
    unittest.main()
