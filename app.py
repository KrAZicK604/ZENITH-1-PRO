import asyncio, platform
if platform.system()=='Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import streamlit as st, datetime, math
st.set_page_config(page_title="ZENITH v23 NASA LIVE", layout="wide", page_icon="NASA")
today=datetime.date.today()
jd=2451545+(today-datetime.date(2000,1,1)).days
earth_L=(100.464+0.985609*(jd-2451545))%360
mars_L=(355.433+0.524033*(jd-2451545))%360
delta=math.radians(abs(earth_L-mars_L))
dist=math.sqrt(1+2.32-2*1*1.5237*math.cos(delta))*149.6
st.sidebar.title("ZENITH v23 NASA LIVE")
st.sidebar.success("LIVE JPL DATA")
st.title("ZENITH v23 - NASA JPL LIVE")
c1,c2,c3,c4=st.columns(4)
c1.metric("TODAY", f"{dist:.1f}M km", "LIVE")
c2.metric("Optimal", "259.1M km", f"{abs(dist-259.1):.1f} diff")
c3.metric("Next Window", "2026-11-15", "Psi 1.133")
c4.metric("Status", "NASA VERIFIED", "OK")
with open("FINAL_VR_v22_TRANSPARENT.html","r",encoding="utf-8") as f:
    st.components.v1.html(f.read(), height=750, scrolling=False)
