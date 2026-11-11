"""ZENITH-1-PRO Streamlit storefront.

Secret API keys belong in server-side configuration, never in a public UI.
Payment verification/entitlements are performed by a separate signed webhook.
"""
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="ZENITH-1-PRO", page_icon="🎮", layout="wide")
st.title("🎮 ZENITH-1-PRO")
st.info("Payments and race access are verified server-side. A redirect or button click never proves payment.")
st.subheader("Race and training")
st.link_button("Race — view checkout", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03")
st.link_button("Course — view checkout", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02")
st.link_button("School — view checkout", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01")
st.caption("Checkout links must be independently checked in your Stripe Dashboard for live/test mode and product prices.")

st.subheader("VR preview")
candidates = (
    "FINAL_VR_v46_MEXG.html",
    "FINAL_VR_v43_POLISHED.html",
    "FINAL_VR_v42_VIRAL.html",
    "FINAL_VR_v41_FINISHED.html",
    "FINAL_VR_v40_PAID.html",
    "FINAL_VR_v37_ONLINE_SIMPLE.html",
)
game = next((Path(name) for name in candidates if Path(name).is_file()), None)
if game is None:
    st.warning("VR preview file is not present in this deployment.")
else:
    components.html(game.read_text(encoding="utf-8-sig"), height=850, scrolling=True)

st.divider()
st.subheader("Account administrator")
st.write("View balances, payouts, and verification directly in Stripe. No revenue or payout date is assumed.")
st.link_button("Stripe balance", "https://dashboard.stripe.com/balance")
st.link_button("Stripe payouts", "https://dashboard.stripe.com/payouts")
st.link_button("Stripe payment links", "https://dashboard.stripe.com/payment-links")
