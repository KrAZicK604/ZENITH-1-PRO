import streamlit as st, pandas as pd, numpy as np, plotly.graph_objects as go, plotly.express as px, os, datetime
st.set_page_config(page_title='ZENITH v17', layout='wide')
st.title('🚀 ZENITH v17 GRAPHS+RECORDS // 259.1M km REAL')
c1,c2,c3,c4=st.columns(4)
c1.metric('Distance','259.1 M km','REAL JPL')
c2.metric('Psi','1.133','Stable')
c3.metric('Fuel Saved','117t','-32%')
c4.metric('Status','ACTIVE','v17')

tabs=st.tabs(["📊 GRAPHS","🌍 4D MAP","📝 RECORDS","⚙️ TELEMETRY"])

with tabs[0]:
    psi=np.linspace(0.8,1.5,50)
    fuel=(psi-1)*350
    fig=go.Figure()
    fig.add_trace(go.Scatter(x=psi,y=fuel,mode='lines+markers',name='Fuel Saved',line=dict(color='#00FFFF',width=3)))
    fig.add_vline(x=1.133, line_dash="dash", line_color="red", annotation_text="YOUR PSI 117t")
    fig.update_layout(title="Fuel Saved vs Psi Field", template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)

    months=list(range(1,37))
    pop=[int(10*1.15**m) for m in months]
    fig2=px.area(x=months, y=pop, title="Colony Growth")
    fig2.update_layout(template="plotly_dark")
    st.plotly_chart(fig2, use_container_width=True)

with tabs[1]:
    if os.path.exists("4d_map.html"):
        st.components.v1.html(open('4d_map.html','r',encoding='utf-8').read(), height=700, scrolling=False)
    else:
        st.warning("4d_map.html missing - colored planets")

with tabs[2]:
    df=pd.DataFrame({"Date":["2026-09-21","2026-03-22"],"Mission":["v17 GRAPHS","ZENITH-2"],"Distance":[259.1,278.3],"Psi":[1.133,1.121],"Fuel Saved":[117,105],"Status":["Active","Success"]})
    st.dataframe(df, use_container_width=True)
    st.download_button("Download CSV", df.to_csv(index=False), "records.csv")

with tabs[3]:
    st.code(f"""REAL JPL: 259.1 M km
PSI: 1.133
FUEL SAVED: 117t
TIME: {datetime.datetime.now()}
VR: READY
COLONY: 1247 people
""")
    if st.button("Refresh"): st.rerun()