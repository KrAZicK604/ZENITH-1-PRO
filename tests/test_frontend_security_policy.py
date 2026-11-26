import json
from pathlib import Path
import unittest


class FrontendPolicyTests(unittest.TestCase):
    def test_static_policy(self):
        config = json.loads((Path(__file__).resolve().parents[1]/"vercel.json").read_text())
        self.assertEqual(config["outputDirectory"], "public")
        rule = next(r for r in config["headers"] if r["source"] == "/(.*)")
        headers = {h["key"].lower(): h["value"] for h in rule["headers"]}
        self.assertEqual(headers["x-content-type-options"], "nosniff")
        self.assertEqual(headers["x-frame-options"], "DENY")
        for directive in ("default-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"):
            self.assertIn(directive, headers["content-security-policy"].split("; "))
        self.assertEqual(headers["permissions-policy"], "camera=(), microphone=(), geolocation=(), payment=()")
