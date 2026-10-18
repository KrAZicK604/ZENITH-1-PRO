import streamlit as st
import streamlit.components.v1 as components
import os

st.set_page_config(page_title="REALITY OS v37 - ONLINE SIMPLE", layout="wide", page_icon="🚀")

# Load your HTML game
html_file = "FINAL_VR_v37_ONLINE_SIMPLE.html"

if os.path.exists(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Display game in Streamlit
    components.html(html_content, height=900, scrolling=True)
else:
    st.error(f"Game file not found: {html_file}")
    st.info("Make sure FINAL_VR_v37_ONLINE_SIMPLE.html is in same folder as app.py")
    st.write(f"Current folder: {os.getcwd()}")
    st.write(f"Files here: {os.listdir('.')}")
