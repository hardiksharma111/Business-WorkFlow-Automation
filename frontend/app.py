import streamlit as st
import os

st.set_page_config(page_title="Synova Nexus", layout="centered", initial_sidebar_state="collapsed")

# Modern CSS for Shading & Text
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;800&display=swap');
    .stApp {
        background: radial-gradient(circle at top right, #1e293b, #0f172a, #020617) !important;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .hero-title {
        font-size: 60px; font-weight: 800; text-align: center;
        background: linear-gradient(to right, #ffffff, #3b82f6);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 10px;
    }
    div.stButton > button {
        background: linear-gradient(90deg, #3b82f6, #a855f7) !important;
        border: none; color: white; width: 100%; border-radius: 12px; height: 50px; font-weight: 700;
    }
    header, footer, [data-testid="stSidebarNav"] { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# UI Elements
st.markdown('<div style="height:100px;"></div>', unsafe_allow_html=True)
st.markdown('<h1 class="hero-title">Synova Nexus</h1>', unsafe_allow_html=True)
st.markdown('<p style="text-align:center; color:#94a3b8;">Initialize syntax wizard operations.</p>', unsafe_allow_html=True)

with st.container():
    st.text_input("User ID", placeholder="Wizard ID", label_visibility="collapsed")
    st.text_input("Cipher", type="password", placeholder="Access Cipher", label_visibility="collapsed")
    if st.button("Enter Dashboard"):
        st.switch_page("pages/1_Dashboard.py")
