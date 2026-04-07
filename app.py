import streamlit as st
import time

# Import your LangGraph app and the global agent from main.py
from main import app as neuro_engine
from main import system_agent 

# --- UI CONFIGURATION ---
st.set_page_config(page_title="NeuroTrace | PS-07", page_icon="🧠", layout="wide")

# Custom CSS to make it look "Hackathon Ready"
st.markdown("""
<style>
    .stChatInput { border-radius: 15px !important; }
    .metric-box { background-color: #1E3A8A; color: white; padding: 15px; border-radius: 10px; }
    .context-box { border-left: 4px solid #EA580C; padding-left: 10px; margin-bottom: 10px; background-color: #f3f4f6; color: #111;}
</style>
""", unsafe_allow_html=True)

# Initialize Session State for Chat History
if "messages" not in st.session_state:
    st.session_state.messages = []
if "last_reconstructed" not in st.session_state:
    st.session_state.last_reconstructed = ""

# --- DASHBOARD LAYOUT ---
st.title("🧠 NeuroTrace: Digital Hippocampus")
st.markdown("**Agentic Graph-Memory & Temporal Decay Architecture** | *Team SYNTAX WIZARDS*")
st.divider()

col_chat, col_metrics = st.columns([2, 1.2])

# ==========================================
# RIGHT COLUMN: THE COGNITIVE DASHBOARD
# ==========================================
with col_metrics:
    st.subheader("⚙️ System Telemetry")
    
    # 1. Turn Counter & Math Visualization
    turn_count = system_agent.brain.current_turn
    st.metric(label="Conversation Turn (t)", value=turn_count)
    
    st.markdown("### 🕸️ Active Knowledge Graph")
    st.caption("Nodes with Relevance (R) < 0.1 are archived to Cold Vector DB.")
    
    # 2. Visually display the Decay Math
    graph_data = system_agent.brain.graph.nodes(data=True)
    if not graph_data:
        st.info("Graph is empty. Start chatting to extract entities.")
    else:
        for node, data in graph_data:
            r_score = data.get('relevance', 0)
            lam = data.get('decay', 0)
            
            # Color code based on Relevance
            if lam == 0:
                status = "🔵 PERMANENT"
                progress = 1.0
            elif r_score > 0.5:
                status = "🟢 HOT"
                progress = r_score
            elif r_score > 0.1:
                status = "🟡 DECAYING"
                progress = r_score
            else:
                status = "🔴 ARCHIVING"
                progress = 0.0
                
            st.markdown(f"**{node}** [{status}] `λ = {lam}`")
            st.progress(progress, text=f"Relevance Score: {r_score:.3f}")
            
    st.divider()
    
    # 3. The "PS-07" Proof (Query Reconstruction)
    st.markdown("### 🌉 The Bridge (Audit Logs)")
    if st.session_state.last_reconstructed:
        st.markdown('<div class="context-box">', unsafe_allow_html=True)
        st.markdown(f"**Original:** `{st.session_state.messages[-2]['content']}`")
        st.markdown(f"**Reconstructed:** `{st.session_state.last_reconstructed}`")
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        st.caption("Waiting for context breaks to reconstruct...")

# ==========================================
# LEFT COLUMN: THE CHAT INTERFACE
# ==========================================
with col_chat:
    st.subheader("💬 Inference Interface")
    
    # Display Chat History
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Handle New User Input
    if user_input := st.chat_input("Ask NeuroTrace... (Try using ambiguous pronouns!)"):
        # Display User Message
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        # Run the LangGraph Orchestrator
        with st.chat_message("assistant"):
            with st.spinner("Auditing Context & Reconstructing..."):
                # Hit the backend engine
                inputs = {"user_input": user_input}
                result = neuro_engine.invoke(inputs)
                
                final_answer = result["final_response"]
                reconstructed = result["reconstructed_query"]
                
                # Update UI state
                st.session_state.last_reconstructed = reconstructed
                
                # Stream the response (simulated for UI effect)
                placeholder = st.empty()
                full_text = ""
                for chunk in final_answer.split():
                    full_text += chunk + " "
                    time.sleep(0.02)
                    placeholder.markdown(full_text + "▌")
                placeholder.markdown(final_answer)
                
        # Save Assistant Message
        st.session_state.messages.append({"role": "assistant", "content": final_answer})
        
        # Force the right column to update the math metrics immediately
        st.rerun()
