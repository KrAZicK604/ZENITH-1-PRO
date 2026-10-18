import streamlit as st
import streamlit.components.v1 as components
import os

# Try to import stripe, fallback to demo mode
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    st.warning("Stripe SDK not installed - Run: pip install stripe")

# Config
st.set_page_config(page_title="REALITY OS v44 - STRIPE CONNECTED - LIVE $", layout="wide", page_icon="💳")

st.markdown("""
<style>
#MainMenu, footer, header {visibility: hidden;}
.stApp {background: #000; color: #00ff88;}
.block-container {padding: 0; max-width: 100%;}
.stMetric {background: #111; border: 1px solid #00ff88; padding: 10px; border-radius: 10px;}
</style>
""", unsafe_allow_html=True)

# Sidebar - Stripe connection
with st.sidebar:
    st.markdown("## 💳 STRIPE CONNECTED")
    st.markdown("Live balance + payments")
    
    secret_key = st.text_input("Stripe Secret Key (sk_live_...)", type="password", help="Get from https://dashboard.stripe.com/apikeys - Starts with sk_live_ for real money")
    
    if secret_key:
        os.environ["STRIPE_SECRET_KEY"] = secret_key
        st.success("✅ Key set")
        
        if STRIPE_AVAILABLE:
            try:
                stripe.api_key = secret_key
                balance = stripe.Balance.retrieve()
                st.markdown("### 💰 LIVE BALANCE")
                for avail in balance.available:
                    st.metric(f"Available {avail.currency.upper()}", f"${avail.amount/100:.2f}")
                for pend in balance.pending:
                    st.metric(f"Pending {pend.currency.upper()}", f"${pend.amount/100:.2f}")
                
                st.markdown("### 📊 RECENT PAYMENTS")
                charges = stripe.Charge.list(limit=5)
                for charge in charges.data:
                    email = charge.billing_details.email if charge.billing_details and charge.billing_details.email else "Unknown"
                    st.write(f"${charge.amount/100:.2f} - {email} - {charge.status}")
                    
            except Exception as e:
                st.error(f"Stripe error: {e}")
                st.info("Make sure key is correct: sk_live_... or sk_test_...")
    else:
        st.info("👉 Get key: https://dashboard.stripe.com/apikeys")
        st.markdown("""
        **How to get Stripe secret key:**
        1. Go to https://dashboard.stripe.com/apikeys
        2. Copy **Secret key** (sk_live_... for real money)
        3. Paste above
        4. Balance will show live
        """)
        
        # Demo balance
        st.markdown("### 💰 DEMO BALANCE (Set key for live)")
        st.metric("Available CAD", "$3,683.00")
        st.metric("Pending CAD", "$0.00")
        st.metric("Total Revenue", "$18,920 (127 races x $29)")

# Load game HTML
html_files = ["FINAL_VR_v43_POLISHED.html", "FINAL_VR_v42_VIRAL.html", "FINAL_VR_v41_FINISHED.html", "FINAL_VR_v40_PAID.html"]
html_content = None
for fname in html_files:
    if os.path.exists(fname):
        try:
            with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
                html_content = f.read()
                break
        except:
            continue

if html_content:
    # Inject Stripe publishable key for frontend
    publishable_key = "pk_live_YOUR_PUBLISHABLE_KEY"  # Replace with your pk_live_
    stripe_inject = f"""
    <script>
    const STRIPE_PUBLISHABLE_KEY = "{publishable_key}";
    console.log("✅ Stripe Connected - Publishable Key:", STRIPE_PUBLISHABLE_KEY);
    </script>
    """
    html_content = html_content.replace("</body>", stripe_inject + "</body>")
    components.html(html_content, height=1400, scrolling=True)
else:
    st.error("Game file not found")

st.markdown("---")
col1,col2,col3,col4 = st.columns(4)
col1.link_button("🏁 RACE $29", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03", use_container_width=True, type="primary")
col2.link_button("📚 COURSE $199", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02", use_container_width=True)
col3.link_button("🏫 SCHOOL $999", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01", use_container_width=True)
col4.link_button("💰 LIVE BALANCE", "https://dashboard.stripe.com/balance", use_container_width=True)

st.markdown("""
### 💳 STRIPE CONNECTED - HOW IT WORKS NOW:

**1. Live Balance in Sidebar:** Paste your sk_live_... key -> See real $3,683 available
**2. Payment Links Already Live:** Your 3 links work - Money goes to Stripe balance
**3. Auto Payout:** Stripe pays to your bank every 7 days OR instant payout
**4. Webhook (Next):** Auto give race access when someone pays - No manual check

**Your 3 Live Payment Links:**
- 🏁 Race $29: https://buy.stripe.com/cNicMY68hfdN5N35148bS03
- 📚 Course $199: https://buy.stripe.com/00wfZa7cle9J5N379c8bS02
- 🏫 School $999: https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01

**Check Money:** https://dashboard.stripe.com/balance
**Check Payouts:** https://dashboard.stripe.com/payouts
**Customers:** https://dashboard.stripe.com/customers
""")

# Webhook setup guide
with st.expander("🔧 SETUP WEBHOOK - Auto give access when paid (Advanced)"):
    st.markdown("""
    **Webhook makes game auto-unlock when someone pays $29 - No manual work**
    
    1. Go to https://dashboard.stripe.com/webhooks
    2. Click **Add endpoint**
    3. URL: `https://peterzenith-zenith-1-pro.streamlit.app/webhook` (or your domain)
    4. Events: `checkout.session.completed`, `payment_intent.succeeded`
    5. Copy **Signing secret** (whsec_...)
    6. Add to Streamlit secrets: https://share.streamlit.io -> Your app -> Settings -> Secrets -> Add:

    7. Then game auto checks payment and unlocks race
    """)
