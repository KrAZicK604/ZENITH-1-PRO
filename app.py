import asyncio, platform
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import streamlit as st
st.set_page_config(page_title="ZENITH-1-PRO v19 PORTAL", layout="wide", page_icon="🚀")
st.sidebar.title("🚀 ZENITH PORTAL v19")
st.sidebar.success("✅ 8 PAGES LIVE")
st.sidebar.markdown("""
**NAV:**
- 🏠 Home VR Cinematic
- 🛰️ Missions
- ⚙️ Tech Specs
- 🌌 Gallery
- 🥽 True 3D VR (NEW)
- 🏆 Leaderboard (NEW)
- 🛒 Shop/NFT (NEW)
- 📧 Contact (NEW)
""")
st.title("🚀 ZENITH-1-PRO v19 - FULL PORTAL LIVE")
c1,c2,c3,c4,c5 = st.columns(5)
c1.metric("Pages", "8", "Full Site")
c2.metric("VR Modes", "2", "Canvas+Three.js")
c3.metric("Distance", "259.1M km", "REAL")
c4.metric("Pilots", "3", "Leaderboard")
c5.metric("Shop", "3 Items", "NFT+Merch")

try:
    with open("FINAL_VR_v19.html","r",encoding="utf-8") as f: html=f.read()
    st.components.v1.html(html, height=750, scrolling=False)
except Exception as e:
    st.error(str(e))

st.markdown("---")
st.info("👈 Use Sidebar to explore 8 pages! True 3D VR = Quest ENTER VR button inside")
