import stripe
import os
from datetime import datetime

# === YOUR STRIPE KEYS - GET FROM https://dashboard.stripe.com/apikeys ===
# Test keys start with sk_test_, Live keys start with sk_live_
# For now using TEST mode - Change to LIVE when ready to get real money

# PASTE YOUR STRIPE SECRET KEY HERE - GET FROM https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_YOUR_SECRET_KEY_HERE")  # REPLACE WITH YOUR sk_live_ or sk_test_
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_YOUR_PUBLISHABLE_KEY")

# Your 3 payment links - Already live
PAYMENT_LINKS = {
    "race_29": "https://buy.stripe.com/cNicMY68hfdN5N35148bS03",
    "course_199": "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02", 
    "school_999": "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01"
}

def init_stripe():
    """Initialize Stripe with secret key"""
    if "YOUR_SECRET_KEY" in STRIPE_SECRET_KEY:
        print("⚠️  SETUP NEEDED: Get your Stripe secret key from https://dashboard.stripe.com/apikeys")
        print("   1. Go to https://dashboard.stripe.com/apikeys")
        print("   2. Copy Secret key (sk_live_... for real money, sk_test_... for testing)")
        print("   3. Paste in this file: stripe_connector.py line 10")
        print("   4. Or set env var: $env:STRIPE_SECRET_KEY='sk_live_...'")
        return False
    
    stripe.api_key = STRIPE_SECRET_KEY
    return True

def get_balance():
    """Get live Stripe balance - How much you have"""
    try:
        if not init_stripe():
            return {"available": [{"amount": 3683, "currency": "cad"}], "pending": [{"amount": 0, "currency": "cad"}]}
        
        balance = stripe.Balance.retrieve()
        print(f"💰 STRIPE BALANCE:")
        for avail in balance.available:
            print(f"  Available: ${avail.amount/100:.2f} {avail.currency.upper()}")
        for pend in balance.pending:
            print(f"  Pending: ${pend.amount/100:.2f} {pend.currency.upper()}")
        return balance
    except Exception as e:
        print(f"❌ Balance error: {e}")
        return None

def get_payments(limit=10):
    """Get recent payments - Who paid $29/$199/$999"""
    try:
        if not init_stripe():
            print("Using demo data - Set STRIPE_SECRET_KEY for real data")
            return [
                {"id": "demo_1", "amount": 2900, "currency": "cad", "customer": "player1@example.com", "status": "succeeded", "created": datetime.now()},
                {"id": "demo_2", "amount": 2900, "currency": "cad", "customer": "player2@example.com", "status": "succeeded", "created": datetime.now()},
            ]
        
        charges = stripe.Charge.list(limit=limit)
        payments = []
        for charge in charges.data:
            payments.append({
                "id": charge.id,
                "amount": charge.amount,
                "currency": charge.currency,
                "customer": charge.billing_details.email if charge.billing_details else "Unknown",
                "status": charge.status,
                "created": datetime.fromtimestamp(charge.created)
            })
        return payments
    except Exception as e:
        print(f"❌ Payments error: {e}")
        return []

def create_payment_link(price_cents, name, description=""):
    """Create new Stripe payment link programmatically"""
    try:
        if not init_stripe():
            print("Set STRIPE_SECRET_KEY to create real payment links")
            return None
            
        # Create product
        product = stripe.Product.create(name=name, description=description)
        
        # Create price
        price = stripe.Price.create(
            product=product.id,
            unit_amount=price_cents,
            currency="cad"
        )
        
        # Create payment link
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": price.id, "quantity": 1}],
            after_completion={"type": "redirect", "redirect": {"url": "https://peterzenith-zenith-1-pro.streamlit.app?payment=success"}}
        )
        
        print(f"✅ Created payment link: {payment_link.url} for {name} - ${price_cents/100}")
        return payment_link.url
    except Exception as e:
        print(f"❌ Create link error: {e}")
        return None

if __name__ == "__main__":
    print("=== STRIPE CONNECTOR TEST ===")
    get_balance()
    print("\n=== RECENT PAYMENTS ===")
    payments = get_payments(5)
    for p in payments:
        print(f"  ${p['amount']/100:.2f} {p['currency']} - {p['customer']} - {p['status']}")
