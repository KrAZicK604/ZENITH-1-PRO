import streamlit as st
st.title("🛒 SHOP - ZENITH MERCH & NFT")
col1,col2,col3 = st.columns(3)

with col1:
    st.subheader("🚀 ZENITH-1 Model")
    st.image("https://via.placeholder.com/300x200/000011/00ffff?text=ZENITH-1+SHIP", use_column_width=True)
    st.markdown("**$49.99**\n3D Printed 1:100\nPsi 1.133 Edition")
    if st.button("Buy Ship Model", key="ship"): st.success("Added to cart! Email peter@zenith.space")
    st.link_button("Buy on Etsy", "https://etsy.com")

with col2:
    st.subheader("🌌 Mars Transfer NFT")
    st.image("https://via.placeholder.com/300x200/110011/ff00ff?text=MARS+TRANSFER+NFT", use_column_width=True)
    st.markdown("**0.05 ETH**\n259.1M km Proof\nOn Polygon")
    if st.button("Mint NFT", key="nft"): st.info("Minting... Connect MetaMask (coming soon)")
    st.link_button("OpenSea", "https://opensea.io")

with col3:
    st.subheader("👕 Mission Patch")
    st.image("https://via.placeholder.com/300x200/001100/00ff00?text=MISSION+PATCH+v19", use_column_width=True)
    st.markdown("**$19.99**\nEmbroidered\nv19 Cinematic")
    if st.button("Buy Patch", key="patch"): st.success("Added!")

st.markdown("---")
st.subheader("💳 Checkout")
st.markdown("**Total ZENITH Economy:** Fuel saved = 117t = $2.3M value")
email=st.text_input("Email for receipt")
if st.button("Checkout (Demo)"):
    st.balloons()
    st.success(f"Order sent to {email}! (Demo - Integrate Stripe)")
    st.code("Stripe Integration: st.secrets['stripe_key'] -> checkout session", language="python")

st.info("Want real payments? Add Stripe: pip install stripe + add STRIPE_KEY in Streamlit secrets")
