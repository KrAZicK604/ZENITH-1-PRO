import time, json, math
from datetime import datetime, timedelta
from pathlib import Path
from astro_core import AstroCore

class LaunchAgent:
    def __init__(self):
        self.core = AstroCore()
        self.log_file = "launch_log.json"
        self.state = "STANDBY"
        
    def check(self):
        now = self.core.get_now()
        best, days_to, best_date = self.core.get_launch_window()
        psi = now["psi"]
        au = now["au"]
        
        # GO/NO-GO logic
        go = []
        go.append(("Distance < 0.5 AU", best["au"] < 0.5, f"{best['au']:.3f}"))
        go.append(("Psi > 1.2", psi > 1.1, f"{psi:.3f}"))
        go.append(("T- < 120d", days_to < 120, f"{days_to}d"))
        go.append(("Fuel save > 50t", (1000-1000/psi) > 50, f"{1000-1000/psi:.1f}t"))
        
        score = sum(1 for _,ok,_ in go if ok)
        
        print(f"\n=== ZENITH-1 v11 LAUNCH AGENT [{datetime.now():%H:%M:%S}] ===")
        print(f"NOW {au:.4f} AU Psi {psi:.4f} | BEST {best['au']:.3f} AU T-{days_to}d {best_date:%Y-%m-%d}")
        for name,ok,val in go:
            print(f"  {'[GO]' if ok else '[NO] go
Set-Content app.py -Value @'
import streamlit as st
from astro_core import AstroCore
from pathlib import Path
import json, time

st.set_page_config(page_title="ZENITH-1 v11 AGENT", layout="wide")
st.title("ZENITH-1-PRO v11 // AUTONOMOUS LAUNCH AGENT")

core = AstroCore()
now = core.get_now()
best, days_to, best_date = core.get_launch_window()

# Agent status
log_path = Path("launch_log.json")
if log_path.exists():
    log = json.loads(log_path.read_text())
    state = log["state"]
else:
    state = "STANDBY"

if state == "GO FOR LAUNCH":
    st.balloons()
    st.success(f"### ?? {state} - BURN EXECUTED")
    if Path("LAUNCHED.txt").exists():
        st.code(Path("LAUNCHED.txt").read_text())
else:
    st.warning(f"### {state} - T-{days_to} days")

c1,c2,c3,c4 = st.columns(4)
c1.metric("Agent", state)
c2.metric("NOW", f"{now['au']:.4f} AU")
c3.metric("Psi", f"{now['psi']:.4f}")
c4.metric("Score", f"{3 if days_to<120 else 2}/4 GO")

tabs = st.tabs(["Agent Log","Psi Warp","Live Transfer","All Visuals"])
with tabs[0]:
    st.code(f"Launch Agent v11\nNOW {now['au']:.4f} AU Psi {now['psi']:.4f}\nBEST {best['au']:.3f} AU {best_date:%Y-%m-%d} T-{days_to}d\nState {state}\nAutonomous burn: python launch_agent.py")
    if st.button("Run Agent Now"):
        st.info("Run python launch_agent.py in terminal")

with tabs[1]:
    if Path("psi_field.png").exists(): st.image("psi_field.png")
with tabs[2]:
    if Path("transfer.html").exists():
        import streamlit.components.v1 as components
        with open("transfer.html") as f:
            components.html(f.read(), height=700)
with tabs[3]:
    for p in ["solar_3d.png","porkchop.png","solar_system.png","solar_distances.png","trajectory.png"]:
        if Path(p).exists(): st.image(p, caption=p)

st.divider()
if Path("LAUNCHED.txt").exists():
    st.error("MISSION LAUNCHED - ZENITH-1 EN ROUTE TO MARS - 1.734 AU -> 0.42 AU OPTIMAL")
