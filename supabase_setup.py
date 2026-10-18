# SUPABASE SETUP - FREE PERMANENT STORAGE FOR CLOUD WEBHOOK
# Render free tier resets memory on restart - Supabase keeps paid users forever (free)

# Step 1: Go to https://supabase.com -> Sign up free -> New Project -> Name: zenith-webhook
# Step 2: Go to Table Editor -> New Table -> Name: paid_users -> Columns:
#   email (text, primary)
#   product (text)
#   total_paid (int)
#   first_payment (text)
#   last_payment (text)
#   data (jsonb)
# Step 3: Go to Project Settings -> API -> Copy URL and anon key
# Step 4: Add to Render Environment Variables:
#   SUPABASE_URL = https://YOUR_PROJECT.supabase.co
#   SUPABASE_KEY = YOUR_ANON_KEY

import os
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

def get_supabase_client():
    if not SUPABASE_AVAILABLE:
        return None
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except:
        return None

def save_to_supabase(email, amount, payment_id, product):
    client = get_supabase_client()
    if not client:
        return False
    
    try:
        # Check if exists
        existing = client.table("paid_users").select("*").eq("email", email).execute()
        
        if existing.data and len(existing.data) > 0:
            # Update
            current_total = existing.data[0].get('total_paid', 0) + amount
            client.table("paid_users").update({
                "total_paid": current_total,
                "last_payment": __import__('datetime').datetime.now().isoformat(),
            }).eq("email", email).execute()
        else:
            # Insert
            client.table("paid_users").insert({
                "email": email,
                "product": product,
                "total_paid": amount,
                "first_payment": __import__('datetime').datetime.now().isoformat(),
                "last_payment": __import__('datetime').datetime.now().isoformat(),
                "data": {"payments": [{"amount": amount, "id": payment_id}]}
            }).execute()
        return True
    except Exception as e:
        print(f"Supabase error: {e}")
        return False

# To use: In cloud_webhook.py, after save_paid_user_cloud(), also call save_to_supabase()
# This keeps data forever even if Render restarts
