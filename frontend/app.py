import streamlit as st
import base64
import os

# 1. Page Configuration
st.set_page_config(page_title="Synova | Nexus", layout="wide", initial_sidebar_state="collapsed")

# 2. Logo Loading Logic (For both topbar and center page)
def get_base64_logo(file_path):
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return None

logo_base64 = get_base64_logo("logo.png")

# 3. Enhanced CSS for Modern Black/Navy Gradient Theme
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

    .stApp {{
        background: radial-gradient(circle at top right, #1e293b, #0f172a, #020617) !important;
        color: #f8fafc;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }}

    /* Hiding Default Streamlit Header/Footer */
    header, footer, [data-testid="stSidebarNav"] {{ visibility: hidden; }}

    /* MODERN LOGIN CARD */
    .login-container {{
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100%;
    }}

    .login-card {{
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        padding: 70px;
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }}

    /* HEADING GRADIENT TEXT */
    .hero-text {{
        font-size: 58px;
        font-weight: 800;
        line-height: 1.1;
        background: linear-gradient(to bottom right, #ffffff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 25px;
    }}

    /* UNIFIED BUTTON STYLING (Sign-In) */
    .stButton > button {{
        background: linear-gradient(90deg, #3b82f6, #a855f7) !important;
        border-radius: 14px !important;
        color: white !important;
        font-weight: 700;
        font-size: 16px;
        padding: 14px 30px !important;
        width: 100%;
        border: none;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        transition: 0.3s ease;
    }}

    .stButton > button:hover {{
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    }}

    /* Placeholder text for inputs */
    input[type="text"], input[type="password"] {{
        background: rgba(15, 23, 42, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 10px !important;
        color: #f8fafc !important;
    }}
</style>
""", unsafe_allow_html=True)

# Main Login UI Container
st.markdown('<div class="login-container"><div class="login-card">', unsafe_allow_html=True)

# Logo Integration
if logo_base64:
    st.markdown(f"""
    <div style="margin: 0 auto 35px;">
        <img src="data:image/png;base64,{logo_base64}" style="max-height:80px; width:auto;">
    </div>
    """, unsafe_allow_html=True)
else:
    # Fallback placeholder if no logo.png exists
    st.markdown("""
    <div style="width:70px; height:70px; background:#1e3a8a; border-radius:12px; margin: 0 auto 35px; display:grid; place-items:center; font-size:30px; font-weight:800; color:white;">
        S
    </div>
    """, unsafe_allow_html=True)

st.markdown('<div class="hero-text">Welcome to<br>Synova Nexus.</div>', unsafe_allow_html=True)
st.markdown('<p style="color:#94a3b8; margin-bottom:45px; font-size:15px;">Initialize core syntax operations.</p>', unsafe_allow_html=True)

# Input constrained for modern look
col_input, _ = st.columns([1, 0.01])
with col_input:
    st.text_input("Wizard ID", placeholder="Ex: WIZ-ALPHA", label_visibility="collapsed")
    st.text_input("Access Cipher", type="password", placeholder="••••••••", label_visibility="collapsed")

st.markdown("<div style='margin-bottom:20px;'></div>", unsafe_allow_html=True)

if st.button("Initialize Nexus"):
    # Clear local storage/cache to ensure clean redirection to multi-page system
    st.switch_page("pages/1_Dashboard.py")

st.markdown('</div></div>', unsafe_allow_html=True)
