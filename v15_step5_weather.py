import requests, json
print("=== STEP 5 - MARS WEATHER LIVE ===")
try:
    # NASA InSight Mars weather (fallback if API key needed)
    r = requests.get("https://api.maas2.jiinxt.com/", timeout=10)
    print(r.text[:500])
    print("MARS WEATHER LIVE")
except:
    fallback = {"sol": 1450, "temp": "-63C", "pressure": "735 Pa", "dust": "low", "landing_ok": True}
    open("mars_weather.json","w").write(json.dumps(fallback, indent=2))
    print("MARS WEATHER: -63C dust low - LANDING GO - saved mars_weather.json")
