/** Mars Race 4D: three spatial dimensions + simulation time.
 * Deterministic six-degree-of-freedom arcade dynamics; not relativistic physics.
 * Position/velocity in 3D, orientation quaternion, body angular rates.
 * No payments, player identity, networking or trusted scoring.
 */
export const STEP=1/60;
export const LIMITS=Object.freeze({x:1100,y:480,z:380,speed:260,angular:2.4,time:120,boosts:3});
export const vec=(x=0,y=0,z=0)=>({x,y,z});
export const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const scale=(a,k)=>vec(a.x*k,a.y*k,a.z*k);
export const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export const cross=(a,b)=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
export const length=a=>Math.hypot(a.x,a.y,a.z);
export const unit=a=>scale(a,1/(length(a)||1));
export const quat=(w=1,x=0,y=0,z=0)=>({w,x,y,z});
export const multiply=(a,b)=>quat(a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w);
export const normalize=q=>{const n=Math.hypot(q.w,q.x,q.y,q.z);return n>0?quat(q.w/n,q.x/n,q.y/n,q.z/n):quat();};
export const rotate=(q,v)=>{const u=vec(q.x,q.y,q.z);const t=scale(cross(u,v),2);return add(v,add(scale(t,q.w),cross(u,t)));};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function random(seed){let n=(seed>>>0)||1;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}
export function createWorld(seed=20261112){
 if(!Number.isSafeInteger(seed)||seed<0)throw Error("invalid seed");
 const rng=random(seed),obstacles=[];
 for(let i=0;i<12;i++){
  const r=17+rng()*18;
  const p=vec(220+rng()*620,(rng()-.5)*600,(rng()-.5)*440);
  if(length(sub(p,vec(555,0,0)))<115+r){i--;continue;}
  obstacles.push({p,r,v:vec((rng()-.5)*14,(rng()-.5)*12,(rng()-.5)*10)});
 }
 return {seed,status:"ready",tick:0,time:0,score:0,boosts:LIMITS.boosts,
  ship:{p:vec(55,0,0),v:vec(0,0,0),q:quat(),omega:vec(),r:11},
  moon:{p:vec(555,0,0),r:60,mu:180000},
  goal:{p:vec(1010,0,0),r:64},obstacles};
}
export function start(w){if(w.status!=="ready")return false;w.status="running";return true;}
export function pause(w){if(w.status==="running")w.status="paused";else if(w.status==="paused")w.status="running";return w.status;}
export function reset(w){return createWorld(w.seed);}
function segmentSphere(a,b,c,r){
 const d=sub(b,a),m=sub(a,c),A=dot(d,d);
 if(A===0)return dot(m,m)<=r*r;
 const t=clamp(-dot(m,d)/A,0,1);
 const closest=add(m,scale(d,t));
 return dot(closest,closest)<=r*r;
}
export function step(w,control={},dt=STEP){
 if(w.status!=="running")return w;
 if(!Number.isFinite(dt)||dt<=0||dt>STEP+1e-10)throw Error("invalid timestep");
 const s=w.ship,old={...s.p},oldObstacles=w.obstacles.map(o=>({...o.p}));
 const desired=vec(
  Number(Boolean(control.rollRight))-Number(Boolean(control.rollLeft)),
  Number(Boolean(control.pitchDown))-Number(Boolean(control.pitchUp)),
  Number(Boolean(control.yawRight))-Number(Boolean(control.yawLeft)));
 const target=scale(desired,LIMITS.angular);
 s.omega=add(scale(s.omega,Math.exp(-6*dt)),scale(target,1-Math.exp(-6*dt)));
 const rate=length(s.omega),angle=rate*dt;
 if(angle>0){
  const axis=unit(s.omega),half=angle/2;
  s.q=normalize(multiply(s.q,quat(Math.cos(half),axis.x*Math.sin(half),axis.y*Math.sin(half),axis.z*Math.sin(half))));
 }
 const forward=rotate(s.q,vec(1,0,0));
 const up=rotate(s.q,vec(0,1,0));
 const right=rotate(s.q,vec(0,0,1));
 const throttle=clamp(Number(control.throttle)||0,-1,1);
 const lateral=clamp(Number(control.strafe)||0,-1,1);
 const vertical=clamp(Number(control.lift)||0,-1,1);
 let accel=add(scale(forward,90*throttle),add(scale(right,60*lateral),scale(up,60*vertical)));
 const moonVector=sub(w.moon.p,s.p),distance=length(moonVector);
 if(distance>1e-9)accel=add(accel,scale(unit(moonVector),w.moon.mu/Math.max(distance*distance,80*80)));
 if(control.boost&&w.boosts>0){accel=add(accel,scale(forward,350));w.boosts--;}
 s.v=add(scale(s.v,Math.exp(-.13*dt)),scale(accel,dt));
 const speed=length(s.v);if(speed>LIMITS.speed)s.v=scale(s.v,LIMITS.speed/speed);
 s.p=add(s.p,scale(s.v,dt));
 for(const axis of ["x","y","z"]){
  const max=LIMITS[axis]-s.r;
  if(s.p[axis]<-max||s.p[axis]>max){
   s.p[axis]=clamp(s.p[axis],-max,max);s.v[axis]*=-.25;
  }
 }
 for(const o of w.obstacles){
  o.p=add(o.p,scale(o.v,dt));
  for(const axis of ["x","y","z"]){
   const max=LIMITS[axis]-o.r;
   if(o.p[axis]<-max||o.p[axis]>max){o.p[axis]=clamp(o.p[axis],-max,max);o.v[axis]*=-1;}
  }
 }
 w.tick++;w.time=w.tick*STEP;
 // Relative swept-sphere test catches collisions between discrete frames.
 const moonHit=segmentSphere(old,s.p,w.moon.p,s.r+w.moon.r);
 const asteroidHit=w.obstacles.some((o,i)=>segmentSphere(sub(old,oldObstacles[i]),sub(s.p,o.p),vec(),s.r+o.r));
 if(moonHit||asteroidHit){w.status="crashed";w.score=0;}
 else if(segmentSphere(old,s.p,w.goal.p,s.r+w.goal.r)){w.status="won";w.score=Math.max(100,Math.round(3000-w.time*14+w.boosts*160));}
 else if(w.time>=LIMITS.time){w.status="timeout";}
 return w;
}
