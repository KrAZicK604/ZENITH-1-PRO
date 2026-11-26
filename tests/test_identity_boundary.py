"""Interim safety gate: no public session issuance until independent auth exists."""
import unittest
import cloud_webhook


class PublicIdentityBoundaryTests(unittest.TestCase):
    def test_no_public_player_session_or_customer_lookup_routes(self):
        paths = {r.rule for r in cloud_webhook.app.url_map.iter_rules()}
        self.assertTrue(paths <= {"/", "/webhook", "/static/<path:filename>"}, paths)
        self.assertIn("/", paths)
        self.assertIn("/webhook", paths)
        for route in cloud_webhook.app.url_map.iter_rules():
            if route.rule == "/webhook":
                self.assertEqual(set(route.methods) - {"HEAD", "OPTIONS"}, {"POST"})
            self.assertNotIn("session", route.rule)
            self.assertNotIn("customer", route.rule)

    def test_no_authenticated_player_route_is_claimed(self):
        self.assertNotIn("/player/entitlement",
            {r.rule for r in cloud_webhook.app.url_map.iter_rules()})
