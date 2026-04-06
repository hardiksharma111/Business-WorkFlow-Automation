import streamlit as st

st.set_page_config(page_title="Dashboard", layout="wide")

# CSS for Dark Dashboard & Unified Buttons
st.markdown("""
<style>
    .stApp { background: #020617 !important; color: #f8fafc; }
    header, footer, [data-testid="stSidebarNav"] { visibility: hidden; }
    
    /* Unified Topbar Buttons */
    .stButton > button {
        background-color: #1e3a8a !important; color: white !important;
        border: none; border-radius: 10px; font-weight: 600; width: 100%;
    }
    .stButton > button[kind="primary"] { background-color: #ef4444 !important; } /* Reset */
    
    .glass-card {
        background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 20px;
    }
</style>
""", unsafe_allow_html=True)

# TOPBAR - Unified Row
cols = st.columns([1,1,1,1,1])
with cols[0]: st.button("State")
with cols[1]: st.button("Graph")
with cols[2]: st.button("Audit")
with cols[3]: st.button("Save")
with cols[4]: st.button("Reset", type="primary")

st.divider()

# Layout: Chat + Controls
col_left, col_right = st.columns([2, 1], gap="large")

with col_left:
    st.markdown("### Wizard Chat Interface")
    with st.container(border=True):
        st.markdown('<div style="background:#2563eb; color:white; padding:10px; border-radius:10px; margin-bottom:10px; width:fit-content;">System Check?</div>', unsafe_allow_html=True)
        st.markdown('<div style="background:#334155; color:white; padding:10px; border-radius:10px; margin-bottom:10px; width:fit-content;">Backend Ready. Sync active.</div>', unsafe_allow_html=True)
        st.chat_input("Enter command...")

with col_right:
    st.markdown('<div class="glass-card"><h3>Memory Control</h3>', unsafe_allow_html=True)
    st.slider("Daily", 0, 100, 30)
    st.slider("Fact", 0, 100, 34)
    st.slider("Project", 0, 100, 24)
    st.markdown('</div>', unsafe_allow_html=True)