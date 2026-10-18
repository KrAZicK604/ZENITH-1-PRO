import json, time, sqlite3
from datetime import datetime
from pathlib import Path
DB_PATH = Path("zenith_memory.db")
class MemoryCore:
    def __init__(self):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, timestamp REAL, date TEXT, key TEXT, value TEXT)")
        conn.commit(); conn.close()
        print("[MEMORY CORE] DB ready")
    def remember(self, key, value):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("INSERT INTO memories VALUES (NULL,?,?,?,?)",(time.time(),datetime.now().isoformat(),key,json.dumps(value)))
        conn.commit(); conn.close()
if __name__ == "__main__":
    m=MemoryCore()
    m.remember("milestone","Dashboard v4.2 works Psi 1.27")
    print("MEMORY CORE TEST OK")
