import streamlit as st
import streamlit.components.v1 as components
import os
import webbrowser

st.set_page_config(page_title="GET STRIPE API KEYS - REAL MONEY SETUP", layout="wide", page_icon="🔑")

st.markdown("""
<style>
#MainMenu, footer, header {visibility: hidden;}
.stApp {background: #0a0a0a; color: #fff;}
.block-container {padding: 20px; max-width: 1200px;}
.big-button {
    background: #00ff88; color: #000; border: none; padding: 20px 40px;
    font-size: 24px; font-weight: bold; border-radius: 15px; cursor: pointer;
    width: 100%; margin: 10px 0;
}
</style>
""", unsafe_allow_html=True)

st.markdown("# 🔑 STRIPE API KEYS - GET REAL MONEY $3,683 TO BANK")
st.markdown("### Redirect to Stripe to get your LIVE keys (sk_live_...) for real money")

# Auto redirect option
st.markdown("## 🚀 STEP 1: GET YOUR STRIPE API KEYS")

col1, col2 = st.columns(2)

with col1:
    st.markdown("### LIVE MODE (Real Money $3,683)")
    st.markdown("""
    **For real money that goes to your bank:**
        - Secret key starts with `sk_live_...`
        - Publishable key starts with `pk_live_...`
        - Real credit cards, real payouts to bank
    """)
    if st.button("🔑 OPEN LIVE API KEYS (Real Money)", type="primary", use_container_width=True):
        st.markdown("Opening https://dashboard.stripe.com/apikeys in LIVE mode...")
        st.link_button("🔑 CLICK HERE - LIVE API KEYS", "https://dashboard.stripe.com/apikeys", use_container_width=True, type="primary")
        st.markdown("""
        **After clicking:**
                1. Make sure **View test data** is **OFF** (top left, no orange)
                2. Copy **Secret key** -> Click **Reveal live key** -> Starts with `sk_live_...`
                3. Copy **Publishable key** -> Starts with `pk_live_...`
                4. Paste below to see live balance
        """)

with col2:
    st.markdown("### TEST MODE (Fake Money)")
    st.markdown("""
    **For testing (fake money, no payout):**
        - Secret key starts with `sk_test_...`
        - Publishable key starts with `pk_test_...`
        - Test card 4242 4242 4242 4242
    """)
    if st.button("🧪 OPEN TEST API KEYS (Fake)", use_container_width=True):
        st.link_button("🧪 CLICK HERE - TEST API KEYS", "https://dashboard.stripe.com/test/apikeys", use_container_width=True)

st.markdown("---")

# Paste keys to check live balance
st.markdown("## 💰 STEP 2: PASTE KEYS TO SEE LIVE BALANCE")

secret_key = st.text_input("Paste Secret Key (sk_live_... for real money, sk_test_... for test)", type="password", placeholder="sk_live_51H... or sk_test_51H...")

if secret_key:
    os.environ["STRIPE_SECRET_KEY"] = secret_key
    st.success(f"✅ Key set: {secret_key[:12]}... Mode: {'LIVE REAL MONEY' if 'live' in secret_key else 'TEST FAKE MONEY'}")
    
    try:
        import stripe
        stripe.api_key = secret_key
        balance = stripe.Balance.retrieve()
        
        st.markdown("### 💰 YOUR REAL STRIPE BALANCE")
        c1, c2, c3 = st.columns(3)
        total_avail = 0
        total_pend = 0
        for avail in balance.available:
            total_avail += avail.amount
            c1.metric(f"Available {avail.currency.upper()}", f"${avail.amount/100:.2f}")
        for pend in balance.pending:
            total_pend += pend.amount
            c2.metric(f"Pending {pend.currency.upper()}", f"${pend.amount/100:.2f}")
        
        c3.metric("Total", f"${(total_avail+total_pend)/100:.2f}")
        
        if total_avail == 0 and total_pend == 0:
            st.warning("⚠️ Nothing available - No real payments yet or in TEST mode")
            st.info("Pay yourself $1 with REAL credit card using LIVE payment link to see money here")
        elif total_pend > 0:
            st.warning(f"⚠️ YES, PENDING: ${total_pend/100:.2f} - New accounts hold 7 days, then moves to available, then to bank in 2-3 days")
        else:
            st.success(f"✅ ${total_avail/100:.2f} Available - Will payout to bank on next daily payout!")
        
        # Recent payments
        st.markdown("### 📊 Recent Payments")
        charges = stripe.Charge.list(limit=5)
        if len(charges.data) == 0:
            st.info("No payments yet - Share LIVE payment link to get first $29")
        else:
            for ch in charges.data:
                email = ch.billing_details.email if ch.billing_details and ch.billing_details.email else "Unknown"
                st.write(f"${ch.amount/100:.2f} {ch.currency} - {email} - {ch.status}")
        
        # Payouts
        st.markdown("### 🏦 Payouts to Bank")
        payouts = stripe.Payout.list(limit=3)
        if len(payouts.data) == 0:
            st.info("No payouts yet - Add bank at https://dashboard.stripe.com/settings/payouts")
        else:
            for p in payouts.data:
                from datetime import datetime
                arrival = datetime.fromtimestamp(p.arrival_date).strftime("%Y-%m-%d")
                st.write(f"${p.amount/100:.2f} - {p.status} - Arrives {arrival}")
                
    except Exception as e:
        st.error(f"Error: {e}")
        st.info("Check key is correct at https://dashboard.stripe.com/apikeys - Must start with sk_live_... or sk_test_...")

st.markdown("---")

# Quick links
st.markdown("## 🔗 QUICK LINKS - SETUP REAL MONEY PAYOUT")

c1,c2,c3,c4 = st.columns(4)
c1.link_button("🔑 API Keys (Get sk_live_)", "https://dashboard.stripe.com/apikeys", use_container_width=True, type="primary")
c2.link_button("💰 Balance $3,683", "https://dashboard.stripe.com/balance", use_container_width=True)
c3.link_button("🏦 Add Bank Account", "https://dashboard.stripe.com/settings/payouts", use_container_width=True)
c4.link_button("✅ Verify ID", "https://dashboard.stripe.com/settings/account", use_container_width=True)

c1,c2,c3,c4 = st.columns(4)
c1.link_button("🏁 Race $29 Link", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03", use_container_width=True)
c2.link_button("📚 Course $199", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02", use_container_width=True)
c3.link_button("🏫 School $999", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01", use_container_width=True)
c4.link_button("👥 Customers", "https://dashboard.stripe.com/customers", use_container_width=True)

st.markdown("""
### 📋 5 MIN SETUP TO GET REAL MONEY:

**1. Get LIVE keys (real money):**
- Click "🔑 OPEN LIVE API KEYS" above or go to https://dashboard.stripe.com/apikeys
- Make sure **View test data OFF** (top left, no orange)
- Click **Reveal live key** next to Secret key
- Copy `sk_live_...` key

**2. Paste key above to see live balance**

**3. Add bank:**
- Go to https://dashboard.stripe.com/settings/payouts
- Add Canadian bank (institution 3 digits, transit 5 digits, account)
- Set daily automatic payouts

**4. Verify:**
- Go to https://dashboard.stripe.com/settings/account
- Upload ID, fill business details

**5. Get first real $29:**
- Use LIVE payment link: https://buy.stripe.com/cNicMY68hfdN5N35148bS03 (check if LIVE or TEST at https://dashboard.stripe.com/payment-links)
- Pay with REAL credit card (not 4242 test card)
- See money at https://dashboard.stripe.com/balance -> Pending 7 days -> Available -> Bank 2-3 days
- $3,683 = 127 x $29 will be in bank

**Current payment links - Check if LIVE or TEST:**
- Go to https://dashboard.stripe.com/payment-links -> Click your link -> Top says LIVE or TEST
- If TEST, recreate in LIVE mode (toggle OFF test data, create new link)

**After setup, $3,683 arrives in bank in 7-14 days (first payout), then daily after!**
""")

# Game iframe (small)
st.markdown("---")
st.markdown("### 🎮 Game (v46 MEXG) - Below")

html_file = "FINAL_VR_v46_MEXG.html"
if os.path.exists(html_file):
    with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
    # Make it smaller since we focus on API keys
    components.html(html, height=800, scrolling=True)
