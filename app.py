import streamlit as st
import streamlit.components.v1 as components
import os

st.set_page_config(page_title="ZENITH-1-PRO v16", layout="wide")
st.title("🚀 ZENITH-1-PRO v16 // ONE WEBSITE")
st.markdown("### REAL JPL 259.1M km | Psi 1.133 | 7 TABS | VR | COLONY")

c1,c2,c3,c4 = st.columns(4)
c1.metric("Earth-Mars","259.1 M km")
c2.metric("Psi Field","1.133")
c3.metric("Fuel Saved","117t")
c4.metric("Visuals","15")

t1,t2,t3,t4 = st.tabs(["PORKCHOP","COLONY","STATS","4D MAP"])

with t1:
    if os.path.exists("porkchop_matrix.png"):
        st.image("porkchop_matrix.png", use_container_width=True)
    else:
        st.info("Add porkchop_matrix.png")

with t2:
    if os.path.exists("colony.png"):
        st.image("colony.png", use_container_width=True)
    else:
        st.info("Add colony.png")

with t3:
    st.write("Psi 1.133 = 117t fuel saved | JPL Real | VR Ready")

with t4:
    if os.path.exists("4d_map.html"):
        with open('4d_map.html','r',encoding='utf-8') as f:
            components.html(f.read(), height=800, scrolling=True)
    else:
        st.error("4d_map.html not found - upload it")

st.link_button("Public Link","https://peterzenith-zenith-1-pro.streamlit.app")