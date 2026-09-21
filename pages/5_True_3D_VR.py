import streamlit as st
st.title("🥽 TRUE 3D VR - Three.js Stereoscopic")
st.markdown("**Put on Quest 3 -> Click ENTER VR -> Real 3D Space!**")
three_html = """
<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;overflow:hidden;background:#000}canvas{display:block}#hud{position:absolute;top:15px;left:15px;color:#0ff;background:rgba(0,0,0,0.8);padding:15px;border:2px solid #0ff;border-radius:10px;font-family:monospace;z-index:10}button{background:#0ff;color:#000;padding:10px 20px;font-weight:bold;border:none;border-radius:8px;cursor:pointer;margin-top:10px}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head><body>
<div id=hud>🚀 ZENITH TRUE 3D VR<br>Click ENTER VR below<br><button id=vr>ENTER VR</button><br><span id=info>Ready</span></div>
<script type="module">
import * as THREE from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
let scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,10000), renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;document.body.appendChild(renderer.domElement);
document.getElementById('vr').replaceWith(VRButton.createButton(renderer));
scene.background=new THREE.Color(0x000011);
// Stars
let starGeo=new THREE.BufferGeometry(), starPos=[];
for(let i=0;i<5000;i++){starPos.push((Math.random()-0.5)*2000,(Math.random()-0.5)*2000,(Math.random()-0.5)*2000);}
starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.5})));
// Sun
let sun=new THREE.Mesh(new THREE.SphereGeometry(15,32,32), new THREE.MeshBasicMaterial({color:0xffff00}));
sun.position.set(0,0,-100);scene.add(sun);
let sunLight=new THREE.PointLight(0xffaa00,2,1000);sunLight.position.copy(sun.position);scene.add(sunLight);
// Earth orbit
let earth=new THREE.Mesh(new THREE.SphereGeometry(5,32,32), new THREE.MeshPhongMaterial({color:0x0066ff}));scene.add(earth);
let mars=new THREE.Mesh(new THREE.SphereGeometry(4,32,32), new THREE.MeshPhongMaterial({color:0xff3300}));scene.add(mars);
let ship=new THREE.Mesh(new THREE.SphereGeometry(1,16,16), new THREE.MeshBasicMaterial({color:0xffffff}));scene.add(ship);
let t=0, prog=0, flying=false;
document.addEventListener('click',()=>{flying=true;prog=0;});
function animate(){
  t+=0.01;
  earth.position.set(Math.cos(t*0.5)*40,0,Math.sin(t*0.5)*40-100);
  mars.position.set(Math.cos(t*0.2+2)*80,0,Math.sin(t*0.2+2)*80-100);
  if(flying && prog<1){prog+=0.002;ship.position.lerpVectors(earth.position,mars.position,prog);document.getElementById('info').innerText=(259.1*prog).toFixed(1)+'M km '+ (prog*100).toFixed(1)+'%'; if(prog>=1)flying=false;} 
  else if(!flying) ship.position.copy(earth.position);
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
camera.position.set(0,30,80);
</script></body></html>
"""
st.components.v1.html(three_html, height=700, scrolling=False)
st.success("🥽 TRUE VR: Works on Quest 2/3 - Click ENTER VR button inside canva
cd C:\Users\curtz\Downloads\ZENITH-1-PRO

# PAGE 5: 3D TRUE VR WITH THREE.JS (2)
@'
import streamlit as st
st.title("🥽 TRUE 3D VR - Three.js Stereoscopic")
st.markdown("**Put on Quest 3 -> Click ENTER VR -> Real 3D Space!**")
three_html = """
<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;overflow:hidden;background:#000}canvas{display:block}#hud{position:absolute;top:15px;left:15px;color:#0ff;background:rgba(0,0,0,0.8);padding:15px;border:2px solid #0ff;border-radius:10px;font-family:monospace;z-index:10}button{background:#0ff;color:#000;padding:10px 20px;font-weight:bold;border:none;border-radius:8px;cursor:pointer;margin-top:10px}</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head><body>
<div id=hud>🚀 ZENITH TRUE 3D VR<br>Click ENTER VR below<br><button id=vr>ENTER VR</button><br><span id=info>Ready</span></div>
<script type="module">
import * as THREE from 'three';
import {VRButton} from 'three/addons/webxr/VRButton.js';
let scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.1,10000), renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;document.body.appendChild(renderer.domElement);
document.getElementById('vr').replaceWith(VRButton.createButton(renderer));
scene.background=new THREE.Color(0x000011);
// Stars
let starGeo=new THREE.BufferGeometry(), starPos=[];
for(let i=0;i<5000;i++){starPos.push((Math.random()-0.5)*2000,(Math.random()-0.5)*2000,(Math.random()-0.5)*2000);}
starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.5})));
// Sun
let sun=new THREE.Mesh(new THREE.SphereGeometry(15,32,32), new THREE.MeshBasicMaterial({color:0xffff00}));
sun.position.set(0,0,-100);scene.add(sun);
let sunLight=new THREE.PointLight(0xffaa00,2,1000);sunLight.position.copy(sun.position);scene.add(sunLight);
// Earth orbit
let earth=new THREE.Mesh(new THREE.SphereGeometry(5,32,32), new THREE.MeshPhongMaterial({color:0x0066ff}));scene.add(earth);
let mars=new THREE.Mesh(new THREE.SphereGeometry(4,32,32), new THREE.MeshPhongMaterial({color:0xff3300}));scene.add(mars);
let ship=new THREE.Mesh(new THREE.SphereGeometry(1,16,16), new THREE.MeshBasicMaterial({color:0xffffff}));scene.add(ship);
let t=0, prog=0, flying=false;
document.addEventListener('click',()=>{flying=true;prog=0;});
function animate(){
  t+=0.01;
  earth.position.set(Math.cos(t*0.5)*40,0,Math.sin(t*0.5)*40-100);
  mars.position.set(Math.cos(t*0.2+2)*80,0,Math.sin(t*0.2+2)*80-100);
  if(flying && prog<1){prog+=0.002;ship.position.lerpVectors(earth.position,mars.position,prog);document.getElementById('info').innerText=(259.1*prog).toFixed(1)+'M km '+ (prog*100).toFixed(1)+'%'; if(prog>=1)flying=false;}
  else if(!flying) ship.position.copy(earth.position);
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
camera.position.set(0,30,80);
</script></body></html>
"""
st.components.v1.html(three_html, height=700, scrolling=False)
st.success("🥽 TRUE VR: Works on Quest 2/3 - Click ENTER VR button inside canvas!")
st.markdown("**How to use:** 1. Open in Quest Browser 2. Click ENTER VR 3. You are IN SPACE between Earth and Mars!")
</body></html>
'''
st.set_page_config(page_title="True 3D VR", layout="wide")
