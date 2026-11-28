import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    out = Path("graphics-evidence")
    out.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        page = await browser.new_page(viewport={"width":1280,"height":720})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://127.0.0.1:8765/spatial-webgl.html")
        await page.wait_for_function("document.querySelector('#graphics-status').textContent.includes('WebGL2 ACTIVE')")
        await page.screenshot(path=str(out/"initial.png"))
        results = await page.evaluate("""async () => {
          const c=document.querySelector('#universe'), gl=c.getContext('webgl2'), ext=gl.getExtension('WEBGL_lose_context');
          if(!ext) throw Error('EXTENSION_UNAVAILABLE');
          const waitEvent=(name,action)=>new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(Error(name+' timeout')),15000);
            c.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});action();
          });
          const sleep=ms=>new Promise(r=>setTimeout(r,ms));
          const rows=[];
          for(let i=0;i<20;i++){
            await waitEvent('webglcontextlost',()=>ext.loseContext());
            const before=document.querySelector('#flight-hud').textContent;
            await sleep(250);
            if(before!==document.querySelector('#flight-hud').textContent)throw Error('HUD changed during loss');
            await waitEvent('webglcontextrestored',()=>ext.restoreContext());
            await sleep(300);
            if(gl.isContextLost()||!document.querySelector('#graphics-status').textContent.includes('WebGL2 ACTIVE'))throw Error('recovery failed '+i);
            if(gl.getError()!==gl.NO_ERROR)throw Error('GL error '+i);
            rows.push({cycle:i+1,recovered:true});
          }
          return {cycles:rows,renderer:gl.getParameter(gl.RENDERER)};
        }""")
        await page.keyboard.down("w")
        before = await page.locator("#flight-hud").inner_text()
        await page.wait_for_timeout(1200)
        await page.keyboard.up("w")
        after = await page.locator("#flight-hud").inner_text()
        if before == after or errors:
            raise RuntimeError(str(errors) or "HUD unchanged")
        await page.screenshot(path=str(out/"recovered.png"))
        (out/"results.json").write_text(json.dumps(results,indent=2))
        await browser.close()

asyncio.run(main())
