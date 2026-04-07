import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from memory_graph import NeuroGraph # Importing your memory graph!

load_dotenv()

class NeuroLibrarian:
    def __init__(self):
        # Using Gemini specifically for fast JSON data extraction
        self.extractor = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
            model_kwargs={"response_mime_type": "application/json"} # FORCE JSON OUTPUT
        )
        self.brain = NeuroGraph()

    def extract_and_store(self, user_input: str):
        print(f"\n[Librarian] Analyzing: '{user_input}'")
        
        # The Prompt Engineering for the Extraction Agent
        prompt = """
        You are an advanced data extraction algorithm.
        Analyze the user's input and extract Knowledge Graph triples (Subject, Relation, Object).
        Assign a 'decay_rate' based on the type of information:
        - 0.0 : Permanent facts (User identity, core goals, system OS, names).
        - 0.05 : Task context (Current errors, projects, specific queries).
        - 0.5 : Temporary noise (Greetings, small talk, filler).

        Output ONLY a valid JSON array of objects with keys: "subject", "relation", "object", "decay_rate".
        If no facts are present, output an empty array [].
        
        User Input: "{input}"
        """
        
        formatted_prompt = PromptTemplate.from_template(prompt).format(input=user_input)
        
        try:
            # Get the JSON response from Gemini
            response = self.extractor.invoke(formatted_prompt)
            triples = json.loads(response.content)
            
            if not triples:
                print("[Librarian] No extractable facts found.")
                return

            # Feed the extracted data directly into your Memory Graph
            for fact in triples:
                self.brain.add_memory(
                    subject=fact.get("subject"),
                    relation=fact.get("relation"),
                    obj=fact.get("object"),
                    decay_rate=fact.get("decay_rate", 0.1)
                )
        except Exception as e:
            print(f"[Error] Failed to extract data: {e}")

# --- QUICK TEST ---
if __name__ == "__main__":
    agent = NeuroLibrarian()
    
    # Simulate a user talking to the AI
    chat_history = [
        "Hi, I'm Abhinav and I use Arch Linux with Hyprland.",
        "Can you help me? My audio driver is broken.",
        "Anyway, how are you doing today?"
    ]
    
    for message in chat_history:
        agent.extract_and_store(message)
        agent.brain.apply_temporal_decay() # Apply the math after every turn
        
    print("\n[FINAL ACTIVE CONTEXT FOR THE LLM]")
    print(agent.brain.get_active_context())
