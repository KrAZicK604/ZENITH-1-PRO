"""Regression tests for race/course/school checkout product mapping.

Amounts and links pinned against the live Stripe catalogue verified 2026-11-11.
Revalidate these assertions when authorized prices or links change.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = {
    "race": ("bJebIU54dghRa3j2SW8bS01", "29"),
    "course": ("00wfZa7cle9J5N379c8bS02", "199"),
    "school": ("cNicMY68hfdN5N35148bS03", "999"),
}


class CheckoutMappingTests(unittest.TestCase):
    def test_live_stripe_urls_present_in_both_frontends(self):
        for relative_path in ("app.py", "public/index.html"):
            content = (ROOT / relative_path).read_text(encoding="utf-8")
            with self.subTest(file=relative_path):
                for name, (suffix, amount) in PRODUCTS.items():
                    self.assertEqual(
                        content.count("https://buy.stripe.com/" + suffix), 1,
                        msg=f"{name} checkout missing or duplicated in {relative_path}",
                    )
                    self.assertIn(amount, content)

    def test_mars_race_monthly_terms_disclosed(self):
        for path in ("app.py", "public/index.html"):
            content = (ROOT / path).read_text(encoding="utf-8").lower()
            with self.subTest(file=path):
                self.assertIn("monthly", content)
                self.assertIn("29", content)
                self.assertIn("cad", content)

    def test_no_mismatched_anchor_prices(self):
        page = (ROOT / "public/index.html").read_text(encoding="utf-8")
        anchors = re.findall(r'<a class="cta" href="(https://buy[.]stripe[.]com/[^"]+)"[^>]*>([^<]+)</a>', page)
        self.assertEqual(len(anchors), 3)
        mapping = {url.split("/")[-1]: label for url, label in anchors}
        for name, (suffix, amount) in PRODUCTS.items():
            with self.subTest(product=name):
                self.assertIn(amount, mapping[suffix])
        self.assertIn("month", mapping[PRODUCTS["race"][0]].lower())


if __name__ == "__main__":
    unittest.main()
