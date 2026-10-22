from flask import Flask, request, jsonify
import os

app = Flask(__name__)

# In production, use Supabase or Firebase to store unlocks
# For demo, in-memory
unlocked_users = set()

@app.route('/')
def home():
    return jsonify({"status":"REALITY OS Webhook - Auto-unlock $29 races","room":"zenith_pjqu7a","unlocked":len(unlocked_users)})

@app.route('/webhook', methods=['POST'])
def stripe_webhook():
    # Stripe sends event here when $29 paid
    # Configure at https://dashboard.stripe.com/webhooks - Add endpoint https://zenith-webhook.onrender.com/webhook
    # Select events: checkout.session.completed, payment_link.created, charge.succeeded
    try:
        data = request.json
        print(f"Webhook received: {data.get('type')}")
        
        # Example: When payment succeeds
        if data.get('type') in ['checkout.session.completed', 'charge.succeeded', 'payment_intent.succeeded']:
            email = data.get('data',{}).get('object',{}).get('customer_details',{}).get('email') or data.get('data',{}).get('object',{}).get('billing_details',{}).get('email') or 'unknown'
            amount = data.get('data',{}).get('object',{}).get('amount_total') or data.get('data',{}).get('object',{}).get('amount') or 2900
            print(f"✅ Payment: {email} paid ${amount/100}")
            unlocked_users.add(email)
            
            # In real app: Write to Supabase
            # supabase.table('unlocked_races').insert({"email":email, "room":"zenith_pjqu7a", "unlocked":True, "amount":amount/100}).execute()
            
            # Return success to Stripe
            return jsonify({"received":True, "email":email, "unlocked":True, "redirect":"https://peterzenith-zenith-1-pro.streamlit.app?payment=success"})
        
        return jsonify({"received":True})
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({"error":str(e)}), 400

@app.route('/check/<email>')
def check_unlock(email):
    # Frontend checks if user paid: GET /check/email@example.com
    unlocked = email in unlocked_users
    return jsonify({"email":email, "unlocked":unlocked, "room":"zenith_pjqu7a"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
