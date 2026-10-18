import streamlit as st
import streamlit.components.v1 as components
import os
st.set_page_config(page_title="REALITY OS v41 - FINAL - PLAY & EARN", layout="wide", page_icon="🏁")

st.markdown("""
<style>
#MainMenu, footer, header {visibility: hidden;}
.stApp {background: #000; color: #00ff88;}
.block-container {padding: 0; max-width: 100%;}
h1, h2, h3 {color: #00ff88 !important;}
</style>
""", unsafe_allow_html=True)

# Load finished game
for f in ["FINAL_VR_v41_FINISHED.html", "FINAL_VR_v40_PAID.html", "FINAL_VR_v39_TOURNAMENT.html"]:
    if os.path.exists(f):
        html_file = f
        break

with open(html_file, 'r', encoding='utf-8') as file:
    html_content = file.read()

components.html(html_content, height=1300, scrolling=True)

st.markdown("---")
st.markdown("## 🏁 REALITY OS v41 - FINAL BUILD - COMPLETE GAME")

col1, col2, col3, col4 = st.columns(4)
col1.link_button("🏁 RACE $29 - PLAY NOW", "https://buy.stripe.com/cNicMY68hfdN5N35148bS03", use_container_width=True, type="primary")
col2.link_button("📚 COURSE $199", "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02", use_container_width=True)
col3.link_button("🏫 SCHOOL $999", "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01", use_container_width=True)
col4.link_button("💰 MY MONEY - BALANCE", "https://dashboard.stripe.com/balance", use_container_width=True)

st.markdown("""
### 🎮 HOW TO PLAY - FINAL GAME:

1. **Press SHIFT+F** to test finish screen (or finish a real race)
2. **Race** -> Finish -> See time, prize, rank
3. **Leaderboard** top right - Global Top 10 - Beat #1
4. **Progress** top left - Your races, wins, best time, earnings, achievements
5. **Tournament** bottom right pink button -> 8 players -> $100 prize
6. **Share** your time -> Invite friends -> More players -> Bigger prize pool

### 💰 HOW YOU EARN:

- **$29 Race:** Player pays -> You get $20 profit -> $9 fee -> Prize pool +$20
- **$199 Course:** Full game + tutorials -> You get $180 profit
- **$999 School:** License for class -> You get $900 profit
- **Check money:** https://dashboard.stripe.com/balance -> Payouts -> https://dashboard.stripe.com/payouts

### 🏆 ACHIEVEMENTS TO UNLOCK:
- 🏁 First Race | ⚡ Under 40s | 🏆 5 Wins | 💰 Earn $100 | 👑 Tournament Champ

**GAME IS 100% FINISHED AND PLAYABLE - READY TO SELL AND DEPLOY LIVE**
""")

st.balloons()
