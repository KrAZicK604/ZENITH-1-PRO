import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[],outside=[];
mkdirSync('artifacts',{recursive:true});
// Synthetically generated coordinates, not a JPL ephemeris or a real distance.
function mock(body,x,y,z,plane='Earth Mean Equator and Equinox of Reference Epoch'){
 const names={399:'Earth',301:'Moon',499:'Mars'};
 return [
  'Target body name: '+names[body]+' ('+body+') {source: SYNTHETIC_UI_TEST}',
  'Center body name: Solar System Barycenter (0) {source: SYNTHETIC_UI_TEST}',
  'Center-site name: BODY CENTER','Output units: KM-S',
  'Output type: GEOMETRIC cartesian states',
  'Output format: 2 (position and velocity)',
  'Reference frame: ICRF/J2000.0','Coordinate systm: '+plane,
  'Calendar mode: Mixed Julian/Gregorian','JDTDB','  X   Y   Z',
  '$$SOE','2461356.500000000 = A.D. 2026-Nov-12 00:00:00.0000 TDB',
  ' X = '+x.toExponential(12)+' Y = '+y.toExponential(12)+' Z = '+z.toExponential(12),
  ' VX= 0.0 VY= 0.0 VZ= 0.0','$$EOE'
 ].join('\n');
}
async function testViewport(viewport,mobile){
 const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith(origin+'/'))outside.push(r.url());});
 const res=await page.goto(origin+'/astro-navigation.html',{waitUntil:'load'});
 assert.equal(res.status(),200);
 await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('AWAITING'));
 const none=await page.locator('#em').textContent();
 assert.equal(none,'—');
 await page.locator('#earth').fill(mock(399,1e8,0,0));
 await page.locator('#moon').fill(mock(301,1e8,384400,0));
 await page.locator('#mars').fill(mock(499,3e8,0,0));
 await page.getByRole('button',{name:'Validate and calculate real distances'}).click();
 await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('ACCEPTED'));
 assert.equal(await page.locator('#em').textContent(),'384,400 km');
 assert.equal(await page.locator('#er').textContent(),'200,000,000 km');
 assert.match(await page.locator('#details').textContent(),/JD\(TDB\) 2461356\.5/);
 assert.equal(await page.locator('#diagram circle').count(),3);
 await page.screenshot({path:'artifacts/astro-'+(mobile?'mobile':'desktop')+'-validated.png',fullPage:true});
 // A single ecliptic body must fail the whole table, never mix coordinates.
 await page.locator('#moon').fill(mock(301,1e8,384400,0,'Ecliptic and Mean Equinox of Reference Epoch'));
 await page.getByRole('button',{name:'Validate and calculate real distances'}).click();
 await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('REJECTED'));
 assert.equal(await page.locator('#em').textContent(),'—');
 assert.equal(await page.locator('#er').textContent(),'—');
 assert.equal(await page.locator('#mr').textContent(),'—');
 assert.equal(await page.locator('#diagram circle').count(),0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=1,'horizontal overflow: '+overflow);
 await ctx.close();
}
try{
 await testViewport({width:1280,height:850},false);
 await testViewport({width:390,height:844},true);
 assert.deepEqual(errors,[]);
 assert.deepEqual(outside,[]);
 console.log('ASTRO_BROWSER_PASS desktop/mobile synthetic valid-and-invalid paths, fail-closed reset, no errors or remote requests');
}finally{await browser.close();}
