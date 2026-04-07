import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Load the secret key
load_dotenv()

# 2. Initialize the Gemini Engine
# 'gemini-2.5-flash' is the best choice for hackathons—it is blindingly fast.
# If you need insanely complex logic later, you can swap to 'gemini-pro'.
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0, # Keep at 0 for logical, deterministic outputs
    max_retries=2
)

# 3. Test the connection
print("Sending ping to Gemini API...")
response = llm.invoke("You are the core logic engine of NeuroTrace. Respond with 'NeuroTrace Systems Online' if you receive this.")

print(f"Response: {response.content}")
