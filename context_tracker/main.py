import os
from typing import TypedDict
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# Import your custom modules!
from librarian import NeuroLibrarian

load_dotenv()

# 1. Define the State (This fulfills the "State Tracking" rubric)
class AgentState(TypedDict):
    user_input: str
    active_context: str
    reconstructed_query: str
    final_response: str

# 2. Initialize the Global Components
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
system_agent = NeuroLibrarian() # This holds your Graph and Gemini Extractor

# --- NODE 1: The Auditor & Librarian ---
def process_memory_node(state: AgentState):
    print("\n[Node 1] Extracting Data & Updating Graph...")
    user_input = state["user_input"]
    
    # Extract facts and apply the Temporal Decay math
    system_agent.extract_and_store(user_input)
    system_agent.brain.apply_temporal_decay()
    
    # Get the surviving context to pass to the next steps
    active_context = system_agent.brain.get_active_context()
    
    return {"active_context": active_context}

# --- NODE 2: The Bridge (Context Reconstruction) ---
def reconstruct_query_node(state: AgentState):
    print("[Node 2] Checking for Context Breaks & Reconstructing...")
    user_input = state["user_input"]
    context = state["active_context"]
    
    prompt = """
    You are the 'Bridge' agent. Look at the User's Input and the Active Graph Context.
    If the user uses ambiguous pronouns (it, that, he, she) or refers to a past topic, 
    rewrite their query to be explicitly clear using the Graph Context.
    If the query is already clear, output it exactly as is.
    
    Active Graph Context:
    {context}
    
    User Input: {input}
    
    Output ONLY the reconstructed query string.
    """
    formatted_prompt = PromptTemplate.from_template(prompt).format(context=context, input=user_input)
    response = llm.invoke(formatted_prompt)
    
    reconstructed = response.content.strip()
    print(f"         -> Reconstructed: '{reconstructed}'")
    return {"reconstructed_query": reconstructed}

# --- NODE 3: Generation ---
def generate_response_node(state: AgentState):
    print("[Node 3] Generating Final Output...")
    
    # We feed the LLM the RECONSTRUCTED query and the ACTIVE graph context
    prompt = f"""
    You are NeuroTrace, an advanced personal AI.
    Answer the user based ONLY on the Active Context provided below. 
    If the answer isn't in the context or general knowledge, ask for clarification.
    
    Active Context:
    {state['active_context']}
    
    User Query: {state['reconstructed_query']}
    """
    
    response = llm.invoke(prompt)
    return {"final_response": response.content}

# --- BUILD THE GRAPH ENGINE ---
workflow = StateGraph(AgentState)

workflow.add_node("process_memory", process_memory_node)
workflow.add_node("reconstruct", reconstruct_query_node)
workflow.add_node("generate", generate_response_node)

# Define the logical flow
workflow.set_entry_point("process_memory")
workflow.add_edge("process_memory", "reconstruct")
workflow.add_edge("reconstruct", "generate")
workflow.add_edge("generate", END)

# Compile!
app = workflow.compile()


# --- TERMINAL TESTING LOOP ---
if __name__ == "__main__":
    print("========================================")
    print("    NEUROTRACE CORE SYSTEMS ONLINE      ")
    print("========================================")
    
    while True:
        user_text = input("\nYou: ")
        if user_text.lower() in ["quit", "exit"]:
            break
            
        inputs = {"user_input": user_text}
        result = app.invoke(inputs)
        
        print(f"\nNeuroTrace: {result['final_response']}")
