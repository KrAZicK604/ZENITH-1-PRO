"""Read-only financial inspection CLI.

No examples or forecasts masquerading as Stripe deposits. Never copies
private Stripe keys into terminal arguments or displays customer data.
"""
from stripe_connector import get_balance, get_payments, PAYMENT_LINKS


def main():
    print("ZENITH-1-PRO | READ-ONLY STRIPE CHECK")
    print("Checking the account selected by private environment variables.")
    print("Not a payment request, bank transfer or payout scheduling command.")
    try:
        balance = get_balance()
        print("\nBalances (actual Stripe API results):")
        for label in ("available", "pending"):
            for item in getattr(balance, label, []):
                print(f"  {label}: {item.amount / 100:.2f} {item.currency.upper()}")
        payments = get_payments(limit=5)
        print("\nRecent charge records: " + str(len(payments)))
        for p in payments:
            print("  {id}  {amount:.2f} {currency}  {status}".format(
                id=p["id"], amount=p["amount"] / 100,
                currency=p["currency"].upper(), status=p["status"]))
        print("\nOnly Stripe Dashboard payout records establish payout status.")
        print("Dashboard: https://dashboard.stripe.com/balance")
        return 0
    except Exception:
        # Avoid leaking secret-bearing SDK exceptions or falsely reporting $0.
        print("UNAVAILABLE: Stripe could not be read. No balance is inferred.")
        print("Use https://dashboard.stripe.com/balance to verify your account.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
