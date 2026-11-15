/** Isolated astronomy UI for the original 4D spacecraft page.
 * Never mutates spacecraft coordinates or calls the arcade physics step.
 * The planetarium's clock is UTC input / SPICE-converted TDB source data,
 * not a trusted wall clock, relativity solver or physical spacecraft state.
 */
import {loadPlanetCatalog,sampleAtUtc,parseUtcField,formatKm,AU_KM} from './planet-time-core.mjs';
import {renderPlanetarium,VIEWS} from './planet-time-render.mjs';
const $=id=>document.getElementById(id);
export function setupPlanetMode(ctx,clearFlightInput){
 let active=false,catalog=null,mode='paused',epochMs=Date.now(),warp=1,view='inner',focus='earth',trueSize=false,error='';
 const begin=Date.parse('2026-11-01T00:00:00Z'),end=Date.parse('2027-03-01T00:00:00Z');
 const fmt=(t)=>new Date(t).toISOString().slice(0,16);
 $('planetDate').value=fmt(epochMs);
 function updateDisplay(state){
  $('planetClockState').textContent=mode==='live'?'DEVICE UTC · LIVE (UNATTESTED)':mode==='running'?'TIME ADVANCE '+warp+'×':'TIME PAUSED';
  $('planetLoaded').textContent=catalog?'241 JPL STATE SAMPLES · SHA-256 VERIFIED':'WAITING FOR VERIFIED CATALOG';
  $('planetTimeReadout').textContent=new Date(epochMs).toISOString().replace('.000Z','Z');
  if(document.activeElement!==$('planetDate'))$('planetDate').value=fmt(epochMs);
  $('planetPlay').textContent=mode==='running'?'Pause astronomical time':'Advance astronomical time';
  if(state?.status==='VERIFIED_SOURCE_INTERPOLATED'){
   const d=state.distancesKm;
   $('planetRanges').textContent='Earth–Moon '+formatKm(d.earthMoon)+
    ' · Earth–Mars '+formatKm(d.earthMars)+' · Earth–Sun '+formatKm(d.earthSun);
   const b=state.states[focus],sun=state.states.sun;
   $('planetFocusState').textContent='Selected '+b.body.name+
     (b.body.kind==='system_barycenter'?' (system barycenter)':' (body center)')+
     ' · Sun-relative '+formatKm(Math.hypot(...b.p.map((x,i)=>x-sun.p[i])))+
     ' · barycentric speed '+Math.hypot(...b.v).toFixed(3)+' km/s';
  }else{
   $('planetRanges').textContent='No verified range: '+(state?.status||'DATA_UNAVAILABLE');
   $('planetFocusState').textContent='ABSTAIN — no extrapolation outside 2026-11-01 to 2027-03-01 UTC';
  }
  $('planetError').textContent=error||(
   state?.status==='VERIFIED_SOURCE_INTERPOLATED'?
    'JPL/SPICE NUMERICAL MODEL · interpolation bounded by midpoint tests · device clock is untrusted':
    'ABSTAIN: '+(state?.status||'CATALOG_NOT_LOADED'));
 }
 function show(){
  active=true;clearFlightInput();
  $('flightHud').hidden=true;$('flightActions').hidden=true;$('flightTouch').hidden=true;
  $('planetControls').hidden=false;
  $('openPlanets').hidden=true;$('returnFlight').hidden=false;
  error='';
 }
 function hide(){
  active=false;mode='paused';clearFlightInput();
  $('flightHud').hidden=false;$('flightActions').hidden=false;$('flightTouch').hidden=false;
  $('planetControls').hidden=true;$('openPlanets').hidden=false;$('returnFlight').hidden=true;
 }
 $('openPlanets').addEventListener('click',show);
 $('returnFlight').addEventListener('click',hide);
 $('planetPlay').addEventListener('click',()=>{
  mode=mode==='running'?'paused':'running';
  error='';
 });
 $('planetNow').addEventListener('click',()=>{
  epochMs=Date.now();mode='live';error='';
 });
 $('planetSet').addEventListener('click',()=>{
  const val=parseUtcField($('planetDate').value);
  if(val===null){mode='paused';error='INVALID UTC DATE FIELD';return;}
  epochMs=val;mode='paused';error='';
 });
 $('planetStepBack').addEventListener('click',()=>{mode='paused';epochMs-=86400000;error='';});
 $('planetStepForward').addEventListener('click',()=>{mode='paused';epochMs+=86400000;error='';});
 $('planetWarp').addEventListener('change',()=>{
  const v=Number($('planetWarp').value);
  if([1,60,3600,86400].includes(v))warp=v;
 });
 $('planetView').addEventListener('change',()=>{
  if($('planetView').value in VIEWS)view=$('planetView').value;
 });
 $('planetFocus').addEventListener('change',()=>{
  if(catalog?.targets.some(x=>x.id===$('planetFocus').value))focus=$('planetFocus').value;
 });
 $('planetTrueRadius').addEventListener('change',()=>{trueSize=$('planetTrueRadius').checked;});
 loadPlanetCatalog().then(data=>{
  catalog=data;
  $('planetLoaded').textContent='DATA VERIFIED · '+data.samples.length+' REAL JPL KNOTS';
  for(const body of catalog.targets){
   const opt=document.createElement('option');opt.value=body.id;opt.textContent=body.name+
    (body.kind==='system_barycenter'?' (barycenter)':'');
   $('planetFocus').append(opt);
  }
  $('planetFocus').value=focus;
 }).catch(e=>{
  catalog=null;mode='paused';error='CATALOG REJECTED · '+String(e.message).slice(0,140);
 });
 function frame(seconds){
  if(!active)return;
  if(mode==='live'){epochMs=Date.now();}
  else if(mode==='running'){
   const next=epochMs+Math.min(.10,Math.max(0,seconds))*1000*warp;
   if(next>end||next<begin){mode='paused';error='VERIFIED DATA WINDOW REACHED · NO EXTRAPOLATION';}
   else epochMs=next;
  }
  const state=catalog?sampleAtUtc(catalog,epochMs):{status:'ABSTAIN_CATALOG_NOT_LOADED'};
  renderPlanetarium(ctx,state,catalog,{view,focus,trueSize});
  updateDisplay(state);
 }
 return Object.freeze({isActive:()=>active,frame,
  snapshot:()=>({active,loaded:!!catalog,epochMs,mode,warp,view,focus,trueSize,
   status:catalog?sampleAtUtc(catalog,epochMs).status:'ABSTAIN_CATALOG_NOT_LOADED',
   sampleCount:catalog?.samples.length||0,
   distances:catalog?sampleAtUtc(catalog,epochMs).distancesKm:null})});
}
