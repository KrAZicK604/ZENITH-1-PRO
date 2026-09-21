import streamlit as st, datetime, json, os
st.title("📧 CONTACT - Join ZENITH Mission")

st.markdown("""
### Peter Zenith - Mission Control
**Building real-scale Mars VR**

Want to collaborate? Join mission? Report bug?
""")

col1,col2 = st.columns(2)
with col1:
    st.subheader("📨 Send Message")
    with st.form("contact"):
        name=st.text_input("Name")
        email=st.text_input("Email")
        subject=st.selectbox("Subject", ["Collab","Bug Report","VR Feature Request","Sponsorship","Join Team","Other"])
        msg=st.text_area("Message", "I want to...")
        if st.form_submit_button("🚀 SEND TO MISSION CONTROL"):
            db="messages.json"
            data=[]
            if os.path.exists(db):
                with open(db,"r") as f: data=json.load(f)
            data.append({"name":name,"email":email,"subject":subject,"msg":msg,"date":str(datetime.datetime.now())})
            with open(db,"w") as f: json.dump(data,f,indent=2)
            st.balloons()
            st.success(f"✅ Message sent! {name} - We will reply to {email} in 24h")
            st.snow()

with col2:
    st.subheader("🌐 Connect")
    st.markdown("""
    **GitHub:** KrAZicK604/ZENITH-1-PRO
    **Live Site:** peterzenith-zenith-1-pro.streamlit.app
    **Email:** peter@zenith.space (set up)
    **Location:** Langley, BC, Canada
    **Discord:** Coming Soon
    """)
    st.link_button("GitHub", "https://github.com/KrAZicK604/ZENITH-1-PRO")
    st.link_button("Live Demo", "https://peterzenith-zenith-1-pro.streamlit.app")

    st.markdown("---")
    st.subheader("📊 Messages Received")
    if os.path.exists("messages.json"):
        with open("messages.json","r") as f:
            msgs=json.load(f)
        st.metric("Total Messages", len(msgs))
        st.json(msgs[-3:] if len(msgs)>0 else [])
    else:
        st.info("No messages yet - be first!")

st.markdown("---")
st.caption("Form saves locally to messages.json + you can add Email API (SendGrid) later")
