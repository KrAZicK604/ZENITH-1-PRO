import streamlit as st
import streamlit.components.v1 as components
import os
st.set_page_config(page_title="REALITY OS v42 - VIRAL MOBILE - SHARE & EARN $5", layout="wide", page_icon="🔥")

st.markdown("<style>#MainMenu, footer, header {visibility: hidden;} .stApp {background: #000;} .block-container {padding: 0; max-width: 100%;}</style>", unsafe_allow_html=True)

html_file = "FINAL_VR_v42_VIRAL.html"
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

components.html(html, height=1400, scrolling=True)

st.markdown("---")
st.markdown("## 🔥 v42 VIRAL MOBILE - SHARE & EARN $5 PER FRIEND")

c1,c2,c3,c4 = st.columns(4)
c1.link_button("🏁 RACE $29", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03", use_container_width=True, type="primary")
c2.link_button("📚 COURSE $199", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02", use_container_width=True)
c3.link_button("🏫 SCHOOL $999", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01", use_container_width=True)
c4.link_button("💰 BALANCE", "https://dashboard.stripe.com/balance", use_container_width=True)

st.info("📱 MOBILE READY: On phone, use bottom buttons ◀▲🚀▼▶ to race! | 🔥 VIRAL: Share link, earn $5 per friend who pays!")

# Referral system explanation
st.markdown("""
### 🔥 VIRAL SYSTEM - HOW YOU GET MORE MONEY:

1. **Your referral code:** Auto-generated, saved in browser (e.g., ZENITH_A1B2C3)
2. **Share link:** `https://krazick604-zenith-1-pro.streamlit.app?ref=YOURCODE`
3. **Friend clicks & pays $29** -> You get $5 extra (track via Stripe metadata)
4. **How to track:** Add referral code to Stripe payment link metadata - In Stripe Dashboard -> Payment Links -> Edit -> Metadata -> Add `ref` = customer's referral code

**Current build includes:**
- ✅ Mobile controls (bottom) - Works on phone
- ✅ Viral bar (Share & Earn $5) - Bottom above mobile controls
- ✅ Referral tracking (?ref=CODE in URL)
- ✅ Global leaderboard, progress, tournament, finish screen, payment links

**GAME 100% COMPLETE - DEPLOY LIVE NOW**
""")

if st.button("🚀 DEPLOY LIVE TO STREAMLIT CLOUD - AUTO", type="primary"):
    st.code("""
cd C:\\Users\\curtz\\Downloads\\ZENITH-1-PRO
git add .
git commit -m "v42 VIRAL MOBILE - FINAL - Ready to sell"
git push origin main
# Then go to https://share.streamlit.io -> Your app auto-updates in 2 min
# Live: https://krazick604-zenith-1-pro.streamlit.app
    """)
    st.success("Copy commands above, run in PowerShell, then live in 2 min!")

st.balloons()
