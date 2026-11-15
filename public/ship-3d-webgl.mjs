/** ZENITH WebGL2 spatial ship renderer, zero dependencies and zero network.
 * Real triangle meshes, normals, depth testing, directional metal shading,
 * geometry-based triple-engine emission, inertial-view cameras and T-slice ghosts.
 * The fourth coordinate is simulated time, not a fourth spatial axis.
 * All geometry, flight distances and motion use fictional game units.
 */
import {createStarfighterMesh,VERTEX_STRIDE} from './ship-3d-mesh.mjs';

export const VIEW_MODES=Object.freeze(['chase','orbit','top','side','front']);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);return n>1e-9?v.map(x=>x/n):[0,0,0];};
export function multiply4(a,b){
  if(a.length!==16||b.length!==16)throw Error('INVALID_MATRIX');
  const o=new Array(16).fill(0);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)
    o[c*4+r]+=a[k*4+r]*b[c*4+k];
  return o;
}
export const translation=(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
export const scaling=(x,y,z)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
export const rotationX=a=>{
  const s=Math.sin(a),c=Math.cos(a);
  return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];
};
export const rotationY=a=>{
  const s=Math.sin(a),c=Math.cos(a);
  return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];
};
export const rotationZ=a=>{
  const s=Math.sin(a),c=Math.cos(a);
  return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];
};
export function lookAt(eye,target,up=[0,0,1]){
  const z=unit(sub(eye,target)),x=unit(cross(up,z)),y=cross(z,x);
  if(!Math.hypot(...x))throw Error('DEGENERATE_CAMERA');
  return [
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1
  ];
}
export function perspective(fovy,aspect,near=.25,far=6000){
  if(!(fovy>0&&fovy<Math.PI&&aspect>0&&near>0&&far>near))throw Error('INVALID_PERSPECTIVE');
  const f=1/Math.tan(fovy/2);
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
}
export function shipAttitude(yaw=0,pitch=0,roll=0){
  if(![yaw,pitch,roll].every(Number.isFinite))throw Error('INVALID_ATTITUDE');
  // Native ship coordinates: +X nose, +Z up, yaw about Z, pitch about -Y.
  return multiply4(multiply4(rotationZ(yaw),rotationY(-pitch)),rotationX(roll));
}
function sphereGeometry(hex,rows=12,cols=24){
  const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),out=[];
  const insert=(a,b,d)=>{
    const n=unit(cross(sub(b,a),sub(d,a)));
    for(const p of [a,b,d])out.push(...p,...n,...c,0);
  };
  const v=(i,j)=>{
    const phi=i*Math.PI/rows,theta=j*Math.PI*2/cols;
    return [Math.sin(phi)*Math.cos(theta),Math.sin(phi)*Math.sin(theta),Math.cos(phi)];
  };
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
    const p=v(i,j),q=v(i+1,j),r=v(i+1,j+1),s=v(i,j+1);
    insert(p,q,r);insert(p,r,s);
  }
  return new Float32Array(out);
}
const VERTEX=[
 '#version 300 es','precision highp float;',
 'layout(location=0) in vec3 aPosition;',
 'layout(location=1) in vec3 aNormal;',
 'layout(location=2) in vec3 aColor;',
 'layout(location=3) in float aEmission;',
 'uniform mat4 uVP;','uniform mat4 uModel;',
 'out vec3 vNormal;','out vec3 vColor;','out float vEmission;','out vec3 vPos;',
 'void main(){',' vec4 w=uModel*vec4(aPosition,1.0);',
 ' gl_Position=uVP*w;',' vPos=w.xyz;',
 ' vNormal=normalize(mat3(uModel)*aNormal);',
 ' vColor=aColor;',' vEmission=aEmission;','}'
].join('\n');
const FRAGMENT=[
 '#version 300 es','precision highp float;',
 'in vec3 vNormal;','in vec3 vColor;','in float vEmission;','in vec3 vPos;',
 'uniform vec3 uEye;','uniform float uOpacity;','uniform float uPulse;',
 'uniform float uWire;','uniform float uJet;','out vec4 outColor;',
 'void main(){',
 ' vec3 n=normalize(vNormal);',
 ' vec3 lightA=normalize(vec3(-0.45,-0.60,0.87));',
 ' vec3 lightB=normalize(vec3(0.5,0.64,-0.28));',
 ' vec3 view=normalize(uEye-vPos);',
 ' float diffuse=max(dot(n,lightA),0.0);',
 ' float reflected=max(dot(n,lightB),0.0);',
 ' float spec=pow(max(dot(reflect(-lightA,n),view),0.0),31.0)*0.48;',
 ' float rim=pow(1.0-max(dot(n,view),0.0),3.0)*0.25;',
 ' vec3 col=vColor*(0.19+0.67*diffuse+0.24*reflected);',
 ' col+=vec3(0.70,0.86,1.0)*(spec+rim);',
 ' col+=vColor*vEmission*(1.03+0.16*sin(uPulse*8.5));',
 ' if(uWire>0.5)col=vec3(0.25,0.78,0.95)*(.66+.16*diffuse);',
 ' float alpha=uOpacity;',
 ' if(uJet>0.5){ col=vColor*(.75+1.35*vEmission);',
 '   alpha*=clamp(vEmission*.75,.05,.65); }',
 ' outColor=vec4(clamp(col,0.0,2.4),alpha);','}'
].join('\n');
const STAR_VERTEX=[
 '#version 300 es','precision highp float;',
 'layout(location=0) in vec4 aStar;','uniform mat4 uVP;','out float vBright;',
 'void main(){',' gl_Position=uVP*vec4(aStar.xyz,1.0);',
 ' gl_PointSize=aStar.w;',' vBright=clamp(aStar.w/2.9,.16,.85);','}'
].join('\n');
const STAR_FRAGMENT=[
 '#version 300 es','precision highp float;',
 'in float vBright;','out vec4 outColor;',
 'void main(){',' vec2 uv=gl_PointCoord-vec2(.5);',
 ' float d=length(uv);',
 ' float a=(1.0-smoothstep(.17,.49,d))*vBright;',
 ' outColor=vec4(vec3(.78,.87,1.0),a);','}'
].join('\n');
function program(gl,vs,fs){
  const shader=(type,source)=>{
    const s=gl.createShader(type);
    gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      const err=String(gl.getShaderInfoLog(s)||'GLSL_UNKNOWN').slice(0,512);gl.deleteShader(s);
      throw Error('WEBGL_SHADER_'+err);
    }
    return s;
  };
  const vert=shader(gl.VERTEX_SHADER,vs),frag=shader(gl.FRAGMENT_SHADER,fs);
  const p=gl.createProgram();gl.attachShader(p,vert);gl.attachShader(p,frag);gl.linkProgram(p);
  gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){
    const err=String(gl.getProgramInfoLog(p)||'GL_LINK_UNKNOWN').slice(0,512);
    gl.deleteProgram(p);throw Error('WEBGL_PROGRAM_'+err);
  }
  return p;
}
const seeded=()=>{
  let n=138371;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
};
function fixedStars(){
  const r=seeded(),points=[];
  for(let i=0;i<510;i++){
    const z=r()*2-1,a=r()*2*Math.PI,k=Math.sqrt(1-z*z),rad=2500+r()*1100;
    points.push(rad*k*Math.cos(a),rad*k*Math.sin(a),rad*z,0.65+r()*2.0);
  }
  return new Float32Array(points);
}
function createMeshBuffer(gl,vertices){
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  return {buffer,count:vertices.length/VERTEX_STRIDE};
}
export function createShip3DRenderer(canvas,{forcedFallback=false}={}){
  if(!canvas||typeof canvas.getContext!=='function')throw Error('CANVAS_MISSING');
  let gl=null,error=null;
  try{
    if(!forcedFallback)gl=canvas.getContext('webgl2',{alpha:false,depth:true,antialias:true,
      premultipliedAlpha:false,powerPreference:'default'});
  }catch(e){error='WEBGL2_CONTEXT_FAILED';}
  if(!gl)return {
    available:false,render:()=>false,
    setView:()=>{},setWireframe:()=>{},setTimeSlices:()=>{},
    status:()=>({available:false,reason:error||'WEBGL2_UNSUPPORTED'}),
    dispose:()=>{},setOrbit:()=>{}
  };
  let lost=false,disposed=false;
  const mesh=createStarfighterMesh();
  let shader,sky,solid,plume,wire,starsBuffer,planetBuffers={};
  try{
    shader=program(gl,VERTEX,FRAGMENT);sky=program(gl,STAR_VERTEX,STAR_FRAGMENT);
    solid=createMeshBuffer(gl,mesh.solid);
    plume=createMeshBuffer(gl,mesh.plume);
    wire=createMeshBuffer(gl,mesh.wire);
    planetBuffers={
      moon:createMeshBuffer(gl,sphereGeometry('#aab3c3')),
      mars:createMeshBuffer(gl,sphereGeometry('#bc704e')),
      asteroid:createMeshBuffer(gl,sphereGeometry('#535b64'))
    };
    starsBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,fixedStars(),gl.STATIC_DRAW);
  }catch(e){
    error=String(e?.message||e).slice(0,400);lost=true;
  }
  let view='chase',wireframe=false,timeSlices=true,orbitAz=.26,orbitElev=.33,orbitDistance=235;
  let lastTick=-1,frameCount=0,history=[];
  const controls={
    view:v=>{if(VIEW_MODES.includes(v))view=v;},
    wire:v=>{wireframe=!!v;},
    trail:v=>{timeSlices=!!v;},
    orbit:(a,e,d)=>{
      if(![a,e,d].every(Number.isFinite))return;
      orbitAz=a;orbitElev=clamp(e,-1.30,1.30);orbitDistance=clamp(d,155,420);view='orbit';
    }
  };
  const onLost=e=>{e.preventDefault();lost=true;error='WEBGL_CONTEXT_LOST';};
  canvas.addEventListener('webglcontextlost',onLost);
  // A lost context fails back to 2D rather than pretending its resources rebuilt.
  const bindVertex=b=>{
    gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);
    const bytes=VERTEX_STRIDE*4;
    for(const [i,count,offset] of [[0,3,0],[1,3,3],[2,3,6],[3,1,9]]){
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i,count,gl.FLOAT,false,bytes,offset*4);
    }
  };
  function draw(buffer,vp,model,eye,opts={}){
    gl.useProgram(shader);bindVertex(buffer);
    const location=k=>gl.getUniformLocation(shader,k);
    gl.uniformMatrix4fv(location('uVP'),false,new Float32Array(vp));
    gl.uniformMatrix4fv(location('uModel'),false,new Float32Array(model));
    gl.uniform3fv(location('uEye'),new Float32Array(eye));
    gl.uniform1f(location('uOpacity'),opts.opacity??1);
    gl.uniform1f(location('uPulse'),opts.pulse??0);
    gl.uniform1f(location('uWire'),opts.wire?1:0);
    gl.uniform1f(location('uJet'),opts.jet?1:0);
    gl.drawArrays(opts.lines?gl.LINES:gl.TRIANGLES,0,buffer.count);
  }
  function skyDraw(vp){
    gl.useProgram(sky);gl.bindBuffer(gl.ARRAY_BUFFER,starsBuffer);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
    for(const i of [1,2,3])gl.disableVertexAttribArray(i);
    gl.uniformMatrix4fv(gl.getUniformLocation(sky,'uVP'),false,new Float32Array(vp));
    gl.drawArrays(gl.POINTS,0,510);
  }
  function eyeForView(){
    switch(view){
      case 'front':return {eye:[224,0,66],up:[0,0,1]};
      case 'top':return {eye:[.01,-.01,244],up:[1,0,0]};
      case 'side':return {eye:[-15,235,70],up:[0,0,1]};
      case 'orbit':return {eye:[
        -orbitDistance*Math.cos(orbitElev)*Math.cos(orbitAz),
        orbitDistance*Math.cos(orbitElev)*Math.sin(orbitAz),
        orbitDistance*Math.sin(orbitElev)
      ],up:[0,0,1]};
      default:return {eye:[-225,0,64],up:[0,0,1]};
    }
  }
  function noteHistory(f){
    if(f.ticks===lastTick)return;
    if(f.ticks<lastTick){history=[];lastTick=-1;}
    if(f.ticks-lastTick>=3||lastTick===-1){
      const s=f.ship;
      history.push({tick:f.ticks,x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,roll:s.roll});
      if(history.length>160)history.splice(0,history.length-160);
      lastTick=f.ticks;
    }
  }
  const self={
    available:!lost,
    render(f){
      if(lost||disposed)return false;
      try{
        if(canvas.width!==960||canvas.height!==540){canvas.width=960;canvas.height=540;}
        const s=f.ship,angle=shipAttitude(s.yaw||0,s.pitch||0,s.roll||0);
        const {eye,up}=eyeForView();
        const vp=multiply4(perspective(Math.PI/3.35,canvas.width/canvas.height,.4,7000),
          lookAt(eye,[0,0,0],up));
        noteHistory(f);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.clearColor(0,0,0,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);skyDraw(vp);gl.depthMask(true);
        for(const body of [
          {obj:f.moon,key:'moon'},{obj:f.goal,key:'mars'},
          ...f.asteroids.map(a=>({obj:a,key:'asteroid'}))
        ]){
          if(!body.obj)continue;
          const p=body.obj;
          const relative=[p.x-s.x,p.y-s.y,p.z-s.z].map(n=>n*.77);
          if(Math.hypot(...relative)>4400)continue;
          const size=Math.max(2,(p.r||10)*.77);
          const model=multiply4(translation(...relative),scaling(size,size,size));
          draw(planetBuffers[body.key],vp,model,eye,{pulse:f.ticks/60});
        }
        draw(wireframe?wire:solid,vp,angle,eye,
          {wire:wireframe,lines:wireframe,pulse:f.ticks/60});
        if(timeSlices&&history.length>9){
          // Real prior simulated ship positions; fourth axis is elapsed t.
          const indices=[history.length-9,history.length-24,history.length-45];
          gl.depthMask(false);
          for(const [i,index] of indices.entries()){
            const h=history[index];
            if(!h)continue;
            const offset=[h.x-s.x,h.y-s.y,h.z-s.z].map(n=>n*.77);
            if(Math.hypot(...offset)<5)continue;
            const ghost=multiply4(translation(...offset),shipAttitude(h.yaw,h.pitch,h.roll));
            draw(wire,vp,ghost,eye,{wire:true,lines:true,opacity:.20-i*.047,pulse:f.ticks/60});
          }
          gl.depthMask(true);
        }
        const speed=Math.hypot(s.vx,s.vy,s.vz);
        const thrust=clamp(speed/100,.08,.78);
        if(!wireframe){
          gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
          draw(plume,vp,angle,eye,{jet:true,opacity:thrust,pulse:f.ticks/60});
          gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
        }
        frameCount++;return true;
      }catch(e){
        lost=true;error='WEBGL_RENDER_ERROR:'+String(e?.message||e).slice(0,220);
        return false;
      }
    },
    setView:controls.view,setWireframe:controls.wire,setTimeSlices:controls.trail,
    setOrbit:controls.orbit,
    status:()=>({available:!lost&&!disposed,reason:error,
      webglVersion:lost||disposed?'UNAVAILABLE':gl.getParameter(gl.VERSION),
      view,wireframe,timeSlices,orbitAz,orbitElev,orbitDistance,
      triangles:mesh.triangleCount,thrusters:mesh.engineCenters.length,
      exhaustTriangles:mesh.plumeTriangleCount,frameCount,
      lastTick,historyCount:history.length,genuine3d:true,
      timeDimension:'simulation_time_seconds',units:'fictional game units'}),
    dispose(){
      if(disposed)return;
      disposed=true;canvas.removeEventListener('webglcontextlost',onLost);
      for(const b of [solid,plume,wire,...Object.values(planetBuffers)])if(b?.buffer)gl.deleteBuffer(b.buffer);
      if(starsBuffer)gl.deleteBuffer(starsBuffer);
      if(shader)gl.deleteProgram(shader);if(sky)gl.deleteProgram(sky);
    }
  };
  return self;
}
