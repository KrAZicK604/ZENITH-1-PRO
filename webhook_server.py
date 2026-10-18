import stripe
import os
import json
from flask import Flask, request, jsonify
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CONFIG - Get from https://dashboard.stripe.com/apikeys and https://dashboard.stripe.com/webhooks
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_YOUR_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_YOUR_WEBHOOK_SECRET")
stripe.api_key = STRIPE_SECRET_KEY

# File to store who paid - Game reads this to unlock
PAID_USERS_FILE = "paid_users.json"
RACE_ACCESS_FILE = "race_access.json"

def load_paid_users():
    try:
        if os.path.exists(PAID_USERS_FILE):
            with open(PAID_USERS_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return []

def save_paid_user(email, amount, payment_id, product="race_29"):
    users = load_paid_users()
    # Check if already exists
    for u in users:
        if u['email'] == email and u['product'] == product:
            u['last_payment'] = datetime.now().isoformat()
            u['total_paid'] = u.get('total_paid', 0) + amount
            u['payments'].append({"amount": amount, "id": payment_id, "date": datetime.now().isoformat()})
            with open(PAID_USERS_FILE, 'w') as f:
                json.dump(users, f, indent=2)
            return u
    
    # New user
    new_user = {
        "email": email,
        "product": product,
        "first_payment": datetime.now().isoformat(),
        "last_payment": datetime.now().isoformat(),
        "total_paid": amount,
        "race_access": True,
        "course_access": product in ["course_199", "school_999"],
        "school_access": product == "school_999",
        "payments": [{"amount": amount, "id": payment_id, "date": datetime.now().isoformat()}]
    }
    users.append(new_user)
    with open(PAID_USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)
    
    # Also save to race_access for quick check
    save_race_access(email, product)
    
    return new_user

def save_race_access(email, product):
    try:
        access = {}
        if os.path.exists(RACE_ACCESS_FILE):
            with open(RACE_ACCESS_FILE, 'r') as f:
                access = json.load(f)
        
        access[email] = {
            "product": product,
            "access": True,
            "granted_at": datetime.now().isoformat(),
            "race": True,
            "course": product in ["course_199", "school_999"],
            "school": product == "school_999"
        }
        
        with open(RACE_ACCESS_FILE, 'w') as f:
            json.dump(access, f, indent=2)
    except Exception as e:
        print(f"Error saving access: {e}")

@app.route('/')
def home():
    paid = load_paid_users()
    return jsonify({
        "status": "Webhook server running",
        "endpoint": "/webhook",
        "paid_users": len(paid),
        "total_revenue": sum(u['total_paid'] for u in paid) / 100,
        "message": "Set this URL in Stripe Dashboard -> Webhooks -> Add endpoint -> https://YOUR_DOMAIN/webhook"
    })

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        # Verify webhook signature (if secret set)
        if STRIPE_WEBHOOK_SECRET and "YOUR_WEBHOOK_SECRET" not in STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        else:
            # No verification in demo mode
            event = json.loads(payload)
            print("⚠️  Demo mode - No webhook signature verification - Set STRIPE_WEBHOOK_SECRET for security")
        
        print(f"📥 Webhook received: {event['type']}")
        
        # Handle checkout completed
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            email = session.get('customer_details', {}).get('email') or session.get('customer_email') or "unknown@email.com"
            amount = session.get('amount_total', 0)
            payment_id = session.get('id')
            
            # Determine product from amount
            product = "race_29"
            if amount >= 99900:
                product = "school_999"
            elif amount >= 19900:
                product = "course_199"
            
            user = save_paid_user(email, amount, payment_id, product)
            
            print(f"✅ PAYMENT: {email} paid ${amount/100:.2f} for {product} - Access granted!")
            print(f"   Total users: {len(load_paid_users())}")
            
            # Here you could send email, Discord notification, etc.
            # send_discord_notification(f"💰 New payment: {email} paid ${amount/100:.2f} for {product}")
            
        # Handle payment intent succeeded
        elif event['type'] == 'payment_intent.succeeded':
            intent = event['data']['object']
            email = intent.get('receipt_email') or "unknown@email.com"
            amount = intent.get('amount', 0)
            
            print(f"✅ Payment Intent: {email} - ${amount/100:.2f}")
        
        return jsonify({"status": "success"}), 200
        
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Webhook signature error: {e}")
        return jsonify({"error": "Invalid signature"}), 400
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route('/check_access/<email>')
def check_access(email):
    """Check if email has race access - Game calls this"""
    access = {}
    if os.path.exists(RACE_ACCESS_FILE):
        with open(RACE_ACCESS_FILE, 'r') as f:
            access = json.load(f)
    
    has_access = email in access
    return jsonify({
        "email": email,
        "has_access": has_access,
        "details": access.get(email, {}),
        "message": "Access granted" if has_access else "No access - Pay $29 to unlock"
    })

@app.route('/paid_users')
def paid_users():
    """List all paid users - For your dashboard"""
    users = load_paid_users()
    return jsonify({
        "total": len(users),
        "revenue_cents": sum(u['total_paid'] for u in users),
        "revenue_dollars": sum(u['total_paid'] for u in users) / 100,
        "users": users
    })

if __name__ == '__main__':
    print("=== STRIPE WEBHOOK SERVER - AUTO UNLOCK ===")
    print(f"Paid users file: {PAID_USERS_FILE}")
    print(f"Race access file: {RACE_ACCESS_FILE}")
    print(f"Existing paid users: {len(load_paid_users())}")
    print("\nStarting server on http://localhost:5000")
    print("Webhook endpoint: http://localhost:5000/webhook")
    print("\nFor Stripe to reach this, you need:")
    print("1. Use ngrok: ngrok http 5000 -> Copy https URL -> Paste in Stripe Dashboard -> Webhooks")
    print("2. Or deploy to server with public URL")
    print("\nTest with: curl -X POST http://localhost:5000/webhook -H 'Content-Type: application/json' -d '{\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"customer_details\":{\"email\":\"test@test.com\"},\"amount_total\":2900,\"id\":\"test_123\"}}}'")
    
    app.run(port=5000, debug=True)
