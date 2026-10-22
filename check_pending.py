import os
print("=== IS YOUR $3,683 PENDING? ===")

try:
    import stripe
    key = os.getenv("STRIPE_SECRET_KEY", "")
    # Try to get from file or ask
    if not key or "YOUR" in key:
        # Check .env
        if os.path.exists(".env"):
            with open(".env", 'r') as f:
                for line in f:
                    if "STRIPE_SECRET_KEY" in line and "sk_" in line:
                        key = line.split("=")[1].strip().strip('"').strip("'")
                        break
        if not key or "YOUR" in key:
            print("No Stripe key set - Checking demo + guiding to dashboard")
            key = ""
    
    if key and "sk_" in key:
        stripe.api_key = key
        print(f"Using key: {key[:12]}... ({'LIVE' if 'live' in key else 'TEST'} mode)")
        
        balance = stripe.Balance.retrieve()
        
        print("\n--- BALANCE ---")
        total_available = 0
        total_pending = 0
        
        print("Available (ready to payout to bank):")
        for avail in balance.available:
            print(f"  ${avail.amount/100:.2f} {avail.currency.upper()} - This goes to bank on next payout")
            total_available += avail.amount
        
        print("\nPending (holding, not ready yet):")
        for pend in balance.pending:
            print(f"  ${pend.amount/100:.2f} {pend.currency.upper()} - This is PENDING")
            total_pending += pend.amount
        
        print(f"\n--- SUMMARY ---")
        print(f"Available: ${total_available/100:.2f} - Will payout to bank")
        print(f"Pending: ${total_pending/100:.2f} - Still holding")
        
        if total_pending > 0:
            print("\n⚠️  YES - YOU HAVE PENDING PAYMENTS")
            print(f"   ${total_pending/100:.2f} is pending")
            print("   Reason: New Stripe accounts hold money 7-14 days for fraud check")
            print("   After 7 days, pending moves to available, then to bank in 2-3 days")
        else:
            print("\n✅ NO PENDING - All money is available for payout")
        
        if total_available > 0:
            print(f"\n✅ ${total_available/100:.2f} is available - Will go to bank on next daily payout")
        
        # Check payouts
        print("\n--- RECENT PAYOUTS TO BANK ---")
        payouts = stripe.Payout.list(limit=3)
        if len(payouts.data) == 0:
            print("  No payouts yet")
            if total_available > 0:
                print(f"  First payout of ${total_available/100:.2f} will be created on next schedule (daily = tomorrow)")
                print("  Then arrives in bank 2-3 business days later")
        else:
            for p in payouts.data:
                from datetime import datetime
                arrival = datetime.fromtimestamp(p.arrival_date).strftime("%Y-%m-%d")
                print(f"  ${p.amount/100:.2f} - {p.status} - Arrives {arrival} - Bank {p.destination}")
        
        # Check recent charges
        print("\n--- RECENT PAYMENTS FROM PLAYERS ---")
        charges = stripe.Charge.list(limit=5)
        if len(charges.data) == 0:
            print("  No payments yet - No one paid $29 yet")
            print("  Share your link: https://buy.stripe.com/cNicMY68hfdN5N35148bS03")
        else:
            for c in charges.data:
                from datetime import datetime
                email = c.billing_details.email if c.billing_details and c.billing_details.email else "Unknown"
                created = datetime.fromtimestamp(c.created).strftime("%Y-%m-%d %H:%M")
                print(f"  ${c.amount/100:.2f} - {email} - {c.status} - {created}")
                # Check if this charge is pending
                # Pending reason: New account holds
                if total_pending > 0:
                    print(f"    -> This payment is part of pending ${total_pending/100:.2f} (7 day hold)")
        
    else:
        print("\n=== DEMO - NO REAL KEY SET ===")
        print("To check real pending:")
        print("1. Go to https://dashboard.stripe.com/apikeys")
        print("2. Copy Secret key sk_live_... (LIVE mode) or sk_test_... (TEST mode)")
        print("3. Run: $env:STRIPE_SECRET_KEY='sk_live_YOUR_KEY'")
        print("4. Run: python check_pending.py")
        print("\n--- EXPECTED IF YOU HAVE 127 x $29 ---")
        print("If new Stripe account (<14 days old):")
        print("  Pending: $3,683.00 CAD - YES, pending 7 days")
        print("  Available: $0.00 - Will be available after 7 days")
        print("  First payout: In 7 days, then arrives bank 2-3 days later = Around May 20-22")
        print("\nIf old Stripe account (>14 days):")
        print("  Pending: $0.00 - No pending")
        print("  Available: $3,683.00 - Ready to payout")
        print("  Next payout: Tomorrow (if daily) -> Bank in 2-3 days")

except ImportError:
    print("Stripe SDK not installed - Run: pip install stripe")
except Exception as e:
    print(f"Error: {e}")
    print("Go to https://dashboard.stripe.com/balance to check manually")

print("\n--- HOW TO CHECK MANUALLY IN 10 SEC ---")
print("1. Go to https://dashboard.stripe.com/balance")
print("2. Look at top - Two boxes:")
print("   - Available: Money ready to go to bank")
print("   - Pending: Money holding (7 day hold for new accounts)")
print("3. If Pending shows $3,683 = YES, pending")
print("4. If Available shows $3,683 = NO, ready to payout")
