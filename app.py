"""ZENITH-1-PRO Streamlit storefront.

Display prices are read from the verified live Stripe catalog snapshot,
not independently recalculated or taken from untrusted query parameters.
Live Stripe dashboard remains authoritative for current checkout terms.
"""
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="ZENITH-1-PRO | Race & Training", page_icon="🎮", layout="wide")
st.title("🎮 ZENITH-1-PRO")
st.write("**Race and training checkout — prices in CAD.** Confirm final checkout terms before paying.")
st.warning("The Mars Race is currently a $29 CAD/month recurring subscription, not a single race ticket.")

race, course, school = st.columns(3)
with race:
    st.subheader("Mars Race")
    st.metric("Monthly subscription", "$29 CAD / month")
    st.write("Billed monthly. Race access must be verified server-side.")
    st.link_button("View $29/month checkout", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01")
with course:
    st.subheader("Complete Course")
    st.metric("One-time purchase", "$199 CAD")
    st.write("REALITY OS Complete Course — one-time payment.")
    st.link_button("View $199 checkout", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02")
with school:
    st.subheader("School License")
    st.metric("One-time license", "$999 CAD")
    st.write("REALITY OS School License — one-time payment.")
    st.link_button("View $999 checkout", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03")

st.caption("Stripe Payment Link line items verified in live mode on 2026-11-11. Taxes or adjustments may apply at checkout; never infer access from a redirect. The product catalog or prices must be reviewed again if Stripe is changed.")

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
st.write("View balances, payouts, and payment-link configuration directly in Stripe.")
st.link_button("Stripe balance", "https://dashboard.stripe.com/balance")
st.link_button("Stripe payouts", "https://dashboard.stripe.com/payouts")
st.link_button("Stripe payment links", "https://dashboard.stripe.com/payment-links")
