print("=== WHY NOTHING AVAILABLE ===")
print("Reasons:")
print("1. You are in TEST mode (View test data ON) - Fake money, not real")
print("2. No one paid $29 yet with REAL credit card")
print("3. Payment links are TEST mode links, not LIVE mode")
print("4. Stripe account not verified yet")
print("\n=== HOW TO FIX - GET FIRST REAL $29 ===")

import os
try:
    import stripe
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if key and "sk_" in key:
        print(f"Current key: {key[:15]}... Mode: {'LIVE (real money)' if 'live' in key else 'TEST (fake money)'}")
        if 'test' in key:
            print("⚠️  YOU ARE IN TEST MODE - Fake money - Need LIVE key for real $")
        else:
            print("✅ LIVE MODE - Real money")
    else:
        print("No Stripe key set - Check dashboard manually")
except:
    pass

print("""
MANUAL CHECK - DO NOW:

1. Go to https://dashboard.stripe.com/balance
   Look top left - Is "View test data" toggle ON (orange) or OFF?
   - ON = TEST MODE = Fake, nothing available is expected
   - OFF = LIVE MODE = Real, should show money if someone paid

2. Go to https://dashboard.stripe.com/payment-links
   Click your Race $29 link: https://buy.stripe.com/cNicMY68hfdN5N35148bS03
   Does it say "Test mode" or "Live mode" at top?

3. Go to https://dashboard.stripe.com/customers
   Any customers? If empty = No one paid yet

4. Go to https://dashboard.stripe.com/payments
   Any payments? Filter: Live mode, Last 7 days - See anything?

If all empty = No real payments yet - Need to get first player to pay $29
""")
