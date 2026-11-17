"""Static deployment boundary regression checks (no network, no Stripe writes).

These checks constrain repository configuration only; they cannot prove actual
Vercel runtime isolation, authentication, or database persistence.
"""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class StaticDeploymentBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vercel = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))

    def test_static_output_directory_is_explicit(self):
        self.assertEqual(self.vercel.get("outputDirectory"), "public")
        self.assertIsNone(self.vercel.get("framework"))
        self.assertIsNone(self.vercel.get("buildCommand"))

    def test_no_function_routes_or_rewrites_in_vercel_config(self):
        for key in ("functions", "routes", "rewrites", "redirects", "crons"):
            with self.subTest(key=key):
                self.assertNotIn(key, self.vercel)

    def test_static_site_does_not_embed_entitlement_or_stripe_secrets(self):
        html = (ROOT / "public/index.html").read_text(encoding="utf-8")
        for token in ("STRIPE_WEBHOOK_SECRET", "DATABASE_PATH", "whsec_",
                      "sk_live_", "sk_test_", "RACE_PRICE_ID",
                      "is_active(", "/webhook"):
            with self.subTest(token=token):
                self.assertNotIn(token, html)

    def test_security_headers_are_present(self):
        headers = self.vercel.get("headers", [])
        self.assertTrue(headers)
        found = {item.get("key"): item.get("value") for rule in headers
                 for item in rule.get("headers", [])}
        self.assertEqual(found.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(found.get("X-Frame-Options"), "DENY")
        self.assertIn("default-src 'none'", found.get("Content-Security-Policy", ""))
        self.assertIn("form-action 'none'", found.get("Content-Security-Policy", ""))


if __name__ == "__main__":
    unittest.main()
