import requests, json, datetime
print("=== v15 STEP 2 - SPACEX LIVE ===")
try:
    r = requests.get("https://api.spacexdata.com/v4/launches/next", timeout=10)
    data = r.json()
    print(f"Next Launch: {data['name']}")
    print(f"Date: {data['date_utc']}")
    print(f"Rocket: {data['rocket']}")
    open("spacex_next.json","w").write(json.dumps(data, indent=2))
    
    # All Starship launches
    r2 = requests.get("https://api.spacexdata.com/v4/launches/query", json={"query": {"name": {"$regex": "Starship", "$options": "i"}}, "options": {"limit": 5, "sort": {"date_utc": "desc"}}}, timeout=10)
    print(f"Starship launches found: {len(r2.json()['docs'])}")
    print("Saved spacex_next.json - REAL SPACEX API")
except Exception as e:
    print(f"SpaceX API offline: {e}")
    fallback = {"name": "Starship Flight 7", "date_utc": "2026-10-15T00:00:00Z", "fallback": True}
    open("spacex_next.json","w").write(json.dumps(fallback, indent=2))
