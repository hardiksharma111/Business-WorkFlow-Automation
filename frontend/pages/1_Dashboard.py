
import streamlit as st

# --- 1. Global Page Configuration ---
st.set_page_config(
    page_title="Synova | Syntax Wizard",
    page_icon="🧙‍♂️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# --- 2. Advanced CSS (Deep Midnight Theme & Internal Chat Positioning) ---
st.markdown("""
    <style>
    /* Global Cleanup */
    header, footer, [data-testid="stSidebarNav"] {visibility: hidden !important;}
    [data-testid="stVerticalBlock"] > div:empty { display: none !important; }
    
    .stApp {
        background-color: #0b1120;
        color: #e2e8f0;
    }

    /* Top Header Bar */
    .logo-text {
        font-size: 24px;
        font-weight: 800;
        color: #ffffff;
    }
    .cyan-text { color: #22d3ee; text-shadow: 0 0 10px rgba(34, 211, 238, 0.5); }

    /* Pill Buttons */
    .stButton > button {
        border-radius: 20px !important;
        border: 1px solid #22d3ee !important;
        background-color: transparent !important;
        color: white !important;
        box-shadow: 0 0 5px rgba(34, 211, 238, 0.2);
    }
    /* Reset Button (Red Glow) */
    div[data-testid="column"]:nth-child(5) button {
        border: 1px solid #ef4444 !important;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
    }

    /* Panels */
    .wizard-panel {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid #1e293b;
        padding: 20px;
        border-radius: 15px;
        margin-bottom: 20px;
    }

    /* Chat Container Fix: Isse input box panel ke andar hi rahega */
    .chat-container {
        height: 500px;
        overflow-y: auto;
        padding-right: 10px;
        display: flex;
        flex-direction: column;
    }

    /* Knowledge Graph Styling */
    .graph-node {
        width: 100px;
        margin: 0 auto;
        padding: 10px;
        text-align: center;
        border: 1px solid #22d3ee;
        border-radius: 12px;
        background: rgba(34, 211, 238, 0.05);
        box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
        font-weight: bold;
    }
    .graph-connector {
        width: 2px; height: 15px; background: #22d3ee; margin: 0 auto;
    }

    /* Chat Bubble styling */
    .bubble {
        padding: 12px;
        border-radius: 10px;
        margin-bottom: 10px;
        font-family: monospace;
    }
    .sys-msg { border-left: 4px solid #22d3ee; background: rgba(34, 211, 238, 0.05); }
    .wait-msg { border: 1px solid #334155; color: #64748b; }

    /* Red Slider Handles */
    .stSlider [data-baseweb="slider"] [role="slider"] {
        background-color: #ef4444 !important;
    }
    </style>
    """, unsafe_allow_html=True)

# --- 3. Top Header ---
h_left, h_right = st.columns([1.2, 1])
with h_left:
    st.markdown('<div class="logo-text"><span class="cyan-text">Synova</span> | Syntax Wizard</div>', unsafe_allow_html=True)

with h_right:
    btn_cols = st.columns(5)
    btn_cols[0].button("[State]")
    btn_cols[1].button("[Graph]")
    btn_cols[2].button("[Audit]")
    btn_cols[3].button("[Save]")
    btn_cols[4].button("[Reset]")

st.markdown("---")

# --- 4. Main Layout ---
col_chat, col_side = st.columns([2.2, 1], gap="large")

with col_chat:
    st.markdown('<div class="wizard-panel">', unsafe_allow_html=True)
    st.subheader("Wizard Chat Interface")
    
    # Is container mein chat messages aayenge
    chat_placeholder = st.container(height=400, border=False)
    with chat_placeholder:
        st.markdown('<div class="bubble sys-msg"><b>System Check?</b><br>Encryption verified. Ready for command.</div>', unsafe_allow_html=True)
        st.markdown('<div class="bubble wait-msg">Waiting for backend connection...</div>', unsafe_allow_html=True)
    
    # Input box ko specifically isi column ke niche rakhne ke liye:
    st.chat_input("Enter your command...")
    st.markdown('</div>', unsafe_allow_html=True)

with col_side:
    # Top: Knowledge Graph
    st.markdown('<div class="wizard-panel">', unsafe_allow_html=True)
    st.markdown("<h4 style='text-align:center;'>Knowledge Graph</h4>", unsafe_allow_html=True)
    st.markdown('<div class="graph-node">[USER]</div>', unsafe_allow_html=True)
    st.markdown('<div class="graph-connector"></div>', unsafe_allow_html=True)
    st.markdown('<div class="graph-node">[CTX]</div>', unsafe_allow_html=True)
    st.markdown('<div class="graph-connector"></div>', unsafe_allow_html=True)
    st.markdown('<div class="graph-node">[PROJ]</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    # Bottom: Memory Control
    st.markdown('<div class="wizard-panel">', unsafe_allow_html=True)
    st.markdown("<h4>Memory Control</h4>", unsafe_allow_html=True)
    st.slider("Daily", 0, 100, 30)
    st.slider("Fact", 0, 100, 34)
    st.slider("Project", 0, 100, 24)
    
    st.markdown("<hr style='border-color:#1e293b'>", unsafe_allow_html=True)
    st.markdown("""
        <p style='color:#94a3b8; font-size:0.9rem;'>Intent: Active Analysis<br>
        Confidence: <span style='color:#22d3ee'>92%</span><br>
        Status: <span style='color:#fbbf24'>Thinking...</span></p>
        <p style='color:#10b981; font-weight:bold;'>🟢 Context Stable</p>
    """, unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
