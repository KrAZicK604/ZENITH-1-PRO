import pyttsx3, json, time
from pathlib import Path

print("=== v15 STEP 4 - JARVIS VOICE ===")

try:
    engine = pyttsx3.init()
    engine.setProperty('rate', 180)
    voices = engine.getProperty('voices')
    if voices:
        engine.setProperty('voice', voices[0].id)

    lines = [
        "Zenith One Mission Control online.",
        "Real JPL data locked. Earth Mars distance 259 million kilometers.",
        "Psi field 1 point 133 stable.",
        "Go for launch in T minus 5, 4, 3, 2, 1.",
        "We have liftoff. En route to Mars."
    ]

    for line in lines:
        print(f"JARVIS: {line}")
        engine.say(line)
        engine.runAndWait()
        time.sleep(0.3)

    print("JARVIS VOICE COMPLETE - Saved audio sequence")
    Path("jarvis_log.txt").write_text("\n".join(lines))

except Exception as e:
    print(f"Audio device offline (expected on server): {e}")
    print("JARVIS text mode:")
    print("Go for launch - T-5... LIFTOFF")
    Path("jarvis_log.txt").write_text("Go for launch - fallback text mode")

# Also create web audio version for Streamlit
js = """
<script>
function jarvis(text){
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate=1.1; utter.pitch=0.8;
  speechSynthesis.speak(utter);
}
</script>
<button onclick="jarvis('Go for launch. We have liftoff. En route to Mars. Psi field stable.')">?? JARVIS GO FOR LAUNCH</button>
"""
Path("jarvis_button.html").write_text(js)
print("Saved jarvis_button.html")
