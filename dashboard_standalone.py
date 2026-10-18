import json, time, threading, http.server, socketserver, math, random
PHI_CRIT = 1.2e27
class FlowCore:
    def __init__(self):
        self.phi = 3.27e26
        self.year = 247.0
    def tick(self):
        self.phi *= 1.002 + random.uniform(0,0.001)
        self.year += 0.01
        psi = 1.0 + (self.phi/PHI_CRIT)*math.cos(0.3)
        return type('S',(),{'phi_flow':self.phi,'psi':psi,'year':self.year,'flops':self.phi*7.3})()
core = FlowCore()
state={"phi":3.27e26,"psi":1.27,"year":247.0,"flops":2.4e27}
def loop():
    global state
    while True:
        s=core.tick()
        state={"phi":s.phi_flow,"psi":s.psi,"year":s.year,"flops":s.flops}
        time.sleep(0.5)
threading.Thread(target=loop,daemon=True).start()
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-type","text/html"); self.end_headers()
        html=f"<html><body style=background:#000;color:#0f0;font-family:monospace;padding:20px><h1>ZENITH-1 DASHBOARD v4.2</h1><h2>PHI {state['phi']:.2e}</h2><h2>PSI {state['psi']:.3f}</h2><h2>YEAR {state['year']:.2f}</h2><script>setTimeout(()=>location.reload(),1000)</script></body></html>"
        self.wfile.write(html.encode())
    def log_message(self, *a): return
print("DASHBOARD at http://localhost:8080")
socketserver.TCPServer(("0.0.0.0",8080),H).serve_forever()
