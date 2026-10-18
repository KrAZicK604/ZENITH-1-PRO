import streamlit as st
st.set_page_config(page_title="REALITY OS v29 - APPS", layout="wide", page_icon="🌌")
st.title("🌌 REALITY OS v29 - APPS + MULTI-USER + LOCK SCREEN")
st.markdown("### Features: Drag windows | 📁 File Manager | 💻 Terminal | 👥 3 Users Online | 🔒 Lock Screen")
with open("FINAL_VR_v29_OS_APPS.html","r",encoding="utf-8") as f:
    st.components.v1.html(f.read(), height=950, scrolling=False)
st.success("v29 - File Manager + Terminal + Multi-user Chat + Lock Screen - Swipe up to unlock!")
'| Set-Content -Path app.py -Encoding UTF8

# TERMUX LOCK SCREEN SETUP SCRIPT
@'
#!/data/data/com.termux/files/usr/bin/bash
# REALITY OS - LOCK SCREEN DAEMON
echo "🌌 Installing Reality OS Lock Screen Daemon..."
pkg install termux-api -y
termux-wake-lock
echo "✅ Wake-lock active - Supercomputer runs even screen off"
echo "📱 Lock screen widget:"
echo "1. Long press home screen -> Widgets -> Termux Widget"
echo "2. Add script: reality_os_lock.sh"
echo "3. Now lock screen shows Mars distance even locked"
cat > $HOME/reality_os_lock.sh << 'LOCK'
#!/data/data/com.termux/files/usr/bin/bash
while true; do
  MARS=$(python -c "import math,datetime; jd=2451545+((__import__('datetime').date.today()-__import__('datetime').date(2000,1,1)).days); e=(100.464+0.985609*(jd-2451545))%360; m=(355.433+0.524033*(jd-2451545))%360; d=math.radians(abs(e-m)); dist=math.sqrt(1+2.32-2*1*1.5237*math.cos(d))*149.6; print(f'{dist:.1f}')")
  termux-notification --content "🌌 Reality OS | Mars ${MARS}M km | 847 THz | 99.3% ALIVE" --id zenith-lock
  sleep 60
done
LOCK
chmod +x $HOME/reality_os_lock.sh
echo "Run: $HOME/reality_os_lock.sh &"
echo "Lock screen will show Mars distance every minute!"
