import streamlit as st
import base64
import os

# Page Config
st.set_page_config(page_title="Synova | Nexus", layout="wide", initial_sidebar_state="collapsed")

# UI Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

    .stApp {
        background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #020617 100%) !important;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }

    header, footer, [data-testid="stSidebarNav"] { visibility: hidden; }

    /* Login Card */
    .login-card {
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(15px);
        border: 2px solid #3b82f6;
        border-radius: 25px;
        padding: 50px;
        max-width: 450px;
        margin: 80px auto;
        text-align: center;
        box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
    }

    /* Input Box Visibility Fix */
    div[data-baseweb="input"] {
        background-color: #0f172a !important;
        border: 1px solid #3b82f6 !important;
        border-radius: 8px !important;
    }

    input {
        color: #ffffff !important;
        caret-color: #3b82f6 !important;
    }

    label { color: #94a3b8 !important; font-weight: 600 !important; }

    /* Action Button */
    .stButton > button {
        background: linear-gradient(90deg, #3b82f6, #a855f7) !important;
        color: white !important;
        border: none !important;
        width: 100%;
        height: 50px;
        border-radius: 12px;
        font-weight: 800;
        margin-top: 20px;
        cursor: pointer;
    }
</style>
""", unsafe_allow_html=True)

# Layout
st.markdown('<div class="login-card">', unsafe_allow_html=True)
st.markdown('<h1 style="color:white; margin-bottom:5px;">Synova</h1>', unsafe_allow_html=True)
st.markdown('<p style="color:#64748b; font-size:14px;">Nexus Authorization Required</p>', unsafe_allow_html=True)
st.markdown('<div style="margin-bottom:30px;"></div>', unsafe_allow_html=True)

# Visible Inputs
wiz_id = st.text_input("Enter Wizard ID", placeholder="e.g. WIZ-001")
cipher = st.text_input("Enter Access Cipher", type="password", placeholder="••••••••")

if st.button("Initialize Nexus"):
    if wiz_id and cipher:
        st.switch_page("pages/1_Dashboard.py")
    else:
        st.warning("Please enter credentials.")

st.markdown('</div>', unsafe_allow_html=True)
