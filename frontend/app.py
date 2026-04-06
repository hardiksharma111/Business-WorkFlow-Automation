import streamlit as st
import base64
import os

# 1. Page Configuration
st.set_page_config(page_title="Synova | Nexus", layout="wide", initial_sidebar_state="collapsed")

# 2. Logo Loading (Main directory se logo.png uthayega)
def get_base64_logo(file_path):
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return None

logo_base64 = get_base64_logo("logo.png")

# 3. Custom CSS (Image 4 ke shading aur rounded box par based)
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');

    /* Background with deep radial gradient */
    .stApp {{
        background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #020617 100%) !important;
        color: #f8fafc;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }}

    /* Hiding default Streamlit elements */
    header, footer, [data-testid="stSidebarNav"] {{ visibility: hidden; }}

    /* Centered Login Card */
    .login-card {{
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 30px;
        padding: 60px;
        max-width: 450px;
        margin: 120px auto;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }}

    .hero-text {{
        font-size: 52px;
        font-weight: 800;
        background: linear-gradient(to bottom right, #ffffff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 20px;
    }}

    /* Professional Blue Buttons */
    .stButton > button {{
        background: linear-gradient(90deg, #3b82f6, #a855f7) !important;
        border-radius: 12px !important;
        color: white !important;
        font-weight: 700;
        padding: 12px 0 !important;
        width: 100%;
        border: none;
        transition: 0.3s ease;
    }}

    /* Input box styling */
    input[type="text"], input[type="password"] {{
        background: rgba(15, 23, 42, 0.8) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        border-radius: 10px !important;
    }}
</style>
""", unsafe_allow_html=True)

# --- UI LAYOUT ---
st.markdown('<div class="login-card">', unsafe_allow_html=True)

# Logo Display
if logo_base64:
    st.markdown(f'<img src="data:image/png;base64,{logo_base64}" style="width:70px; margin-bottom:20px;">', unsafe_allow_html=True)
else:
    st.markdown('<div style="font-size:40px; margin-bottom:20px;">💠</div>', unsafe_allow_html=True)

st.markdown('<div class="hero-text">Synova</div>', unsafe_allow_html=True)
st.markdown('<p style="color:#94a3b8; margin-bottom:40px;">Enter your credentials to initialize Nexus.</p>', unsafe_allow_html=True)

# Inputs
user_id = st.text_input("Wizard ID", placeholder="Ex: WIZ-01", label_visibility="collapsed")
cipher = st.text_input("Access Cipher", type="password", placeholder="••••••••", label_visibility="collapsed")

st.write("") # Spacer

if st.button("Initialize Nexus"):
    # Ye user ko Dashboard page par le jayega
    st.switch_page("pages/1_Dashboard.py")

st.markdown('</div>', unsafe_allow_html=True)
