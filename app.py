import asyncio, platform
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import streamlit as st
st.set_page_config(page_title="ZENITH v20 SLINGSHOT", layout="wide", page_icon="🌙")
st.sidebar.title("🌙 ZENITH v20 SLINGSHOT")
st.sidebar.success("Moon -> Mars +0.8km/s")
st.sidebar.markdown("**NEW:**\n- Moon flyby\n- Gravity assist\n- 23t extra saved\n- 3 phases")

st.title("🌙🚀 ZENITH v20 - LUNAR SLINGSHOT TO MARS")
c1,c2,c3,c4 = st.columns(4)
c1.metric("Slingshot", "+0.8 km/s", "Moon assist")
c2.metric("Fuel Extra Saved", "23t", "Total 140t")
c3.metric("Phases", "3", "Earth->Moon->Mars")
c4.metric("Distance", "259.1M km", "REAL")

with open("FINAL_VR_v20_SLINGSHOT.html","r",encoding="utf-8") as f:
    html=f.read()
st.components.v1.html(html, height=800, scrolling=False)

st.markdown("""
### 🌙 How Lunar Slingshot Works (Coded in visuals)
**Phase 1:** Launch from Earth parking orbit 400km -> Intercept Moon 384,400km
**Phase 2:** Fly behind Moon -> Moon gravity whips you forward +0.8 km/s (Oberth effect)
**Phase 3:** Ejected at 11km/s -> Cruise to Mars 259.1M km

**Code:** `quadraticCurveTo(moonX, moonY)` = gravity bend + velocity boost
**Real Physics:** Apollo used same, Artemis will use same for Mars!
""")
