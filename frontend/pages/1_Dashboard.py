import streamlit as st
import base64
import os

# 1. Page Configuration (Keep Initial state expanded to feel connected)
st.set_page_config(page_title="Synova Dashboard", layout="wide", initial_sidebar_state="expanded")

# 2. Logo Loading Logic (Again, needed for this page)
def get_base64_logo(file_path):
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return None

logo_base64 = get_base64_logo("logo.png")

# 3. Modern Sidebar & Unified Topbar CSS
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

    .stApp {{
        background: radial-gradient(circle at bottom right, #020617, #0f172a, #111827) !important;
        color: #f8fafc;
        font-family: 'Plus Jakarta Sans', sans-serif;
    }}

    header, footer, [data-testid="stSidebarNav"] {{ visibility: hidden; }}

    /* MODERN SIDEBAR STYLING (≡ Menu) */
    section[data-testid="stSidebar"] {{
        background-color: #010409 !important; /* Extremely dark black */
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }}

    /* Adjusting default Streamlit PageLink styling in sidebar */
    [data-testid="stSidebarCollapse"] {{
        color: white !important;
        background: rgba(59, 130, 246, 0.2) !important;
        border-radius: 8px;
    }}

    [data-testid="stSidebar"] div span {{
        color: #94a3b8 !important;
        font-size: 14px;
    }}
    
    [data-testid="stSidebar"] div span:hover {{
        color: white !important;
    }}

    /* UNIFIED FUNCTIONAL TOPBAR BUTTONS */
    .stButton > button {{
        background-color: #1e3a8a !important; /* Unified Navy */
        color: white !important;
        border-radius: 10px !important;
        font-weight: 600;
        width: 100%;
        border: none;
        padding: 10px 0 !important;
        transition: 0.2s;
    }}
    
    .stButton > button:hover {{
        background-color: #3b82f6 !important;
        transform: translateY(-1px);
    }}
    
    /* Reset Button (Red) */
    .stButton > button[kind="primary"] {{
        background-color: #ff4b4b !important;
    }}
    
    .stButton > button[kind="primary"]:hover {{
        background-color: #ef4444 !important;
    }}

    /* CARDS */
    .glass-card {{
        background: rgba(30, 41, 59, 0.3);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 25px;
        margin-bottom: 20px;
    }}

    h2, h3 {{ font-family: 'Plus Jakarta Sans'; color: white !important; }}
</style>
""", unsafe_allow_html=True)

# --- HAMBURGER SIDEBAR (The Navigation Menu) ---
with st.sidebar:
    # Logo Integration
    if logo_base64:
        st.markdown(f"""
        <div style="padding: 15px 0; margin-bottom: 35px; text-align: center;">
            <img src="data:image/png;base64,{logo_base64}" style="max-height:45px; width:auto;">
        </div>
        """, unsafe_allow_html=True)
    else:
        # Fallback Text logo
        st.markdown("""
        <div style="padding: 15px 0; margin-bottom: 35px; display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; background:#1e3a8a; border-radius:12px; display:grid; place-items:center; font-weight:800; color:white; font-size:20px;">S</div>
            <div>
                <p style="font-family:'Plus Jakarta Sans'; font-size:18px; font-weight:800; color:#3b82f6; margin:0;">Synova</p>
                <p style="font-size:9px; color:#64748b; letter-spacing:1px; margin:0;">NEXUS DASHBOARD</p>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # UNIFIED PAGE NAVIGATION
    st.page_link("pages/1_Dashboard.py", label="Operations Hub", icon="📊")
    st.page_link("pages/2_Inventory.py", label="Node Inventory", icon="📦")
    # Inventory can have a dropdown feel in future iterations using st.expander() if your partner wishes.
    
    st.markdown("---")
    st.page_link("app.py", label="Initialize Nexus", icon="🔒")

# --- UNIFIED FUNCTIONAL TOPBAR ---
top_col1, top_col2, top_col3, top_col4, top_col5 = st.columns(5)
with top_col1:
    if st.button("Fetch State"): st.toast("🔄 Initializing state fetch...")
with top_col2:
    if st.button("Render Graph"): st.toast("📊 Updating visualization data...")
with top_col3:
    if st.button("Syntax Audit"): st.toast("🕵️ Running full audit pipeline...")
with top_col4:
    if st.button("Save Blueprint"): st.success("💾 Operation Saved!")
with top_col5:
    if st.button("Reset Operations", type="primary"): st.rerun()

st.divider()

# --- MAIN DASHBOARD CONTENT (Chat + Controls) ---
st.markdown("<h2 style='font-weight:700;'>Live Operations Hub</h2>", unsafe_allow_html=True)
st.write("Monitor and control syntax wizard execution.")

col_chat, col_controls = st.columns([2.2, 1], gap="large")

with col_chat:
    with st.container(border=True):
        st.markdown("### Syntax Wizard Output")
        st.write("")
        # Static placeholders for UI connection
        st.markdown('<div style="background:#0f172a; color:#94a3b8; padding:12px 18px; border-radius:14px; margin-bottom:12px; width:60%; border:1px solid rgba(255,255,255,0.05);">Nexus initialized. Waiting for logic sync... Ready.</div>', unsafe_allow_html=True)
        st.markdown('<div style="background:#e2e8f0; color:#0f172a; padding:12px 18px; border-radius:14px; margin-bottom:12px; width:70%; margin-left: auto;">Awaiting commands, Master Wizard.</div>', unsafe_allow_html=True)
        
        st.chat_input("Enter operation command...")

with col_controls:
    st.markdown('<div class="glass-card"><h3>Chat Context</h3><p style="color:#64748b;">Waiting for backend...</p></div>', unsafe_allow_html=True)
    with st.container(border=True):
        st.markdown("### Memory Control Lab")
        st.write("")
        daily_ret = st.slider("Daily Retention", 0, 100, 80)
        fact_acc = st.slider("Fact Accuracy", 0, 100, 45)
        proj_depth = st.slider("Context Depth", 0, 100, 95)
        st.markdown(f"<p style='font-size:11px; color:#64748b; margin-top:10px;'>Active Values: {daily_ret}% | {fact_acc}% | {proj_depth}%</p>", unsafe_allow_html=True)
