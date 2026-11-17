"""Pure, offline sandbox preflight regression tests."""
import unittest
import sandbox_preflight as preflight


class PreflightTests(unittest.TestCase):
    def good(self):
        return {
            "STRIPE_EXPECT_LIVEMODE": "false",
            "STRIPE_WEBHOOK_SECRET": "whsec_local_test_nonproduction",
            "RACE_PRICE_ID": preflight.SANDBOX_PRICE,
            "RACE_PAYMENT_LINK_ID": "plink_local_test_nonproduction",
            "DATABASE_PATH": "/var/data/zenith.sqlite3",
            "ZENITH_DURABLE_STORAGE_REVIEWED": "true",
            "ZENITH_WEBHOOK_DESTINATION_REVIEWED": "true",
            "ZENITH_AUTH_BINDING_REVIEWED": "true",
            "ZENITH_EXTERNAL_REVIEW_APPROVED": "true",
        }

    def test_missing_configuration_abstains(self):
        errors = preflight.check({})
        self.assertIn("MODE_NOT_EXPLICIT_SANDBOX", errors)
        self.assertIn("INDEPENDENT_REVIEW_NOT_ATTESTED", errors)

    def test_reference_template_is_not_accepted(self):
        cfg = self.good()
        cfg["STRIPE_WEBHOOK_SECRET"] = "whsec_REPLACE_WITH_SANDBOX_WEBHOOK_SECRET"
        cfg["RACE_PAYMENT_LINK_ID"] = "plink_REPLACE_WITH_SANDBOX_PAYMENT_LINK"
        self.assertIn("SIGNING_SECRET_MISSING_OR_TEMPLATE", preflight.check(cfg))
        self.assertIn("PAYMENT_LINK_NOT_CONFIGURED", preflight.check(cfg))

    def test_wrong_mode_and_price_fail(self):
        cfg = self.good()
        cfg["STRIPE_EXPECT_LIVEMODE"] = "true"
        cfg["RACE_PRICE_ID"] = "price_wrong"
        self.assertIn("MODE_NOT_EXPLICIT_SANDBOX", preflight.check(cfg))
        self.assertIn("SANDBOX_PRICE_ID_MISMATCH", preflight.check(cfg))

    def test_every_attestation_required(self):
        for key in ("ZENITH_DURABLE_STORAGE_REVIEWED",
                    "ZENITH_WEBHOOK_DESTINATION_REVIEWED",
                    "ZENITH_AUTH_BINDING_REVIEWED",
                    "ZENITH_EXTERNAL_REVIEW_APPROVED"):
            cfg = self.good()
            cfg.pop(key)
            with self.subTest(key=key):
                self.assertNotEqual(preflight.check(cfg), [])

    def test_shape_only_never_authenticates_stripe(self):
        self.assertEqual(preflight.check(self.good()), [])


if __name__ == "__main__":
    unittest.main()
