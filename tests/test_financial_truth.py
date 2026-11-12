"""No live money, remote requests, or secret values are needed for these checks."""
import io
import os
from pathlib import Path
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest.mock import patch

import stripe_connector as finance
import check_pending

ROOT = Path(__file__).resolve().parents[1]


class FinancialTruthTests(unittest.TestCase):
    def test_no_credentials_never_returns_fake_balance(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(finance.init_stripe())
            with self.assertRaises(RuntimeError):
                finance.get_balance()
            with self.assertRaises(RuntimeError):
                finance.get_payments()

    def test_invalid_or_mismatched_credentials_rejected(self):
        cases = [
            {"STRIPE_SECRET_KEY": "sk_live_mock", "STRIPE_EXPECT_LIVEMODE": "false"},
            {"STRIPE_SECRET_KEY": "sk_test_mock", "STRIPE_EXPECT_LIVEMODE": "true"},
            {"STRIPE_SECRET_KEY": "sk_test_REPLACE", "STRIPE_EXPECT_LIVEMODE": "false"},
            {"STRIPE_SECRET_KEY": "sk_test_mock"},
        ]
        for case in cases:
            with self.subTest(case=case), patch.dict(os.environ, case, clear=True):
                self.assertFalse(finance.init_stripe())
                with self.assertRaises(RuntimeError):
                    finance.get_balance()

    def test_mocked_test_account_balance_is_not_generated_data(self):
        balance = SimpleNamespace(
            available=[SimpleNamespace(amount=123, currency="cad")],
            pending=[SimpleNamespace(amount=987, currency="cad")],
        )
        with patch.dict(os.environ, {
            "STRIPE_SECRET_KEY": "sk_test_local_fixture",
            "STRIPE_EXPECT_LIVEMODE": "false",
        }, clear=True):
            with patch.object(finance.stripe.Balance, "retrieve", return_value=balance) as read:
                self.assertIs(finance.get_balance(), balance)
                read.assert_called_once_with()

    def test_mocked_recent_charges_are_not_demo_sales(self):
        entries = [SimpleNamespace(id="ch_fixture", amount=2900,
                                   currency="cad", status="succeeded",
                                   created=1800000000, billing_details={"email": "secret"})]
        with patch.dict(os.environ, {
            "STRIPE_SECRET_KEY": "sk_test_local_fixture",
            "STRIPE_EXPECT_LIVEMODE": "false",
        }, clear=True):
            with patch.object(finance.stripe.Charge, "list",
                              return_value=SimpleNamespace(data=entries)) as read:
                result = finance.get_payments(4)
        read.assert_called_once_with(limit=4)
        self.assertEqual(result, [{
            "id": "ch_fixture", "amount": 2900, "currency": "cad",
            "status": "succeeded", "created": 1800000000,
        }])
        self.assertNotIn("customer", result[0])

    def test_limit_and_mutation_blocked(self):
        with patch.dict(os.environ, {
            "STRIPE_SECRET_KEY": "sk_test_fixture",
            "STRIPE_EXPECT_LIVEMODE": "false",
        }, clear=True):
            for limit in (0, 101, -1, True, 1.5):
                with self.subTest(limit=limit), self.assertRaises(ValueError):
                    finance.get_payments(limit)
        with self.assertRaises(PermissionError):
            finance.create_payment_link(2900, "Race")

    def test_command_without_secret_reports_unavailable_not_zero(self):
        out = io.StringIO()
        with patch.dict(os.environ, {}, clear=True), redirect_stdout(out):
            code = check_pending.main()
        self.assertEqual(code, 1)
        value = out.getvalue().lower()
        self.assertIn("unavailable", value)
        self.assertNotIn("3,683", value)
        self.assertNotIn("$0.00", value)

    def test_checkout_product_mapping_correct(self):
        self.assertEqual(
            finance.PAYMENT_LINKS["race_29_monthly"],
            "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01")
        self.assertEqual(
            finance.PAYMENT_LINKS["course_199_one_time"],
            "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02")
        self.assertEqual(
            finance.PAYMENT_LINKS["school_999_one_time"],
            "https://buy.stripe.com/cNicMY68hfdN5N35148bS03")
        html = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
        for url in finance.PAYMENT_LINKS.values():
            self.assertIn(url, html)

    def test_old_fake_money_and_wrong_race_link_not_in_active_scripts(self):
        paths = ["stripe_connector.py", "check_pending.py"]
        for p in paths:
            content = (ROOT / p).read_text(encoding="utf-8")
            with self.subTest(file=p):
                self.assertNotIn("3,683", content)
                self.assertNotIn("3683", content)
                self.assertNotIn("demo_1", content)

    def test_powershell_transfer_path_disabled(self):
        script = (ROOT / "stripe_payout.ps1").read_text(encoding="utf-8")
        wrapper = (ROOT / "redirect_all_funds.ps1").read_text(encoding="utf-8")
        self.assertIn('if ($Action -eq "payout")', script)
        self.assertIn("exit 2", script)
        self.assertNotIn("-METHOD POST", script.upper())
        self.assertNotIn("Read-Host", script)
        self.assertIn("exit 2", wrapper)
        self.assertNotIn("stripe_payout.ps1 -Action payout", wrapper)


if __name__ == "__main__":
    unittest.main()
