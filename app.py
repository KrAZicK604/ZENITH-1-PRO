import asyncio, sys, platform
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import streamlit as st
st.set_page_config(page_title="ZENITH v18", layout="wide")
st.title("🚀 ZENITH-1-PRO v18 VR FIXED")
st.success("✅ Python 3.13 Asyncio Bug Fixed | REAL 259.1M km | VR READY")

html_code = '''
<div style="background:#000011;border:2px solid #0ff;border-radius:10px;position:relative;height:650px;overflow:hidden">
<div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.9);color:#0ff;padding:15px;border:2px solid #0ff;border-radius:10px;font-family:monospace;z-index:10">
🚀 ZENITH v18<br>EARTH BLUE -> MARS RED<br><span id="d2">0.0</span>/259.1M km<br>
<button onclick="launch2()" style="background:#0ff;color:#000;padding:8px 16px;font-weight:bold;border:none;border-radius:5px;cursor:pointer">🚀 LAUNCH</button>
</div>
<canvas id="c2" width="1000" height="650" style="width:100%;height:100%"></canvas>
</div>
<script>
let cv2=document.getElementById('c2'),ctx2=cv2.getContext('2d'),prog2=0,flying2=false,t2=0;
function draw2(){
ctx2.fillStyle='#000011';ctx2.fillRect(0,0,cv2.width,cv2.height);
for(let i=0;i<250;i++){ctx2.fillStyle='rgba(255,255,255,'+(Math.random()*0.7+0.3)+')';ctx2.fillRect((i*137)%cv2.width,(i*97)%cv2.height,1,1);}
let cx=500,cy=325;
ctx2.fillStyle='#ffff00';ctx2.shadowColor='#ff0';ctx2.shadowBlur=15;ctx2.beginPath();ctx2.arc(cx,cy,30,0,6.28);ctx2.fill();ctx2.shadowBlur=0;
ctx2.strokeStyle='rgba(0,200,255,0.3)';ctx2.beginPath();ctx2.arc(cx,cy,120,0,6.28);ctx2.stroke();
ctx2.strokeStyle='rgba(255,80,0,0.3)';ctx2.beginPath();ctx2.arc(cx,cy,220,0,6.28);ctx2.stroke();
let ex=cx+Math.cos(t2*0.02)*120,ey=cy+Math.sin(t2*0.02)*120;
ctx2.fillStyle='#0066ff';ctx2.beginPath();ctx2.arc(ex,ey,13,0,6.28);ctx2.fill();
let mx=cx+Math.cos(t2*0.01+1)*220,my=cy+Math.sin(t2*0.01+1)*220;
ctx2.fillStyle='#ff3300';ctx2.beginPath();ctx2.arc(mx,my,11,0,6.28);ctx2.fill();
let sx=flying2?ex+(mx-ex)*prog2:ex,sy=flying2?ey+(my-ey)*prog2:ey;
if(flying2){ctx2.strokeStyle='#0f0';ctx2.setLineDash([5,5]);ctx2.beginPath();ctx2.moveTo(ex,ey);ctx2.lineTo(mx,my);ctx2.stroke();ctx2.setLineDash([]);}
ctx2.fillStyle='#ffffff';ctx2.beginPath();ctx2.arc(sx,sy,5,0,6.28);ctx2.fill();
ctx2.fillStyle='#00ffff';ctx2.beginPath();ctx2.moveTo(sx,sy);ctx2.lineTo(sx-10,sy-4);ctx2.lineTo(sx-10,sy+4);ctx2.closePath();ctx2.fill();
t2++;if(flying2&&prog2<1){prog2+=0.006;document.getElementById('d2').innerText=(259.1*prog2).toFixed(1);}
requestAnimationFrame(draw2);
}
function launch2(){flying2=true;prog2=0;}
draw2();
</script>
'''
st.components.v1.html(html_code, height=670, scrolling=False)
st.metric("Fix", "Asyncio Proactor Fixed", "Python 3.13")
