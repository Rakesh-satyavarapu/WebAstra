# model.py
import sys
import pickle
import google.generativeai as genai

# Configure Gemini AI with API Key
genai.configure(api_key="AIzaSyAU0UdxiXWbkE8AdXR_1fN5MxCylshD_J0")

# Use the Gemini model
model = genai.GenerativeModel("models/gemini-1.5-pro-latest")

# Load previous responses from pickle file (if exists)
try:
    with open("gemini_responses.pkl", "rb") as f:
        cached_responses = pickle.load(f)  # Load cached responses
except (FileNotFoundError, EOFError):
    cached_responses = {}  # Initialize empty dictionary if no cache exists

# Get user input from the command line
user_input = sys.argv[1]

# Check if the response is already cached
if user_input in cached_responses:
    response_text = cached_responses[user_input]
    print(f"(Cached Response) {response_text}")
else:
    # Generate new response from Gemini AI
    response = model.generate_content(user_input)
    response_text = response.text

    # Cache the new response
    cached_responses[user_input] = response_text
    with open("gemini_responses.pkl", "wb") as f:
        pickle.dump(cached_responses, f)  # Save updated cache

    print(f"(New Response) {response_text}")