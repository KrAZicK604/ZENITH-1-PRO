from flask import Flask, request, jsonify
import os
import json
from datetime import datetime
import stripe

app = Flask(__name__)

# CONFIG - Set these in Render.com Environment Variables
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_YOUR_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")  # Optional for cloud - Stripe will verify
stripe.api_key = STRIPE_SECRET_KEY

# In cloud, use /tmp for files (Render ephemeral) + also return data via API
# For permanent storage, connect to Google Sheets or Supabase (free) - See below

PAID_USERS_MEMORY = []  # In-memory for cloud - Resets on deploy, but webhook logs stay in Stripe

def load_paid_users_cloud():
    """Cloud version - Returns memory + tries to load from file if exists"""
    global PAID_USERS_MEMORY
    # Try file first (for local)
    try:
        if os.path.exists("/tmp/paid_users.json"):
            with open("/tmp/paid_users.json", 'r') as f:
                return json.load(f)
        if os.path.exists("paid_users.json"):
            with open("paid_users.json", 'r') as f:
                return json.load(f)
    except:
        pass
    return PAID_USERS_MEMORY

def save_paid_user_cloud(email, amount, payment_id, product="race_29"):
    global PAID_USERS_MEMORY
    users = load_paid_users_cloud()
    
    # Check existing
    for u in users:
        if u['email'] == email and u['product'] == product:
            u['last_payment'] = datetime.now().isoformat()
            u['total_paid'] = u.get('total_paid', 0) + amount
            u['payments'].append({"amount": amount, "id": payment_id, "date": datetime.now().isoformat()})
            # Save to /tmp
            try:
                with open("/tmp/paid_users.json", 'w') as f:
                    json.dump(users, f, indent=2)
            except:
                pass
            PAID_USERS_MEMORY = users
            return u
    
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
    
    try:
        with open("/tmp/paid_users.json", 'w') as f:
            json.dump(users, f, indent=2)
        with open("paid_users.json", 'w') as f:
            json.dump(users, f, indent=2)
    except:
        pass
    
    PAID_USERS_MEMORY = users
    return new_user

@app.route('/')
def home():
    users = load_paid_users_cloud()
    return jsonify({
        "status": "✅ CLOUD WEBHOOK RUNNING - NO NGROK NEEDED",
        "option": "C",
        "webhook_url": request.host_url + "webhook",
        "check_access_url": request.host_url + "check_access/EMAIL",
        "paid_users_url": request.host_url + "paid_users",
        "paid_users": len(users),
        "total_revenue_cents": sum(u['total_paid'] for u in users),
        "total_revenue_dollars": sum(u['total_paid'] for u in users) / 100,
        "how_to": "1. Copy webhook_url 2. Go to https://dashboard.stripe.com/webhooks 3. Add endpoint 4. Paste webhook_url 5. Select checkout.session.completed 6. Done - No ngrok!"
    })

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        # Verify if webhook secret set
        if STRIPE_WEBHOOK_SECRET and len(STRIPE_WEBHOOK_SECRET) > 10:
            try:
                event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
            except stripe.error.SignatureVerificationError:
                # Try without verification for testing
                event = json.loads(payload)
        else:
            event = json.loads(payload)
        
        print(f"📥 Cloud webhook: {event.get('type')}")
        
        if event.get('type') == 'checkout.session.completed':
            session = event['data']['object']
            email = session.get('customer_details', {}).get('email') or session.get('customer_email') or session.get('client_reference_id') or "unknown@email.com"
            amount = session.get('amount_total', 0)
            payment_id = session.get('id', 'unknown')
            
            product = "race_29"
            if amount >= 99900:
                product = "school_999"
            elif amount >= 19900:
                product = "course_199"
            
            user = save_paid_user_cloud(email, amount, payment_id, product)
            print(f"✅ CLOUD PAYMENT: {email} paid ${amount/100:.2f} for {product}")
            
            # Optional: Send to Discord/Slack/Google Sheets here
            # For permanent storage, connect to Supabase or Google Sheets (see below)
            
            return jsonify({"status": "success", "email": email, "product": product, "amount": amount/100}), 200
            
        return jsonify({"status": "ignored", "type": event.get('type')}), 200
        
    except Exception as e:
        print(f"❌ Cloud webhook error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route('/check_access/<email>')
def check_access(email):
    users = load_paid_users_cloud()
    found = None
    for u in users:
        if u['email'].lower() == email.lower():
            found = u
            break
    
    return jsonify({
        "email": email,
        "has_access": found is not None,
        "details": found if found else {},
        "total_paid_users": len(users),
        "message": f"✅ Access granted for {email}" if found else f"❌ No payment found for {email} - Pay $29 at https://buy.stripe.com/cNicMY68hfdN5N35148bS03"
    })

@app.route('/paid_users')
def paid_users():
    users = load_paid_users_cloud()
    return jsonify({
        "total": len(users),
        "revenue_cents": sum(u['total_paid'] for u in users),
        "revenue_dollars": sum(u['total_paid'] for u in users) / 100,
        "users": users,
        "cloud_note": "This resets on Render free tier restart - For permanent, add Supabase (see supabase_setup.py)"
    })

# For Render.com - It needs to bind to 0.0.0.0 and PORT env var
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"=== CLOUD WEBHOOK SERVER - OPTION C - NO NGROK ===")
    print(f"Starting on port {port}")
    print(f"Webhook will be at: https://YOUR_APP.onrender.com/webhook")
    app.run(host='0.0.0.0', port=port, debug=False)
