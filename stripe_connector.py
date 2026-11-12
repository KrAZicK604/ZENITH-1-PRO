"""Read-only Stripe account inspection for ZENITH-1-PRO.

Never fabricate balances, payments or payout schedules. This module is not a
billing authorization layer and must never be imported in a public frontend.
Real Stripe SDK data is returned only when the operator provides credentials
via process environment and explicitly selects test or live mode.
"""
import os
import stripe

PAYMENT_LINKS = {
    "race_29_monthly": "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01",
    "course_199_one_time": "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02",
    "school_999_one_time": "https://buy.stripe.com/cNicMY68hfdN5N35148bS03",
}


def init_stripe():
    """Return False unless explicit mode and secret key agree; never print key."""
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    mode = os.environ.get("STRIPE_EXPECT_LIVEMODE", "")
    if mode not in ("true", "false"):
        return False
    prefix = "sk_live_" if mode == "true" else "sk_test_"
    if (not key.startswith(prefix) or len(key) <= len(prefix)
            or any(part in key.upper() for part in
                   ("YOUR_", "PLACEHOLDER", "REPLACE", "EXAMPLE"))):
        return False
    stripe.api_key = key
    return True


def _require_stripe():
    if not init_stripe():
        raise RuntimeError(
            "Stripe account unavailable: set matching STRIPE_SECRET_KEY and "
            "STRIPE_EXPECT_LIVEMODE in a private environment. No demo balance."
        )


def get_balance():
    """Return a real Stripe Balance object or fail closed; never a demo fallback."""
    _require_stripe()
    return stripe.Balance.retrieve()


def get_payments(limit=10):
    """Return read-only charge summaries, not inferred revenue or payout evidence."""
    _require_stripe()
    if type(limit) is not int or not 1 <= limit <= 100:
        raise ValueError("limit must be an integer from 1 to 100")
    charges = stripe.Charge.list(limit=limit)
    return [
        {"id": ch.id, "amount": ch.amount, "currency": ch.currency,
         "status": ch.status, "created": ch.created}
        for ch in charges.data
    ]


def create_payment_link(*args, **kwargs):
    """Legacy call is blocked: payment mutation requires a separate reviewed path."""
    raise PermissionError(
        "Payment Link creation is disabled in this read-only audit module."
    )


def main():
    try:
        balance = get_balance()
        print("STRIPE READ-ONLY BALANCE (minor units, grouped by currency)")
        for category in ("available", "pending"):
            for entry in getattr(balance, category, []):
                print(f"{category}: {entry.amount} {entry.currency.upper()} minor units")
        print("See the Stripe Dashboard for actual payout dates and bank status.")
    except Exception:
        # Never include credential values in error messages.
        print("Stripe balance unavailable or account access denied.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
