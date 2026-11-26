import pathlib, threading, time, datetime, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(SimpleHTTPRequestHandler, directory=str(root / "public")))
threading.Thread(target=server.serve_forever, daemon=True).start()
started = time.monotonic()
print("UTC_HOST_UNATTESTED", datetime.datetime.now(datetime.timezone.utc).isoformat(), flush=True)
def require(condition, message):
    if not condition:
        raise RuntimeError(message)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        page = browser.new_page(viewport={"width":1280,"height":720})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/4d.html", wait_until="domcontentloaded")
        page.wait_for_function("document.getElementById('enemies')?.textContent === '50'", timeout=45000)
        page.wait_for_function("Number(document.getElementById('clock')?.textContent)>0", timeout=15000)
        require(page.locator("#hullMeter").evaluate("(e)=>e.value")==100, "initial hull")
        page.keyboard.press("KeyG")
        require(page.locator("#flightmode").inner_text()=="INERTIAL", "flight mode toggle")
        page.keyboard.down("KeyW")
        page.wait_for_timeout(800)
        page.keyboard.up("KeyW")
        require(float(page.locator("#speed").inner_text())>0, "thrust")
        page.keyboard.down("KeyF")
        page.wait_for_timeout(800)
        page.keyboard.up("KeyF")
        page.locator("#restart").click()
        page.wait_for_function("document.getElementById('enemies')?.textContent === '50'")
        require(not errors, repr(errors))
        print("PASS_BROWSER_SMOKE", flush=True)
        browser.close()
finally:
    server.shutdown()
    print("elapsed_monotonic_seconds", time.monotonic()-started, flush=True)
