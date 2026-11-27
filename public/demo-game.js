
// PEERJS ONLINE - SIMPLE WORKING
let peer, myPeerId, connections={}, myId='zenith_'+Math.random().toString(36).substr(2,5), gameRunning=false, gameScore=0, gameState={x:40,y:140,vx:2.5,vy:0,boosts:3,asteroids:[],targetX:320,targetY:140,moonX:150,moonY:140}, leaderboard=[];
let roomIdFromUrl = new URLSearchParams(window.location.search).get('room');

function initPeer(){
  peer=new Peer(myId);
  peer.on('open', id=>{
    myPeerId=id;
    document.getElementById('myRoomId').innerText=id;
    document.getElementById('debugRoom').innerText=id;
    document.getElementById('debugPeer').innerText=id;
    document.getElementById('shareLink').innerText=roomShareUrl(id);
    document.getElementById('peerStatus').innerText='ONLINE Ready';
    document.getElementById('peerStatus').style.color='#0f0';
    document.getElementById('debugStatus').innerText='ONLINE Ready';
    if(roomIdFromUrl&&roomIdFromUrl!=id){document.getElementById('joinRoomInput').value=roomIdFromUrl;setTimeout(()=>joinRoom(),800);}
    refreshLeaderboard();
  });
  peer.on('connection', conn=>{setupConnection(conn);});
  peer.on('error', err=>{document.getElementById('peerStatus').innerText='Error '+err.type;});
}
function setupConnection(conn){
  conn.on('open', ()=>{
    connections[conn.peer]=conn;
    document.getElementById('peerStatus').innerText='Connected to '+conn.peer.substr(0,5)+' - '+Object.keys(connections).length+' friends';
    document.getElementById('playerCount').innerText=Object.keys(connections).length+1;
    document.getElementById('taskPlayers').innerText=Object.keys(connections).length+1;
    document.getElementById('onlinePlayers').innerText=Object.keys(connections).length+1;
    document.getElementById('debugConns').innerText=Object.keys(connections).length;
    document.getElementById('playerList').innerHTML+='<div style=color:#f0f>● Friend '+conn.peer.substr(0,4)+' - Online</div>';
  });
  conn.on('data', data=>{if(data.type=='playerMove')updateRemotePlayer(data.id,data.x,data.y); if(data.type=='newScore'){leaderboard.push(data.scoreData); renderLeaderboard();}});
  conn.on('close', ()=>{delete connections[conn.peer];document.getElementById('playerCount').innerText=Object.keys(connections).length+1;document.getElementById('taskPlayers').innerText=Object.keys(connections).length+1;document.getElementById('debugConns').innerText=Object.keys(connections).length;});
}
function joinRoom(){
  let target=document.getElementById('joinRoomInput').value.trim();
  if(!target||target==myPeerId){alert('Enter friend Room ID');return;}
  if(!peer)return; let conn=peer.connect(target);
  setupConnection(conn);
  setTimeout(()=>{if(!connections[target]){alert('Failed to connect - Make sure friend Room ID correct and friend online');}},3000);
}
function roomShareUrl(id){const u=new URL(window.location.href);u.searchParams.set('room',id);u.hash='';return u.toString();}
function copyRoomId(){if(!myPeerId){alert('Room is not ready yet');return;}const link=roomShareUrl(myPeerId);navigator.clipboard.writeText(link).then(()=>alert('Room link copied')).catch(()=>prompt('Copy room link:',link));}
function updateRemotePlayer(id,x,y){
  let el=document.getElementById('player_'+id);
  if(!el){el=document.createElement('div');el.id='player_'+id;el.style.position='absolute';el.style.width='12px';el.style.height='16px';el.style.background='#f0f';el.style.borderRadius='3px';el.style.boxShadow='0 0 10px #f0f';el.style.zIndex='150';el.style.pointerEvents='none';document.body.appendChild(el);}
  el.style.left=x+'px';el.style.top=y+'px';
}
function testConnection(){alert('Room ID: '+(myPeerId||'not connected')+'\nConnections: '+Object.keys(connections).length+'\nShare link: '+(myPeerId?roomShareUrl(myPeerId):'not available'));}
document.getElementById('peerStatus').textContent='OFFLINE DEMO'; document.getElementById('debugStatus').textContent='OFFLINE DEMO';

// WINDOW MANAGEMENT - FIXED - DRAGGABLE TABS WORK NOW
function closeWindow(id){
 if(id==='winGame')stopRace();
 document.getElementById(id).classList.add('hidden');updateTaskbar();
}
function stopRace(){gameRunning=false;raceGeneration++;document.body.classList.remove('race-focus');}
function closeRace(){closeWindow('winGame');}
function toggleRaceFocus(){
 const win=document.getElementById('winGame');
 if(win.classList.contains('hidden'))openWindow('winGame');
 const active=document.body.classList.toggle('race-focus');
 document.getElementById('raceFocusBtn').textContent=active?'↙ WINDOW MODE':'⛶ FOCUS RACE';
 if(active)win.style.zIndex=950;
}
function openWindow(id){if(id!=='winGame')document.body.classList.remove('race-focus');document.getElementById(id).classList.remove('hidden'); document.getElementById(id).style.zIndex=100; updateTaskbar();}
function toggleWindow(id){let el=document.getElementById(id); if(el.classList.contains('hidden')){openWindow(id);} else {closeWindow(id);}}
function updateTaskbar(){
  document.querySelectorAll('.ticon').forEach(icon=>icon.classList.remove('active'));
  document.querySelectorAll('.window').forEach(win=>{
    if(!win.classList.contains('hidden')){
      let iconId='icon'+win.id.replace('win','');
      let icon=document.getElementById(iconId);
      if(icon) icon.classList.add('active');
    }
  });
}

// DRAG WINDOWS - FIXED
document.querySelectorAll('.window').forEach(win=>{
  let bar=win.querySelector('.titlebar');
  if(!bar) return;
  let isDown=false, offsetX, offsetY;
  bar.addEventListener('mousedown', e=>{
    if(e.target.closest('.close')||document.body.classList.contains('race-focus'))return;
    isDown=true;
    offsetX=e.clientX-win.offsetLeft;
    offsetY=e.clientY-win.offsetTop;
    win.style.zIndex=100;
    document.querySelectorAll('.window').forEach(w=>{if(w!=win) w.style.zIndex=20;});
    e.preventDefault();
  });
  document.addEventListener('mousemove', e=>{
    if(isDown){
      win.style.left=(e.clientX-offsetX)+'px';
      win.style.top=(e.clientY-offsetY)+'px';
    }
  });
  document.addEventListener('mouseup', ()=>{isDown=false;});
  // Touch for mobile
  bar.addEventListener('touchstart', e=>{
    if(e.target.closest('.close')||document.body.classList.contains('race-focus'))return;
    isDown=true;
    offsetX=e.touches[0].clientX-win.offsetLeft;
    offsetY=e.touches[0].clientY-win.offsetTop;
    win.style.zIndex=100;
  });
  document.addEventListener('touchmove', e=>{
    if(isDown){
      win.style.left=(e.touches[0].clientX-offsetX)+'px';
      win.style.top=(e.touches[0].clientY-offsetY)+'px';
    }
  });
  document.addEventListener('touchend', ()=>{isDown=false;});
});

// Stylized fast-spin planet renderer: plausible lunar/Martian palette, NOT calibrated surface imagery.
function drawRotatingWorld(g,x,y,r,kind,time){
 const mars=kind==='mars', spin=time*(mars?1.8:1.1);
 g.save();g.translate(x,y);
 const halo=g.createRadialGradient(0,0,r*.75,0,0,r*1.65);
 halo.addColorStop(0,mars?'rgba(237,108,54,.18)':'rgba(155,185,211,.13)');
 halo.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=halo;g.beginPath();g.arc(0,0,r*1.65,0,Math.PI*2);g.fill();
 g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.clip();
 const surface=g.createLinearGradient(-r,-r,r,r);
 if(mars){surface.addColorStop(0,'#e6a16b');surface.addColorStop(.48,'#b95736');surface.addColorStop(1,'#592e2c');}
 else{surface.addColorStop(0,'#c4c9ca');surface.addColorStop(.55,'#818a91');surface.addColorStop(1,'#414c58');}
 g.fillStyle=surface;g.fillRect(-r,-r,2*r,2*r);
 // Longitude features travel across the visible disk and compress near its limb.
 for(let i=0;i<12;i++){
   const phase=spin+i*2.39996,longitude=Math.sin(phase),depth=Math.cos(phase);
   if(depth<-.12)continue;
   const px=longitude*r*.91,py=Math.sin(i*3.73)*r*.7;
   const width=(mars?.31:.22)*r*(.22+.78*Math.max(0,depth));
   const height=(mars?.17:.14)*r*(.7+.3*Math.abs(Math.sin(i)));
   g.save();g.translate(px,py);g.rotate(Math.sin(i*4.1)*.8);
   g.fillStyle=mars?(i%3===0?'rgba(97,49,41,.56)':'rgba(233,156,105,.4)'):(i%3===0?'rgba(51,62,75,.46)':'rgba(206,213,212,.22)');
   g.beginPath();g.ellipse(0,0,width,height,0,0,Math.PI*2);g.fill();g.restore();
 }
 if(mars){
   g.fillStyle='rgba(242,222,192,.85)';g.beginPath();g.ellipse(0,-r*.9,r*.44,r*.17,0,0,Math.PI*2);g.fill();
 }
 // Day/night terminator and rim lighting make the sphere read as a globe.
 const shade=g.createLinearGradient(-r,0,r,0);
 shade.addColorStop(0,'rgba(5,9,17,.72)');shade.addColorStop(.42,'rgba(8,13,22,.15)');
 shade.addColorStop(.82,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.32)');
 g.fillStyle=shade;g.fillRect(-r,-r,r*2,r*2);
 g.restore();
 g.strokeStyle=mars?'rgba(251,172,121,.66)':'rgba(204,225,238,.46)';
 g.lineWidth=.75;g.beginPath();g.arc(x,y,r-.4,0,Math.PI*2);g.stroke();
}

// Independent animated planet atlas; does not modify the Mars race physics or target.
const ZENITH_PLANETS=[
 {name:'Mercury',size:13,base:['#aeb0a8','#777a7b','#3d444b'],kind:'rock',speed:1.2},
 {name:'Venus',size:17,base:['#f7d8a3','#d7a96b','#946c49'],kind:'cloud',speed:-.5},
 {name:'Earth',size:19,base:['#4ca7db','#1763aa','#0b284e'],kind:'earth',speed:1.5},
 {name:'Mars',size:15,base:['#e7a06d','#ba593a','#602e2c'],kind:'rock',speed:1.3},
 {name:'Jupiter',size:30,base:['#e7d3b3','#ba916e','#735a4e'],kind:'gas',speed:2.6},
 {name:'Saturn',size:25,base:['#f3ddb2','#bba579','#75664e'],kind:'saturn',speed:2.2},
 {name:'Uranus',size:20,base:['#c2f1ee','#83c9d4','#4e8d9d'],kind:'ice',speed:-1.7},
 {name:'Neptune',size:20,base:['#5c8fe4','#2854af','#142c67'],kind:'ice',speed:2.1}
];
function drawAtlasPlanet(g,p,x,y,t){
 const r=p.size,spin=t*p.speed;
 g.save();g.translate(x,y);
 if(p.kind==='saturn'){
   g.save();g.rotate(-.32);g.strokeStyle='rgba(218,196,150,.58)';g.lineWidth=7;
   g.beginPath();g.ellipse(0,0,r*1.73,r*.49,0,Math.PI,2*Math.PI);g.stroke();g.restore();
 }
 g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.clip();
 const surface=g.createLinearGradient(-r,-r,r,r);
 surface.addColorStop(0,p.base[0]);surface.addColorStop(.55,p.base[1]);surface.addColorStop(1,p.base[2]);
 g.fillStyle=surface;g.fillRect(-r,-r,r*2,r*2);
 if(['gas','saturn','cloud','ice'].includes(p.kind)){
   for(let j=0;j<11;j++){
     const bandY=(j-5)*r*.19+Math.sin(spin+j*.9)*r*.045;
     g.fillStyle=j%3===0?'rgba(255,244,218,.31)':'rgba(67,76,94,.17)';
     g.fillRect(-r,bandY,r*2,r*(p.kind==='ice'?.07:.13));
   }
   if(p.kind==='gas'){
     const spotX=Math.sin(spin+.6)*r*.65;
     g.fillStyle='rgba(164,85,63,.67)';g.beginPath();g.ellipse(spotX,r*.34,r*.27,r*.12,-.15,0,Math.PI*2);g.fill();
   }
 }else{
   for(let j=0;j<18;j++){
     const longitude=spin+j*2.39996,depth=Math.cos(longitude);
     if(depth<0)continue;
     const px=Math.sin(longitude)*r*.87,py=Math.sin(j*3.47)*r*.76;
     const w=r*(.12+.18*depth),h=r*(.09+.1*(j%3)/2);
     g.fillStyle=p.kind==='earth'?(j%4===0?'rgba(248,249,249,.66)':'rgba(91,158,94,.87)'):(j%3===0?'rgba(40,45,50,.33)':'rgba(240,214,188,.23)');
     g.beginPath();g.ellipse(px,py,w,h,j*.25,0,Math.PI*2);g.fill();
   }
   if(p.kind==='earth'){
     g.fillStyle='rgba(238,247,250,.76)';
     g.beginPath();g.ellipse(0,-r*.91,r*.6,r*.16,0,0,Math.PI*2);g.fill();
   }
 }
 const shade=g.createLinearGradient(-r,0,r,0);
 shade.addColorStop(0,'rgba(0,4,13,.77)');shade.addColorStop(.45,'rgba(0,3,12,.13)');shade.addColorStop(1,'rgba(0,0,0,.17)');
 g.fillStyle=shade;g.fillRect(-r,-r,r*2,r*2);
 g.restore();
 if(p.kind==='saturn'){
   g.save();g.translate(x,y);g.rotate(-.32);
   g.strokeStyle='rgba(239,214,164,.74)';g.lineWidth=6;
   g.beginPath();g.ellipse(0,0,r*1.73,r*.49,0,0,Math.PI);g.stroke();g.restore();
 }
 g.font='11px Segoe UI,Arial,sans-serif';g.fillStyle='#d5e7f4';g.textAlign='center';
 g.fillText(p.name,x,y+r+(p.kind==='saturn'?20:16));
}
function startPlanetAtlas(){
 const canvas=document.getElementById('planetAtlas');if(!canvas)return;
 const g=canvas.getContext('2d');if(!g)return;
 const ratio=Math.min(Math.max(window.devicePixelRatio||1,1),4);
 const width=720,height=360;
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 g.setTransform(ratio,0,0,ratio,0,0);
 const start=performance.now();
 function frame(now){
   const t=(now-start)/1000;
   g.fillStyle='#02050b';g.fillRect(0,0,width,height);
   for(let i=0;i<ZENITH_PLANETS.length;i++){
     const col=i%4,row=Math.floor(i/4);
     drawAtlasPlanet(g,ZENITH_PLANETS[i],90+col*180,75+row*177,t);
   }
   // Hidden tab/window: avoid needless full-resolution redraw work.
   if(!document.hidden && canvas.getClientRects().length)requestAnimationFrame(frame);
   else setTimeout(()=>requestAnimationFrame(frame),250);
 }
 requestAnimationFrame(frame);
}
startPlanetAtlas();
// Resolution-independent vector spacecraft; no change to game collision physics.
function drawZenithShip(g,x,y,vx,vy){
 g.save();g.translate(x,y);g.rotate(Math.atan2(vy,vx));
 const exhaust=g.createLinearGradient(-22,0,-7,0);
 exhaust.addColorStop(0,'rgba(45,115,255,0)');exhaust.addColorStop(.7,'rgba(82,172,255,.7)');exhaust.addColorStop(1,'#e1f7ff');
 g.fillStyle=exhaust;g.beginPath();g.moveTo(-8,-3);g.lineTo(-22,0);g.lineTo(-8,3);g.fill();
 g.shadowColor='rgba(93,183,255,.4)';g.shadowBlur=7;
 g.fillStyle='#63819a';g.strokeStyle='#dcebf7';g.lineWidth=.7;
 for(const sign of [-1,1]){g.beginPath();g.moveTo(-3,sign*2);g.lineTo(-12,sign*11);g.lineTo(-4,sign*10);g.lineTo(6,sign*3);g.closePath();g.fill();g.stroke();}
 const hull=g.createLinearGradient(0,-8,0,8);
 hull.addColorStop(0,'#f4f9fc');hull.addColorStop(.45,'#9fb8cd');hull.addColorStop(.65,'#506b83');hull.addColorStop(1,'#d6e6ef');
 g.fillStyle=hull;g.beginPath();g.moveTo(13,0);g.lineTo(3,-4);g.lineTo(-9,-3);g.lineTo(-9,3);g.lineTo(3,4);g.closePath();g.fill();g.stroke();
 g.shadowBlur=0;g.fillStyle='#102e49';g.strokeStyle='#8bd9ff';g.lineWidth=.7;
 g.beginPath();g.ellipse(4,0,3.3,1.7,0,0,Math.PI*2);g.fill();g.stroke();
 g.strokeStyle='#e6f3fa';g.beginPath();g.moveTo(-7,0);g.lineTo(0,0);g.stroke();
 g.fillStyle='#ffbb76';g.fillRect(-9,-1,1.4,2);g.restore();
}
function prepareGameCanvas(cvs,g){
 const ratio=Math.min(Math.max(window.devicePixelRatio||1,1),4);
 const w=Math.round(360*ratio),h=Math.round(280*ratio);
 if(cvs.width!==w||cvs.height!==h){cvs.width=w;cvs.height=h;}
 g.setTransform(ratio,0,0,ratio,0,0);
}
// GAME
let raceGeneration=0, simTime=0;
const STEP_MS=1000/60;
function fixedSteps(acc,elapsed){const total=acc+Math.max(0,Math.min(100,elapsed));const count=Math.floor((total+1e-8)/STEP_MS);return [count,Math.max(0,total-count*STEP_MS)];}
function impactTime(x,y,nx,ny,a,r){const dx=nx-x,dy=ny-y,ox=x-a.x,oy=y-a.y,c=ox*ox+oy*oy-r*r;if(c<=0)return 0;const A=dx*dx+dy*dy,B=ox*dx+oy*dy,D=B*B-A*c;if(!A||D<0)return Infinity;const t=(-B-Math.sqrt(D))/A;return t>=0&&t<=1?t:Infinity;}
function nearestHit(x,y,nx,ny,targets){let best=null,time=Infinity;for(const a of targets){if(a.hp<=0)continue;const t=impactTime(x,y,nx,ny,a,a.r||9);if(t<time){best=a;time=t;}}return best;}
function guide(p,target){if(!target)return;const angle=Math.atan2(p.vy,p.vx),desired=Math.atan2(target.y-p.y,target.x-p.x),delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),next=angle+Math.max(-.12,Math.min(.12,delta));p.vx=5*Math.cos(next);p.vy=5*Math.sin(next);}
let enemyShots=[], sparks=[], bossSpawned=false;
let shots=[], enemies=[], shield=100, missiles=3, lastFire=-Infinity, locked=false, damageAt=-Infinity;
function segmentHit(x,y,nx,ny,a,r){const dx=nx-x,dy=ny-y,l=dx*dx+dy*dy;const t=l?Math.max(0,Math.min(1,((a.x-x)*dx+(a.y-y)*dy)/l)):0;return Math.hypot(x+t*dx-a.x,y+t*dy-a.y)<=r;}
function fireWeapon(missile=false){if(!gameRunning||shots.length>=64||simTime-lastFire<150||(missile&&missiles===0))return;lastFire=simTime;if(missile)missiles--;const target=locked?enemies[0]:null;const angle=target?Math.atan2(target.y-gameState.y,target.x-gameState.x):Math.atan2(gameState.vy,gameState.vx);shots.push({x:gameState.x,y:gameState.y,vx:Math.cos(angle)*(missile?5:9),vy:Math.sin(angle)*(missile?5:9),life:missile?120:60,homing:missile&&locked,damage:missile?100:35,missile});}
function combatHUD(){document.getElementById('combatHUD').textContent='Shield '+shield+'% | Missiles '+missiles+' | Hostiles '+enemies.length+' | Lock '+(locked?'ON':'OFF');}
function damageShip(amount){if(simTime-damageAt<700)return;damageAt=simTime;shield=Math.max(0,shield-amount);}
function burst(x,y){for(let i=0;i<12&&sparks.length<180;i++){const a=i*Math.PI/6;sparks.push({x,y,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:24});}}
function combatStep(g){for(const e of enemies){const d=Math.hypot(gameState.x-e.x,gameState.y-e.y)||1;e.x+=(gameState.x-e.x)/d*.65;e.y+=(gameState.y-e.y)/d*.65;if(d<13)damageShip(20);if(d<150&&simTime>(e.nextFire||0)&&enemyShots.length<40){e.nextFire=simTime+(e.boss?650:1800);enemyShots.push({x:e.x,y:e.y,vx:(gameState.x-e.x)/d*2.8,vy:(gameState.y-e.y)/d*2.8,life:100});}g.save();g.translate(e.x,e.y);g.fillStyle='#ff7755';g.beginPath();g.moveTo(-8,-6);g.lineTo(8,0);g.lineTo(-8,6);g.closePath();g.fill();g.fillStyle='#522';g.fillRect(-10,-13,20,3);g.fillStyle='#ff7755';g.fillRect(-10,-13,20*e.hp/(e.boss?300:100),3);g.restore();}
for(const p of shots){if(p.homing)guide(p,enemies[0]);const nx=p.x+p.vx,ny=p.y+p.vy;const target=nearestHit(p.x,p.y,nx,ny,[...enemies,...gameState.asteroids]);if(target){target.hp-=p.damage;p.life=0;if(target.hp<=0){gameScore+=target.boss?300:50;burst(target.x,target.y);}}g.strokeStyle=p.missile?'#ffbb66':'#7ffaff';g.lineWidth=p.missile?3:1.5;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(nx,ny);g.stroke();p.x=nx;p.y=ny;p.life--;}
shots=shots.filter(p=>p.life>0&&p.x>=0&&p.x<=360&&p.y>=0&&p.y<=280);enemies=enemies.filter(e=>e.hp>0);if(!enemies.length&&!bossSpawned){bossSpawned=true;enemies.push({x:300,y:40,hp:300,boss:true,nextFire:simTime+1500});}for(const p of enemyShots){const nx=p.x+p.vx,ny=p.y+p.vy;if(segmentHit(p.x,p.y,nx,ny,gameState,7)){damageShip(15);p.life=0;}g.strokeStyle='#ff4555';g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(nx,ny);g.stroke();p.x=nx;p.y=ny;p.life--;}enemyShots=enemyShots.filter(p=>p.life>0&&p.x>=0&&p.x<=360&&p.y>=0&&p.y<=280);for(const p of sparks){g.fillStyle='rgba(255,180,70,'+(p.life/24)+')';g.fillRect(p.x,p.y,2,2);p.x+=p.vx;p.y+=p.vy;p.life--;}sparks=sparks.filter(p=>p.life>0);g.save();g.translate(305,5);g.fillStyle='#081b2c';g.fillRect(0,0,50,40);g.strokeStyle='#65c9dc';g.strokeRect(0,0,50,40);for(const e of enemies){g.fillStyle='#ff5555';g.fillRect(e.x/360*50,e.y/280*40,3,3);}g.fillStyle='#75ffff';g.fillRect(gameState.x/360*50,gameState.y/280*40,3,3);g.restore();gameState.asteroids=gameState.asteroids.filter(a=>a.hp>0);combatHUD();}

const raceKeys=Object.create(null);
document.addEventListener('keydown',e=>{
 const tag=e.target?.tagName;
 if(e.key==='Escape'&&document.body.classList.contains('race-focus')){toggleRaceFocus();return;}
 if(!gameRunning||tag==='INPUT'||tag==='TEXTAREA')return;
 if(['f','g','t','r'].includes(e.key.toLowerCase())){e.preventDefault();if(!e.repeat){switch(e.key.toLowerCase()){case 'f':fireWeapon();break;case 'g':fireWeapon(true);break;case 't':locked=!locked;break;case 'r':if(gameState.boosts>0&&shield<100){gameState.boosts--;shield=Math.min(100,shield+30);}break;}combatHUD();}return;}
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)){
   e.preventDefault();raceKeys[e.key.toLowerCase()]=true;
   if(e.code==='Space'&&!e.repeat)doBoost();
 }
});
document.addEventListener('keyup',e=>{delete raceKeys[e.key.toLowerCase()];});
window.addEventListener('blur',()=>{for(const key of Object.keys(raceKeys))delete raceKeys[key];});
function launchSoloRace(){openWindow('winGame');startGame();}
function startMultiplayer(){if(!myPeerId){alert('Peer connection is not ready. Try SOLO instead.');return;}openWindow('winGame');startGame();}
function startGame(){
  gameRunning=false;
  const thisRace=++raceGeneration;
  openWindow('winGame');
  let cvs=document.getElementById('gameCanvas'),ctx2=cvs.getContext('2d');
  prepareGameCanvas(cvs,ctx2);
  document.getElementById('gameStatus').textContent='Flying';gameRunning=true;gameScore=0;gameState={x:40,y:140,vx:2.5,vy:0,boosts:3,asteroids:[],targetX:320,targetY:140,moonX:150,moonY:140};
  for(let i=0;i<10;i++)gameState.asteroids.push({x:80+Math.random()*200,y:Math.random()*280,r:Math.random()*7+3,vx:Math.random()*2-1,vy:Math.random()*2-1});
  for(const key of Object.keys(raceKeys))delete raceKeys[key];
  enemyShots=[];sparks=[];bossSpawned=false;shots=[];enemies=[{x:245,y:55,hp:100},{x:270,y:220,hp:100}];shield=100;missiles=3;locked=false;lastFire=-Infinity;damageAt=-Infinity;gameState.asteroids.forEach(a=>a.hp=35);combatHUD();
  simTime=0;
  let lastFrame=performance.now(),acc=0;
  function step(){
    if(!gameRunning||thisRace!==raceGeneration)return;
    simTime+=STEP_MS;const spinTime=simTime/1000;
    ctx2.fillStyle='rgba(0,0,0,0.25)';ctx2.fillRect(0,0,360,280);
    for(let i=0;i<60;i++){ctx2.fillStyle='rgba(255,255,255,0.5)';ctx2.fillRect((i*137)%360,(i*211)%280,1,1);}
    if(raceKeys['arrowup']||raceKeys['w'])gameState.vy-=0.3;if(raceKeys['arrowdown']||raceKeys['s'])gameState.vy+=0.3;if(raceKeys['arrowleft']||raceKeys['a'])gameState.vx-=0.18;if(raceKeys['arrowright']||raceKeys['d'])gameState.vx+=0.18;
    const speed=Math.hypot(gameState.vx,gameState.vy);if(speed>12){gameState.vx*=12/speed;gameState.vy*=12/speed;}gameState.x+=gameState.vx;gameState.y+=gameState.vy;gameState.vx*=0.992;gameState.vy*=0.992;
    let dx=gameState.moonX-gameState.x,dy=gameState.moonY-gameState.y,d=Math.sqrt(dx*dx+dy*dy);
    if(d<50){gameState.vx+=dx*0.03;gameState.vy+=dy*0.03;ctx2.strokeStyle='rgba(0,255,255,0.5)';ctx2.beginPath();ctx2.moveTo(gameState.x,gameState.y);ctx2.lineTo(gameState.moonX,gameState.moonY);ctx2.stroke();ctx2.fillStyle='rgba(0,255,255,0.12)';ctx2.beginPath();ctx2.arc(gameState.moonX,gameState.moonY,50,0,6.28);ctx2.fill();}
    if(gameState.x>360)gameState.x=0;if(gameState.x<0)gameState.x=360;if(gameState.y>280)gameState.y=0;if(gameState.y<0)gameState.y=280;
    drawRotatingWorld(ctx2,gameState.moonX,gameState.moonY,10,'moon',spinTime);
    drawRotatingWorld(ctx2,gameState.targetX,gameState.targetY,12,'mars',spinTime);
    drawZenithShip(ctx2,gameState.x,gameState.y,gameState.vx,gameState.vy);
    combatStep(ctx2);
    gameState.asteroids.forEach(a=>{
      a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>360)a.vx*=-1;if(a.y<0||a.y>280)a.vy*=-1;
      ctx2.fillStyle='#666';ctx2.beginPath();ctx2.arc(a.x,a.y,a.r,0,6.28);ctx2.fill();
      let d2=Math.sqrt((a.x-gameState.x)**2+(a.y-gameState.y)**2);
      if(d2<a.r+6)damageShip(35);
    });
    let dt=Math.sqrt((gameState.targetX-gameState.x)**2+(gameState.targetY-gameState.y)**2);
    if(shield===0){gameRunning=false;ctx2.fillStyle='#8b1728';ctx2.fillRect(0,0,360,280);ctx2.fillStyle='#fff';ctx2.font='16px monospace';ctx2.fillText('SHIP LOST — RESET',65,140);addScore('Solo',gameScore);}else if(dt<14){gameRunning=false;gameScore+=700+gameState.boosts*100;ctx2.fillStyle='rgba(0,255,0,0.85)';ctx2.fillRect(0,0,360,280);ctx2.fillStyle='#fff';ctx2.font='16px monospace';ctx2.fillText('MARS REACHED! '+gameScore+' WIN!',30,140);addScore('Peter',gameScore);}
    document.getElementById('gameScore').innerText=gameScore;document.getElementById('boostCount').innerText=gameState.boosts;
  }
  function loop(now){if(!gameRunning||thisRace!==raceGeneration)return;const [count,remainder]=fixedSteps(acc,now-lastFrame);acc=remainder;lastFrame=now;for(let i=0;i<count&&gameRunning;i++)step();if(gameRunning)requestAnimationFrame(loop);}
  step();if(gameRunning)requestAnimationFrame(loop);
}
function doBoost(){if(gameRunning&&gameState.boosts>0){gameState.vx*=2;gameState.vy*=2;gameState.boosts--;gameScore+=100;document.getElementById('gameScore').innerText=gameScore;}}
function resetGame(){gameRunning=false;startGame();}
function overclock(){document.body.style.filter='brightness(1.6)';setTimeout(()=>document.body.style.filter='',2000);}

// LEADERBOARD
function refreshLeaderboard(){
  let saved=null;try{saved=localStorage.getItem('zenithSoloDemoLeaderboard');}catch(e){}
  if(saved){try{const parsed=JSON.parse(saved);leaderboard=Array.isArray(parsed)?parsed.filter(e=>e&&Number.isFinite(e.score)&&Number.isFinite(e.time)).map(e=>({name:'Solo',score:e.score,time:e.time})):[];}catch(e){leaderboard=[];}}
  // Empty local scores are intentional: never present fabricated race results.
  renderLeaderboard();
}
function renderLeaderboard(){
  leaderboard.sort((a,b)=>b.score-a.score);
  let list=document.getElementById('realLeaderList');
  list.innerHTML='';
  leaderboard.slice(0,8).forEach((e,i)=>{
    let medal=i==0?'🥇':i==1?'🥈':i==2?'🥉':(i+1)+'.';
    let timeAgo=Math.floor((Date.now()-e.time)/60000)+'m ago';
    const row=document.createElement('div'); row.textContent=medal+' '+e.name+' - '+e.score+' pts · '+timeAgo; list.appendChild(row);
  });
  try{localStorage.setItem('zenithSoloDemoLeaderboard',JSON.stringify(leaderboard));}catch(e){}
  document.getElementById('totalGames').innerText=leaderboard.length;
}
function addScore(name,score){
  let entry={name:name,score:score,time:Date.now()};
  leaderboard.push(entry);
  renderLeaderboard();
  Object.values(connections).forEach(conn=>{if(conn.open)conn.send({type:'newScore',scoreData:entry});});
}
function clearLeaderboard(){if(confirm('Clear leaderboard?')){leaderboard=[];try{localStorage.removeItem('zenithSoloDemoLeaderboard');}catch(e){}renderLeaderboard();}}

// BG
let cv=document.getElementById('c'),ctx=cv.getContext('2d'),t=0,W,H;function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight}resize();onresize=resize;
let parts=[];for(let i=0;i<500;i++)parts.push({x:Math.random()*W,y:Math.random()*H,z:Math.random()*2000-1000,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,vz:(Math.random()-0.5)*3,q:Math.random()*7+1});
function drawBG(){ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,W,H);parts.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;if(p.z<-1000||p.z>1000)p.vz*=-1;let s=800/Math.max(100,800+p.z),x=(p.x-W/2)*s+W/2,y=(p.y-H/2)*s+H/2,sz=p.q*s;ctx.fillStyle=(i%23===0?'rgba(192,221,255,0.92)':i%7===0?'rgba(133,178,229,0.72)':'rgba(210,223,243,0.46)');ctx.beginPath();ctx.arc(x,y,sz,0,6.28);ctx.fill();});t+=0.02;requestAnimationFrame(drawBG);}drawBG();
setInterval(()=>{let el=document.getElementById('taskTime');if(el)el.innerText=new Date().toLocaleTimeString();},1000);
updateTaskbar();
document.getElementById('gameCanvas').addEventListener('pointerdown',()=>fireWeapon());


const demoActions=[()=>{copyRoomId()},()=>{joinRoom()},()=>{closeWindow('winMain')},()=>{launchSoloRace()},()=>{openWindow('winLeader')},()=>{openWindow('winOnline')},()=>{overclock()},()=>{closeWindow('winGame')},()=>{startMultiplayer()},()=>{startGame()},()=>{resetGame()},()=>{doBoost()},()=>{toggleRaceFocus()},()=>{closeRace()},()=>{fireWeapon()},()=>{fireWeapon(true)},()=>{closeWindow('winLeader')},()=>{refreshLeaderboard()},()=>{clearLeaderboard()},()=>{closeWindow('winOnline')},()=>{copyRoomId()},()=>{testConnection()},()=>{toggleWindow('winMain')},()=>{toggleWindow('winGame')},()=>{toggleWindow('winLeader')},()=>{toggleWindow('winOnline')}];
document.querySelectorAll('[data-action]').forEach(el=>{el.addEventListener('click',demoActions[Number(el.dataset.action)]);if(el.tagName!=='BUTTON'){el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el.click();}});}});

openWindow('winGame');toggleRaceFocus();document.getElementById('gameStatus').textContent='Ready — press SOLO to start';

for(const el of document.querySelectorAll('[data-steer]')){const k=el.dataset.steer;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);raceKeys[k]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>delete raceKeys[k]);}
