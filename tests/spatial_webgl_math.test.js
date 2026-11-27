'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const content=fs.readFileSync(path.join(__dirname,'../public/zenith-math.js'),'utf8');
const sandbox={};
vm.runInNewContext(content,sandbox,{timeout:2000});
const M=sandbox.ZenithMath;
if(!M)throw new Error('ZenithMath was not exported');
const count=(function(M){
let total=0;
function check(name,yes){if(!yes)throw new Error('FAIL '+name);total++;}
function approx(x,y,tol=1e-6){return Number.isFinite(x)&&Math.abs(x-y)<=tol;}
function mul(m,v){return [0,1,2,3].map(i=>m[i]*v[0]+m[4+i]*v[1]+m[8+i]*v[2]+m[12+i]*v[3]);}
check('zero velocity',M.length([0,0,0])===0);
check('unit zero returns finite',M.unit([0,0,0]).every(Number.isFinite));
check('dot symmetry',M.dot([2,-3,4],[6,7,1])===M.dot([6,7,1],[2,-3,4]));
check('cross orthogonal',M.dot(M.cross([1,2,3],[4,5,6]),[1,2,3])===0);
for(const yaw of [0,.6,-.4])for(const pitch of [0,.7]){
  const b=M.basis(yaw,pitch);
  check('orthonormal basis '+yaw+pitch,b.every(v=>approx(M.length(v),1,1e-12))&&
    approx(M.dot(b[0],b[1]),0,1e-12)&&approx(M.dot(b[0],b[2]),0,1e-12)&&
    approx(M.dot(b[1],b[2]),0,1e-12));
}
const view=M.viewMatrix([2,3,4],M.basis(0,0));
check('view origin',mul(view,[2,3,4,1]).every((x,i)=>approx(x,i===3?1:0)));
check('camera forward negative Z',approx(mul(view,[2,3,14,1])[2],-10));
check('chase camera offset',M.cameraOrigin([0,0,0],M.basis(0,0),false).join()==='0,6,-21');
check('cockpit camera at ship',M.cameraOrigin([1,2,3],M.basis(0,0),true).join()==='1,2,3');
check('perspective valid',M.perspective(60,16/9).length===16);
check('perspective aspect scaling',approx(M.perspective(60,2)[0]*2,M.perspective(60,1)[0]));
check('perspective rejects zero aspect',(()=>{try{M.perspective(60,0);return false}catch(e){return true}})());
check('perspective rejects reversed planes',(()=>{try{M.perspective(60,1,10,1);return false}catch(e){return true}})());
check('model origin maps to position',mul(M.modelMatrix([3,4,5],M.basis(0,0)),[0,0,0,1]).join()==='3,4,5,1');
for(const a of [0,.2,.8,1.3,Math.PI]){
  const v=M.rotate4([2,3,4,5],a);
  check('4D norm '+a,approx(Math.hypot(...v),Math.hypot(2,3,4,5),1e-12));
  check('4D projection finite '+a,M.project4([1,-1,1,-1],a,0).every(Number.isFinite));
}
check('4D zero projection',M.project4([0,0,0,0],0,0).join()==='0,0,0');
check('4D unprojectable returns null',M.project4([0,0,0,6],0,0)===null);
check('gravity center',M.gravity([0,0,0],[0,0,0],200,5).every(x=>x===0));
check('gravity direction',M.gravity([0,0,0],[10,0,0],200,5)[0]>0);
check('sweep hit',approx(M.segmentSphere([-10,0,0],[10,0,0],[0,0,0],5),.25));
check('sweep miss',M.segmentSphere([-10,7,0],[10,7,0],[0,0,0],5)===Infinity);
check('sweep inside',M.segmentSphere([0,0,0],[10,0,0],[0,0,0],5)===0);
check('atmosphere vacuum',M.atmosphere(20,100).density===0);
check('cubic heating',approx(M.atmosphere(0,40).heating/M.atmosphere(0,20).heating,8));
return total;
})(M);
console.log('PASS_ZENITH_WEBGL_MATH '+count+' checks');
