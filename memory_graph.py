import networkx as nx
import math
import matplotlib.pyplot as plt

class NeuroGraph:
    def __init__(self):
        # Initialize a Directed Graph (Nodes connected by directional arrows)
        self.graph = nx.DiGraph()
        self.current_turn = 0

    def add_memory(self, subject: str, relation: str, obj: str, decay_rate: float = 0.05):
        """
        Adds a Subject-Predicate-Object triple to the graph.
        Decay Rates:
        0.0 = Permanent (e.g., User Name, OS)
        0.05 = Task context (e.g., current coding problem)
        0.5 = Noise/Small talk
        """
        # Add or update the Subject node
        if not self.graph.has_node(subject):
            self.graph.add_node(subject, relevance=1.0, decay=decay_rate, last_updated=self.current_turn)
        else:
            self.graph.nodes[subject]['relevance'] = 1.0 # Boost back to 100% on mention
            self.graph.nodes[subject]['last_updated'] = self.current_turn

        # Add or update the Object node
        if not self.graph.has_node(obj):
            self.graph.add_node(obj, relevance=1.0, decay=decay_rate, last_updated=self.current_turn)
        else:
            self.graph.nodes[obj]['relevance'] = 1.0
            self.graph.nodes[obj]['last_updated'] = self.current_turn

        # Create the relationship edge
        self.graph.add_edge(subject, obj, label=relation)
        print(f"[+] Memory Stored: {subject} -> {relation} -> {obj}")

    def apply_temporal_decay(self):
        """
        Applies the math: R_t = R_0 * e^(-lambda * t) to all nodes.
        If relevance drops below 0.1, the node is 'forgotten' (archived).
        """
        self.current_turn += 1
        nodes_to_archive = []

        print(f"\n--- Turn {self.current_turn}: Applying Active Forgetting ---")
        
        for node, data in self.graph.nodes(data=True):
            r_0 = 1.0 # Max relevance
            lam = data['decay']
            t = self.current_turn - data['last_updated']
            
            # The Decay Math
            current_relevance = r_0 * math.exp(-lam * t)
            data['relevance'] = current_relevance
            
            print(f"Node: {node} | Relevance: {current_relevance:.2f}")

            if current_relevance < 0.1:
                nodes_to_archive.append(node)

        # Garbage Collection (The "Forgetting" mechanism)
        for node in nodes_to_archive:
            print(f"[-] Archiving Node to Vector DB: {node} (Relevance too low)")
            self.graph.remove_node(node)

    def get_active_context(self):
        """Retrieves only the currently relevant facts for the LLM prompt."""
        context = []
        for u, v, data in self.graph.edges(data=True):
            context.append(f"{u} {data['label']} {v}")
        return "\n".join(context)

# --- QUICK TEST ---
if __name__ == "__main__":
    brain = NeuroGraph()
    
    # Turn 1: Permanent Context
    brain.add_memory("User", "uses", "Arch Linux", decay_rate=0.0) 
    
    # Turn 2: Task Context
    brain.add_memory("Arch Linux", "has issue with", "Hyprland Config", decay_rate=0.1)
    
    # Turn 3: Small Talk (Fast decay)
    brain.add_memory("User", "ate", "Pizza", decay_rate=0.8)
    
    # Simulate the conversation moving forward 3 turns
    brain.apply_temporal_decay()
    brain.apply_temporal_decay()
    brain.apply_temporal_decay()
    
    print("\n[ACTIVE CONTEXT TO SEND TO GEMINI]")
    print(brain.get_active_context())
