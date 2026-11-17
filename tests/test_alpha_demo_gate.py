"""Static ALPHA demo safety checks. Not Stripe/backend certification."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "FINAL_ALPHA_v2_1_REPAIRED_LOCAL.html"

class AlphaDemoGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = HTML.read_text(encoding="utf-8")
        cls.script = cls.source.split("<script>", 1)[1].split("</script>", 1)[0]

    def test_notice_discloses_unverified_financial_claims(self):
        self.assertIn("We're sorry for the confusion", self.source)
        self.assertIn("free local demo", self.source)

    def test_no_client_side_payment_unlock(self):
        for token in ("autoUnlock(", "race_unlocked", "payment=success", "params.get('payment'", 'params.get("payment"'):
            with self.subTest(token=token):
                self.assertNotIn(token, self.script)
        self.assertIn("game.unlocked = false", self.script)

    def test_no_checkout_or_fake_online_count(self):
        self.assertNotIn("buy.stripe.com/", self.source)
        self.assertIn('id="online-count">LIVE COUNT UNAVAILABLE', self.source)
        self.assertIn("PAID RACES — NOT AVAILABLE", self.source)

    def test_race_is_explicitly_free(self):
        self.assertIn("START FREE DEMO RACE", self.source)
        self.assertIn("no cash prize", self.script)
        self.assertIn("demo credits (not cash)", self.script)

    def test_jarvis_does_not_insert_user_html(self):
        self.assertNotIn("chat.innerHTML+=", self.script)
        self.assertIn("document.createTextNode(message)", self.script)

    def test_demo_points_start_at_zero(self):
        self.assertIn("game.points = 0", self.script)
        self.assertIn("game.earnings = 0", self.script)

    def test_boost_persists_between_animation_frames(self):
        self.assertIn("let boostSpeed = 0;", self.script)
        self.assertIn("boostSpeed+=120;", self.script)
        self.assertIn("game.speed=80+elapsed*600+boostSpeed;", self.script)
        self.assertIn("game.fuel=100;boostSpeed=0;", self.script)

    def test_initial_state_contains_no_fabricated_score(self):
        self.assertIn("room:'local-demo', points:0, earnings:0", self.script)

if __name__ == "__main__":
    unittest.main()
