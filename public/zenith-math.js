'use strict';
(function(root){
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const scale=(a,s)=>a.map(v=>v*s);
  const length=v=>Math.hypot(...v);
  const unit=v=>scale(v,1/(length(v)||1));
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function basis(yaw,pitch){
    return [
      [Math.cos(yaw),0,-Math.sin(yaw)],
      [-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)],
      [Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)]
    ];
  }
  function cameraOrigin(p,b,cockpit){
    return cockpit?p.slice():add(add(p,scale(b[2],-21)),scale(b[1],6));
  }
  function viewMatrix(origin,b){
    const [r,u,f]=b;
    return new Float32Array([
      r[0],u[0],-f[0],0,
      r[1],u[1],-f[1],0,
      r[2],u[2],-f[2],0,
      -dot(r,origin),-dot(u,origin),dot(f,origin),1
    ]);
  }
  function modelMatrix(position,b,scaleFactor=1){
    const [r,u,f]=b;
    return new Float32Array([
      ...scale(r,scaleFactor),0,
      ...scale(u,scaleFactor),0,
      ...scale(f,scaleFactor),0,
      ...position,1
    ]);
  }
  function identity(){
    return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  }
  function perspective(verticalFov,aspect,near=0.25,far=6000){
    if(!Number.isFinite(verticalFov)||verticalFov<=0||verticalFov>=180||
       !Number.isFinite(aspect)||aspect<=0||near<=0||far<=near)
      throw new RangeError('INVALID_CAMERA_CALIBRATION');
    const f=1/Math.tan(verticalFov*Math.PI/360);
    return new Float32Array([
      f/aspect,0,0,0,
      0,f,0,0,
      0,0,(far+near)/(near-far),-1,
      0,0,(2*far*near)/(near-far),0
    ]);
  }
  function rotate4(v,angle){
    const [x,y,z,w]=v,c=Math.cos(angle),s=Math.sin(angle);
    return [x*c-w*s,y,z,x*s+w*c];
  }
  function project4(v,angle,wView){
    const r=rotate4(v,angle),d=4-r[3]+wView;
    return d>.25?r.slice(0,3).map(n=>4*n/d):null;
  }
  function gravity(p,center,mu,softening){
    const d=sub(center,p),k=mu/Math.pow(dot(d,d)+softening*softening,1.5);
    return scale(d,k);
  }
  function segmentSphere(a,b,center,radius){
    const d=sub(b,a),v=sub(a,center),A=dot(d,d),B=dot(v,d),C=dot(v,v)-radius*radius;
    if(C<=0)return 0;
    const discriminant=B*B-A*C;
    if(A<=0||discriminant<0)return Infinity;
    const t=(-B-Math.sqrt(discriminant))/A;
    return t>=0&&t<=1?t:Infinity;
  }
  function atmosphere(altitude,speed){
    const density=altitude>=20?0:Math.exp(-Math.max(0,altitude)/5);
    return {density,heating:density*Math.pow(speed,3)*.0008};
  }
  root.ZenithMath=Object.freeze({dot,sub,add,scale,length,unit,cross,basis,cameraOrigin,
    viewMatrix,modelMatrix,identity,perspective,rotate4,project4,gravity,
    segmentSphere,atmosphere});
})(globalThis);