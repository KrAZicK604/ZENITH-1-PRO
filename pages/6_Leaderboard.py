import streamlit as st, json, os, datetime
st.title("🏆 LEADERBOARD - ZENITH PILOTS")
st.markdown("### Fastest Mars Transfers - 259.1M km")

DB="leaderboard.json"
if not os.path.exists(DB):
    with open(DB,"w") as f: json.dump([
        {"pilot":"Peter Zenith","time":259.1,"fuel":117,"date":"2026-09-21","ship":"ZENITH-1"},
        {"pilot":"Elon_Clone","time":262.3,"fuel":110,"date":"2026-09-20","ship":"Starship"},
        {"pilot":"MarsOne","time":271.5,"fuel":98,"date":"2026-09-19","ship":"Ares"}
    ], f)

with open(DB,"r") as f: board=json.load(f)
board=sorted(board, key=lambda x: x["time"])

col1,col2,col3 = st.columns(3)
col1.metric("Record", f"{board[0]['time']}M km", board[0]['pilot'])
col2.metric("Pilots", len(board), "Active")
col3.metric("Your Best", "---", "Fly to rank!")

st.table(board)

st.markdown("---")
st.subheader("🚀 Submit Your Flight")
with st.form("flight"):
    name=st.text_input("Pilot Name", "Anonymous Pilot")
    time=st.slider("Your Distance (lower = faster trajectory)", 240.0, 300.0, 259.1)
    fuel=st.slider("Fuel Saved", 0, 200, 117)
    ship=st.selectbox("Ship", ["ZENITH-1","ZENITH-2","Custom"])
    if st.form_submit_button("🏆 SUBMIT TO LEADERBOARD"):
        board.append({"pilot":name,"time":time,"fuel":fuel,"date":str(datetime.date.today()),"ship":ship})
        with open(DB,"w") as f: json.dump(board,f)
        st.balloons()
        st.success(f"✅ {name} logged! {time}M km - Rank #{sorted(board, key=lambda x: x['time']).index(board[-1])+1}")
        st.rerun()

st.markdown("**Multiplayer coming:** Real-time race Earth->Mars with friends in VR!")
