'use strict';
(function(){
  const $=id=>document.getElementById(id),M=globalThis.ZenithMath;
  const canvas=$('universe'),message=$('graphics-status'),hud=$('flight-hud');
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance'});
  if(!M||!gl){
    message.textContent='WebGL2 unavailable. This preview requires a WebGL2-capable browser/GPU. The original Canvas game remains available.';
    $('fallback').hidden=false;
    return;
  }
  const vert=`#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec3 aNormal;
    layout(location=2) in vec3 aTint;
    uniform mat4 uProjection,uView,uModel;
    out vec3 vNormal,vWorld,vTint;
    void main(){
      vec4 world=uModel*vec4(aPosition,1.0);
      vec4 eye=uView*world;
      vWorld=world.xyz;
      vNormal=normalize(mat3(uModel)*aNormal);
      vTint=aTint;
      gl_Position=uProjection*eye;
      gl_PointSize=clamp(420.0/max(eye.z*-1.0,1.0),1.0,3.5);
    }`;
  const frag=`#version 300 es
    precision highp float;
    in vec3 vNormal,vWorld,vTint;
    uniform vec3 uBase,uSun,uEye;
    uniform int uMode;
    out vec4 fragColor;
    void main(){
      if(uMode==2||uMode==3){
        fragColor=vec4(uBase*vTint,1.0);return;
      }
      vec3 n=normalize(vNormal),l=normalize(uSun),v=normalize(uEye-vWorld);
      float diffuse=max(dot(n,l),0.0);
      if(uMode==4){
        float rim=pow(1.0-abs(dot(n,v)),2.0);
        fragColor=vec4(uBase*(0.25+0.75*diffuse),rim*0.43);
        return;
      }
      vec3 base=uBase*vTint;
      if(uMode==0){
        float band=sin(atan(n.z,n.x)*23.0+5.0*sin(n.y*18.0));
        float terrain=sin(n.x*41.0+n.z*13.0)*sin(n.y*36.0-n.x*23.0);
        float amount=0.75+0.14*band+0.11*terrain;
        base*=amount;
        if(uBase.r>uBase.b*1.5){
          float polar=smoothstep(0.83,0.98,abs(n.y));
          base=mix(base,vec3(0.75,0.55,0.43),polar*0.85);
        }
      }
      float light=0.055+0.95*diffuse;
      float spec=pow(max(dot(reflect(-l,n),v),0.0),uMode==1?48.0:16.0);
      vec3 rgb=base*light+vec3(0.38,0.62,0.82)*spec*(uMode==1?0.65:0.06);
      fragColor=vec4(rgb,1.0);
    }`;
  function compile(kind,source){
    const shader=gl.createShader(kind);
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);
      throw new Error('WebGL_SHADER_COMPILE: '+error);
    }
    return shader;
  }
  let program;
  try{
    program=gl.createProgram();
    const vs=compile(gl.VERTEX_SHADER,vert),fs=compile(gl.FRAGMENT_SHADER,frag);
    gl.attachShader(program,vs);gl.attachShader(program,fs);
    gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
      throw new Error('WebGL_LINK: '+gl.getProgramInfoLog(program));
  }catch(error){
    message.textContent='WebGL shader initialization failed: '+error.message;
    $('fallback').hidden=false;return;
  }
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.006,0.012,0.032,1);
  const uniforms={};
  for(const id of ['Projection','View','Model','Base','Sun','Eye','Mode'])
    uniforms[id]=gl.getUniformLocation(program,'u'+id);
  const identity=M.identity(),sun=M.unit([-1,1,-.5]);
  gl.uniform3fv(uniforms.Sun,sun);
  function pack(out,p,n,col){
    out.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2]);
  }
  function triangle(out,a,b,c,col){
    const n=M.unit(M.cross(M.sub(b,a),M.sub(c,a)));
    pack(out,a,n,col);pack(out,b,n,col);pack(out,c,n,col);
  }
  function mesh(data,mode=gl.TRIANGLES,dynamic=false){
    const vao=gl.createVertexArray(),buf=gl.createBuffer();
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    for(let i=0;i<3;i++){
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);
    }
    gl.bindVertexArray(null);
    return {vao,buf,mode,count:data.length/9};
  }
  function replace(meshObj,data){
    gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    meshObj.count=data.length/9;
  }
  function sphere(){
    const out=[],lat=28,lon=48;
    function point(u,v){
      const a=(u/lat-.5)*Math.PI,b=v/lon*2*Math.PI;
      return [Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)];
    }
    for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
      const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
      triangle(out,a,b,c,[1,1,1]);triangle(out,a,c,d,[1,1,1]);
    }
    return mesh(out);
  }
  function ship(){
    const N=[0,0,7],U=[0,1.6,-2],D=[0,-1.4,-2],L=[-2,0,-5],R=[2,0,-5];
    const WL=[-7,-.3,-5],WR=[7,-.3,-5],T=[0,2.4,-6];
    const out=[];
    for(const [a,b,c,color] of [
      [N,U,L,[.63,.78,.94]],[N,R,U,[.38,.61,.84]],
      [N,L,D,[.23,.39,.56]],[N,D,R,[.33,.48,.62]],
      [U,R,L,[.53,.7,.87]],[D,L,R,[.18,.28,.44]],
      [L,WL,U,[.34,.63,.78]],[R,U,WR,[.27,.48,.7]],
      [U,T,L,[.55,.82,.95]],[U,R,T,[.3,.56,.8]],
      [L,D,WL,[.14,.29,.46]],[R,WR,D,[.16,.32,.53]]
    ])triangle(out,a,b,c,color);
    return mesh(out);
  }
  const planetMesh=sphere(),shipMesh=ship();
  let randomState=912837;
  function rand(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;}
  const starData=[];
  for(let i=0;i<1400;i++){
    const p=[(rand()-.5)*2400,(rand()-.5)*1800,(rand()-.5)*2400];
    pack(starData,p,[0,0,1],[.5+rand()*.5,.65+rand()*.35,1]);
  }
  const starMesh=mesh(starData,gl.POINTS),wire=mesh([],gl.LINES,true),shotsMesh=mesh([],gl.POINTS,true);
  const tesseract=Array.from({length:16},(_,i)=>Array.from({length:4},(_,axis)=>((i>>axis)&1)?1:-1));
  const edges=[];
  for(let i=0;i<16;i++)for(let axis=0;axis<4;axis++){
    const j=i^(1<<axis);if(i<j)edges.push([i,j,axis]);
  }
  const planets=[
    {name:'MOON',pos:[-32,8,110],radius:16,mu:600,soft:8,color:[.65,.74,.78],atm:false},
    {name:'MARS',pos:[40,-8,230],radius:35,mu:1800,soft:17.5,color:[.87,.35,.20],atm:true}
  ];
  const keys=new Set();
  const state={pos:[0,0,0],velocity:[0,0,0],yaw:0,pitch:0,
    rotation4:0,wView:0,heat:0,hull:100,status:'FLIGHT',camera:'CHASE',score:0,shots:[],enemy:[15,0,95]};
  function reset(){
    Object.assign(state,{pos:[0,0,0],velocity:[0,0,0],yaw:0,pitch:0,rotation4:0,
      wView:0,heat:0,hull:100,status:'FLIGHT',camera:'CHASE',score:0,shots:[],enemy:[15,0,95]});
    keys.clear();
  }
  function fire(){
    if(state.status!=='FLIGHT'||state.shots.length>=48)return;
    const forward=M.basis(state.yaw,state.pitch)[2];
    state.shots.push({pos:M.add(state.pos,M.scale(forward,7)),velocity:M.scale(forward,90),life:4});
  }
  function toggleCamera(){state.camera=state.camera==='CHASE'?'COCKPIT':'CHASE';}
  const allowed=new Set(['w','a','s','d','r','f','q','e','z','x','b','shift',
    'arrowup','arrowdown','arrowleft','arrowright',' ','c']);
  window.addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    if(allowed.has(key)){e.preventDefault();keys.add(key);}
    if(!e.repeat&&key===' ')fire();
    if(!e.repeat&&key==='c')toggleCamera();
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  $('reset').addEventListener('click',reset);
  $('camera').addEventListener('click',toggleCamera);
  $('fire').addEventListener('click',fire);
  const fov=$('fov'),resolution=$('resolution');
  const settings={fov:60,renderScale:1};
  function controls(){
    settings.fov=Number(fov.value);
    settings.renderScale=Number(resolution.value)/100;
    $('fov-number').textContent=settings.fov+'°';
    $('resolution-number').textContent=Math.round(settings.renderScale*100)+'%';
  }
  fov.addEventListener('input',controls);resolution.addEventListener('input',controls);controls();
  function integrate(dt){
    if(state.status!=='FLIGHT')return;
    const key=k=>keys.has(k)?1:0;
    state.yaw+=(key('arrowright')-key('arrowleft'))*dt;
    state.pitch=Math.max(-1.4,Math.min(1.4,state.pitch+(key('arrowup')-key('arrowdown'))*dt));
    state.rotation4+=(key('e')-key('q'))*dt;
    state.wView=Math.max(-1,Math.min(3,state.wView+(key('x')-key('z'))*dt));
    const b=M.basis(state.yaw,state.pitch),axes=[key('d')-key('a'),key('r')-key('f'),key('w')-key('s')];
    const input=M.scale(axes,1/Math.max(1,M.length(axes)));
    const thrust=[0,0,0],acceleration=keys.has('shift')?55:20;
    for(let i=0;i<3;i++)
      for(let j=0;j<3;j++)thrust[j]+=input[i]*b[i][j]*acceleration;
    for(const planet of planets){
      const a=M.gravity(state.pos,planet.pos,planet.mu,planet.soft);
      for(let j=0;j<3;j++)thrust[j]+=a[j];
    }
    if(keys.has('b'))state.velocity=M.scale(state.velocity,Math.exp(-4*dt));
    state.velocity=M.add(state.velocity,M.scale(thrust,dt));
    const maxSpeed=keys.has('shift')?55:20;
    if(M.length(state.velocity)>maxSpeed)
      state.velocity=M.scale(state.velocity,maxSpeed/M.length(state.velocity));
    const mars=planets[1],altitude=M.length(M.sub(state.pos,mars.pos))-mars.radius;
    const air=M.atmosphere(altitude,M.length(state.velocity));
    state.heat=Math.max(0,state.heat+(air.heating-state.heat*.25)*dt);
    state.velocity=M.scale(state.velocity,Math.exp(-air.density*.4*dt));
    if(state.heat>80)state.hull=Math.max(0,state.hull-(state.heat-80)*.2*dt);
    if(state.hull<=0){state.status='OVERHEATED';return;}
    const next=M.add(state.pos,M.scale(state.velocity,dt));
    let nearest=null,hitT=Infinity;
    for(const planet of planets){
      const t=M.segmentSphere(state.pos,next,planet.pos,planet.radius);
      if(t<hitT){hitT=t;nearest=planet;}
    }
    if(nearest){
      state.pos=M.add(state.pos,M.scale(M.sub(next,state.pos),hitT));
      state.status=M.length(state.velocity)<=3?'LANDED '+nearest.name:'CRASH';
      state.hull=state.status==='CRASH'?0:state.hull;state.velocity=[0,0,0];return;
    }
    state.pos=next;
    for(const shot of state.shots){
      const before=shot.pos;
      shot.pos=M.add(before,M.scale(shot.velocity,dt));shot.life-=dt;
      const t=M.segmentSphere(before,shot.pos,state.enemy,5);
      if(t!==Infinity){
        state.score+=100;shot.life=0;
        state.enemy=M.add(state.pos,[25,0,120]);
      }
    }
    state.shots=state.shots.filter(s=>s.life>0);
  }
  function viewAndEye(){
    const b=M.basis(state.yaw,state.pitch);
    const eye=M.cameraOrigin(state.pos,b,state.camera==='COCKPIT');
    return {b,eye,view:M.viewMatrix(eye,b)};
  }
  function issue(object,model,color,mode,eye){
    gl.uniformMatrix4fv(uniforms.Model,false,model);
    gl.uniform3fv(uniforms.Base,color);
    gl.uniform3fv(uniforms.Eye,eye);
    gl.uniform1i(uniforms.Mode,mode);
    gl.bindVertexArray(object.vao);
    gl.drawArrays(object.mode,0,object.count);
  }
  function resize(){
    const deviceScale=Math.min(window.devicePixelRatio||1,1.6);
    const width=Math.min(3072,Math.max(1,Math.round(innerWidth*deviceScale*settings.renderScale)));
    const height=Math.min(2048,Math.max(1,Math.round(innerHeight*deviceScale*settings.renderScale)));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);
    gl.uniformMatrix4fv(uniforms.Projection,false,M.perspective(settings.fov,width/height,.25,6000));
  }
  function tesseractData(){
    const out=[],projected=tesseract.map(v=>M.project4(v,state.rotation4,state.wView));
    for(const [i,j,axis] of edges){
      if(!projected[i]||!projected[j])continue;
      const color=axis===3?[.94,.42,1]:[.18,.85,1];
      const a=M.add(M.scale(projected[i],13),[0,25,145]);
      const b=M.add(M.scale(projected[j],13),[0,25,145]);
      pack(out,a,[0,1,0],color);pack(out,b,[0,1,0],color);
    }
    replace(wire,out);
  }
  let frames=0,stamp=performance.now(),fps=0,last=stamp,accumulator=0;
  function render(now){
    resize();
    const {b,eye,view}=viewAndEye();
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.View,false,view);
    issue(starMesh,identity,[.78,.88,1],3,eye);
    for(const planet of planets){
      const model=M.modelMatrix(planet.pos,M.basis(0,0),planet.radius);
      issue(planetMesh,model,planet.color,0,eye);
      if(planet.atm){
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        const halo=M.modelMatrix(planet.pos,M.basis(0,0),planet.radius*1.09);
        issue(planetMesh,halo,[.85,.30,.13],4,eye);
        gl.depthMask(true);gl.disable(gl.BLEND);
      }
    }
    tesseractData();issue(wire,identity,[1,1,1],2,eye);
    const firePoints=[];
    pack(firePoints,state.enemy,[0,0,1],[1,.25,.19]);
    for(const shot of state.shots)pack(firePoints,shot.pos,[0,0,1],[.22,1,1]);
    replace(shotsMesh,firePoints);
    issue(shotsMesh,identity,[1,1,1],3,eye);
    if(state.camera==='CHASE')issue(shipMesh,M.modelMatrix(state.pos,b),[1,1,1],1,eye);
    frames++;
    if(now-stamp>=1000){fps=Math.round(frames*1000/(now-stamp));frames=0;stamp=now;}
    const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);
    hud.textContent='XYZ '+state.pos.map(x=>x.toFixed(1)).join(' / ')+
      ' | SPEED '+M.length(state.velocity).toFixed(1)+' | '+state.status+
      ' | HULL '+state.hull.toFixed(0)+' | HEAT '+state.heat.toFixed(1)+
      ' | W-view '+state.wView.toFixed(2)+' | SCORE '+state.score;
    message.textContent='WebGL2 ACTIVE · Z-buffer ON · '+settings.fov+'° VFOV · '+fps+
      ' FPS · '+canvas.width+'×'+canvas.height+' · max texture '+maxTexture+
      ' · '+state.camera+' · SIMULATION UNITS (NOT SI-CALIBRATED)';
  }
  function frame(now){
    accumulator+=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
    while(accumulator>=1/60){integrate(1/60);accumulator-=1/60;}
    render(now);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();