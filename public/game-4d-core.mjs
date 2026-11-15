/** Mars Race 4D v2: 3 spatial dimensions (x,y,z) + simulation time t.
 * Deterministic arcade dynamics, NOT general relativity or a fourth spatial axis.
 * Units are game units; no real orbital predictions, multiplayer, or prizes.
 */
export const RULES=Object.freeze({dt:1/60,maxTicks:5400,maxSpeed:210,shipRadius:12,boosts:3,arena:{x:[-60,1050],y:[-310,310],z:[-280,280]}});
const hypot=(x,y,z)=>Math.hypot(x,y,z);
const bound=(v,a,b)=>Math.min(b,Math.max(a,v));
const length=(a,b)=>hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function createFlight(seed=20261112){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('seed must be uint32');
 const rng=random(seed), asteroids=[];
 for(let i=0;i<12;i++){
  const a={x:240+rng()*590,y:-210+rng()*420,z:-185+rng()*370,r:11+rng()*13,vx:(rng()-.5)*22,vy:(rng()-.5)*22,vz:(rng()-.5)*22};
  if(length(a,{x:515,y:0,z:0})<125||length(a,{x:920,y:0,z:0})<95){a.z+=125;}
  asteroids.push(a);
 }
 return {seed,phase:'ready',ticks:0,boosts:RULES.boosts,score:0,
  ship:{x:40,y:0,z:0,vx:0,vy:0,vz:0,r:RULES.shipRadius,yaw:0,pitch:0,roll:0},
  moon:{x:515,y:0,z:0,r:43,mu:95000},goal:{x:920,y:0,z:0,r:44},
  asteroids};
}
export function start(f){if(f.phase==='ready')f.phase='running';return f;}
export function pause(f){if(f.phase==='running')f.phase='paused';else if(f.phase==='paused')f.phase='running';return f;}
export function reset(f){return createFlight(f.seed);}
function sweptHit(p0,p1,c0,c1,r){
 // Exact minimum relative distance between linearly interpolated endpoints
 // over this one fixed timestep, avoiding high-speed collision tunneling.
 const rx=p0.x-c0.x,ry=p0.y-c0.y,rz=p0.z-c0.z;
 const dx=(p1.x-p0.x)-(c1.x-c0.x),dy=(p1.y-p0.y)-(c1.y-c0.y),dz=(p1.z-p0.z)-(c1.z-c0.z);
 const den=dx*dx+dy*dy+dz*dz;
 const u=den>1e-15?bound(-(rx*dx+ry*dy+rz*dz)/den,0,1):0;
 return hypot(rx+u*dx,ry+u*dy,rz+u*dz)<=r;
}
export function step(f,input={}){
 if(f.phase!=='running')return f;
 const dt=RULES.dt,s=f.ship,old={x:s.x,y:s.y,z:s.z};
 const thrust={x:Number(!!input.forward)-Number(!!input.back),
  y:Number(!!input.right)-Number(!!input.left),
  z:Number(!!input.up)-Number(!!input.down)};
 const norm=hypot(thrust.x,thrust.y,thrust.z);
 if(norm){s.vx+=thrust.x/norm*105*dt;s.vy+=thrust.y/norm*105*dt;s.vz+=thrust.z/norm*105*dt;}
 if(input.boost&&f.boosts>0){
  const speed=hypot(s.vx,s.vy,s.vz),axis=norm?{x:thrust.x/norm,y:thrust.y/norm,z:thrust.z/norm}:speed>.01?{x:s.vx/speed,y:s.vy/speed,z:s.vz/speed}:{x:1,y:0,z:0};
  s.vx+=axis.x*55;s.vy+=axis.y*55;s.vz+=axis.z*55;f.boosts--;
 }
 const dx=f.moon.x-s.x,dy=f.moon.y-s.y,dz=f.moon.z-s.z,d=hypot(dx,dy,dz);
 if(d>1e-6){
  const a=Math.min(65,f.moon.mu/(d*d+900));
  s.vx+=dx/d*a*dt;s.vy+=dy/d*a*dt;s.vz+=dz/d*a*dt;
 }
 const drag=Math.exp(-.12*dt);s.vx*=drag;s.vy*=drag;s.vz*=drag;
 const speed=hypot(s.vx,s.vy,s.vz);
 if(speed>RULES.maxSpeed){const k=RULES.maxSpeed/speed;s.vx*=k;s.vy*=k;s.vz*=k;}
 s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
 for(const axis of ['x','y','z']){
  const [lo,hi]=RULES.arena[axis];
  if(s[axis]<lo+s.r||s[axis]>hi-s.r){s[axis]=bound(s[axis],lo+s.r,hi-s.r);s['v'+axis]*=-.25;}
 }
 s.yaw=Math.atan2(s.vy,Math.max(25,s.vx));s.pitch=Math.atan2(s.vz,Math.max(25,s.vx));s.roll=bound(-s.vy/120,-.5,.5);
 const oldAsteroids=f.asteroids.map(a=>({x:a.x,y:a.y,z:a.z}));
 for(const a of f.asteroids){
  for(const axis of ['x','y','z']){
   const v='v'+axis,[lo,hi]=RULES.arena[axis];a[axis]+=a[v]*dt;
   if(a[axis]<lo+a.r||a[axis]>hi-a.r){a[axis]=bound(a[axis],lo+a.r,hi-a.r);a[v]*=-1;}
  }
 }
 f.ticks++;
 const moonHit=sweptHit(old,s,f.moon,f.moon,s.r+f.moon.r);
 const asteroidHit=f.asteroids.some((a,i)=>sweptHit(old,s,oldAsteroids[i],a,s.r+a.r));
 const goalHit=sweptHit(old,s,f.goal,f.goal,s.r+f.goal.r-5);
 // A collision and goal crossing in one tick MUST resolve as collision.
 if(moonHit||asteroidHit)f.phase='crashed';
 else if(goalHit){f.phase='won';f.score=Math.max(100,Math.round(2300-f.ticks/60*14+f.boosts*140));}
 else if(f.ticks>=RULES.maxTicks)f.phase='timeout';
 return f;
}
export const simulationTime=f=>f.ticks*RULES.dt;
export const collisionAlongStep=sweptHit;
