import streamlit as st

# Page Configuration
st.set_page_config(
    page_title="Synova | Workflow Dashboard",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# SINGLE CSS BLOCK: Hides all defaults and cleans up empty containers (Ghost Boxes)
st.markdown("""
    <style>
    /* Main Background and Text */
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
    }
    
    /* Hide Streamlit elements */
    header, footer, #MainMenu, [data-testid="stSidebarNav"] {
        display: none !important;
    }

    /* Cleanup: Hide empty vertical divs (Ghost Boxes) */
    [data-testid="stVerticalBlock"] > div:empty {
        display: none !important;
    }

    /* Top Action Bar Buttons */
    .action-bar {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 20px;
    }
    .action-btn {
        flex: 1;
        background: #1e293b;
        border: 1px solid #334155;
        color: #38bdf8;
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        font-weight: 600;
        font-size: 0.8rem;
        transition: 0.3s;
        cursor: pointer;
    }
    .action-btn:hover {
        border-color: #38bdf8;
        box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
    }

    /* Left Column: Memory Graph Nodes */
    .node-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 30px;
    }
    .node-pill {
        width: 140px;
        padding: 12px;
        border-radius: 50px;
        text-align: center;
        border: 2px solid #38bdf8;
        background: rgba(56, 189, 248, 0.05);
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.1);
        font-weight: bold;
        letter-spacing: 1px;
    }
    .connector-line {
        width: 2px;
        height: 50px;
        background: linear-gradient(to bottom, #38bdf8, #334155);
    }

    /* Middle Column: Chat Bubbles */
    .chat-bubble {
        padding: 12px 18px;
        border-radius: 15px;
        margin-bottom: 12px;
        max-width: 85%;
        font-size: 0.95rem;
    }
    .user-msg {
        background: #1e293b;
        border-left: 4px solid #38bdf8;
        color: #f1f5f9;
    }
    .ai-msg {
        background: #0f172a;
        border: 1px solid #334155;
        color: #94a3b8;
        align-self: flex-end;
    }

    /* Right Column: AI State Card */
    .state-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid #334155;
        padding: 20px;
        border-radius: 12px;
        margin-top: 15px;
    }
    .status-active {
        color: #22c55e;
        font-weight: bold;
        font-size: 0.85rem;
        margin-top: 10px;
    }

    /* Slider styling override */
    .stSlider [data-baseweb="slider"] {
        margin-top: 10px;
    }
    </style>
""", unsafe_allow_html=True)

# --- 1. TOP ACTION BAR ---
st.markdown("""
    <div class="action-bar">
        <div class="action-btn">STATE</div>
        <div class="action-btn">GRAPH</div>
        <div class="action-btn">AUDIT</div>
        <div class="action-btn">SAVE</div>
        <div class="action-btn">RESET</div>
    </div>
""", unsafe_allow_html=True)

# --- 2. GRID ARCHITECTURE (1:2:1) ---
col_left, col_mid, col_right = st.columns([1, 2, 1])

# --- LEFT COLUMN: The Memory Graph ---
with col_left:
    st.markdown('<div class="node-container">', unsafe_allow_html=True)
    st.markdown('<div class="node-pill">USER</div>', unsafe_allow_html=True)
    st.markdown('<div class="connector-line"></div>', unsafe_allow_html=True)
    st.markdown('<div class="node-pill" style="border-color:#818cf8;">SYNOVA</div>', unsafe_allow_html=True)
    st.markdown('<div class="connector-line"></div>', unsafe_allow_html=True)
    st.markdown('<div class="node-pill" style="border-color:#c084fc;">CONTEXT</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# --- MIDDLE COLUMN: Logic & Workflow ---
with col_mid:
    st.markdown("<h4 style='color:#38bdf8; margin-bottom:20px;'>Memory Graph Interface</h4>", unsafe_allow_html=True)
    
    # Sample Chat History
    st.markdown('<div class="chat-bubble user-msg"><b>User:</b> Order pizza</div>', unsafe_allow_html=True)
    st.markdown('<div class="chat-bubble ai-msg"><b>Synova:</b> What size?</div>', unsafe_allow_html=True)
    st.markdown('<div class="chat-bubble user-msg"><b>User:</b> Make it large</div>', unsafe_allow_html=True)
    
    # Chat Input Fixed at Bottom (automatically handled by st.chat_input)
    st.chat_input("Enter instruction for Synova...")

# --- RIGHT COLUMN: Functional Controls ---
with col_right:
    st.markdown("<h4 style='margin-bottom:15px;'>Engine Config</h4>", unsafe_allow_html=True)
    
    # Lambda Decay Slider
    decay_val = st.slider("Decay (λ)", 0.0, 1.0, 0.24)
    st.markdown("<p style='font-size:0.8rem; color:#94a3b8;'>Adaptive Forgetting: <span style='color:#38bdf8;'>Active</span></p>", unsafe_allow_html=True)
    
    # AI State Card
    st.markdown("""
        <div class="state-card">
            <p style='margin:0; font-size:0.9rem;'><b>Intent:</b> Active Analysis</p>
            <hr style='border-color:#334155; margin:10px 0;'>
            <p style='margin:0; font-size:0.9rem;'><b>Confidence:</b> 92%</p>
            <hr style='border-color:#334155; margin:10px 0;'>
            <p style='margin:0; font-size:0.9rem;'><b>Status:</b> Thinking...</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Footer Status
    st.markdown('<p class="status-active">🟢 Context Stable</p>', unsafe_allow_html=True)

# Custom Divider line
st.markdown("<hr style='border-color: #1e293b; margin-top:50px;'>", unsafe_allow_html=True)
st.markdown("<p style='text-align:center; color:#475569; font-size:0.7rem;'>SYNOVA WORKFLOW ENGINE v2.0</p>", unsafe_allow_html=True)
