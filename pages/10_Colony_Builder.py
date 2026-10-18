import streamlit as st
st.set_page_config(page_title="ZENITH v24 COLONY", layout="wide", page_icon="🏗️")
st.title("🏗️ ZENITH v24 - MARS COLONY BUILDER")
st.markdown("### You landed! Now build base to survive")

# Colony state
if 'colony' not in st.session_state:
    st.session_state.colony = {"power": 50, "water": 100, "oxygen": 100, "crew": 3, "sol": 1, "structures": []}

col1,col2,col3,col4,col5 = st.columns(5)
col1.metric("Power", f"{st.session_state.colony['power']} kW", "Solar")
col2.metric("Water", f"{st.session_state.colony['water']} L", "Ice mining")
col3.metric("Oxygen", f"{st.session_state.colony['oxygen']}%", "MOXIE")
col4.metric("Crew", st.session_state.colony['crew'], "Alive")
col5.metric("Sol", st.session_state.colony['sol'], "Days on Mars")

# Build menu
st.markdown("---")
st.subheader("🔨 Build Structures (Uses 259.1M km mission supplies)")

c1,c2,c3,c4 = st.columns(4)
with c1:
    if st.button("☀️ Solar Array (+20kW)"):
        st.session_state.colony['power']+=20
        st.session_state.colony['structures'].append("Solar")
        st.balloons()
with c2:
    if st.button("💧 Water Extractor (+50L)"):
        st.session_state.colony['water']+=50
        st.session_state.colony['power']-=5
        st.session_state.colony['structures'].append("Water")
with c3:
    if st.button("🏠 Habitat (+2 crew)"):
        st.session_state.colony['crew']+=2
        st.session_state.colony['oxygen']-=10
        st.session_state.colony['structures'].append("Habitat")
with c4:
    if st.button("🚀 Fuel Factory (Return)"):
        st.session_state.colony['power']-=30
        st.session_state.colony['structures'].append("Fuel Factory - Can return to Earth!")
        st.snow()
        st.success("Fuel factory built! You can now return!")

# Colony visual
html = f"""
<!DOCTYPE html><html><head><style>
body{{margin:0;background:linear-gradient(to bottom,#ff6a00,#cc3300,#331100);overflow:hidden;height:100vh}}
#mars{{position:relative;width:100%;height:100vh}}
.base{{position:absolute;background:rgba(255,255,255,0.9);border-radius:8px;padding:6px;font-size:10px;font-family:monospace}}
#sun{{position:absolute;top:30px;right:80px;width:40px;height:40px;background:#ff0;border-radius:50%;box-shadow:0 0 30px #ff0}}
.dust{{position:absolute;width:2px;height:2px;background:rgba(255,200,100,0.6);border-radius:50%}}
</style></head><body>
<div id=mars>
<div id=sun></div>
<div style=position:absolute;top:50%;left:10%;color:#fff;font-family:monospace;font-size:12px>
🏗️ COLONY SOL {st.session_state.colony['sol']}<br>
Structures: {len(st.session_state.colony['structures'])}<br>
{', '.join(st.session_state.colony['structures'][-5:])}
</div>
<div class=base style=left:40%;top:60%>🏠 Habitat<br>Crew: {st.session_state.colony['crew']}</div>
<div class=base style=left:55%;top:55%>☀️ Solar<br>{st.session_state.colony['power']}kW</div>
<div class=base style=left:30%;top:70%>💧 Water<br>{st.session_state.colony['water']}L</div>
<div style=position:absolute;bottom:20px;left:20px;color:#ffcc99;font-family:monospace;font-size:10px>
Mars Jezero Crater | 18.38°N 77.58°E | Temp -63°C | Your colony from 259.1M km journey
</div>
</div>
<script>
for(let i=0;i<100;i++){{
 let d=document.createElement('div');d.className='dust';
 d.style.left=Math.random()*100+'%';d.style.top=Math.random()*100+'%';
 d.style.animation=`fall ${{5+Math.random()*10}}s linear infinite`;
 document.getElementById('mars').appendChild(d);
}}
</script>
<style>@keyframes fall{{0%{{transform:translateX(0) translateY(-10px)}}100%{{transform:translateX(100px) translateY(100vh)}}}}</style>
</body></html>
"""
st.components.v1.html(html, height=500, scrolling=False)

st.markdown("---")
colA,colB = st.columns(2)
with colA:
    if st.button("⏭️ Next Sol (Day)"):
        st.session_state.colony['sol']+=1
        st.session_state.colony['power']-=2
        st.session_state.colony['water']-=5
        st.session_state.colony['oxygen']-=1
        st.rerun()
with colB:
    if st.button("💥 Reset Colony"):
        st.session_state.colony = {"power": 50, "water": 100, "oxygen": 100, "crew": 3, "sol": 1, "structures": []}
        st.rerun()

st.info(f"Structures: {st.session_state.colony['structures']} | Survive 100 Sols to win!")
if st.session_state.colony['sol'] >= 100:
    st.balloons()
    st.success("🎉 100 Sols survived! Mars Colony established! You are Martian!")
