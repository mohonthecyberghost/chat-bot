# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Session, ChatMessage


# Load environment variables from a .env file located in the same directory.
load_dotenv()

# Initialize a Flask application.
app = Flask(__name__)

# Apply CORS to the Flask app.
CORS(app)

# Configure the Google Generative AI's Google API key.
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Initialize the generative model.
model = genai.GenerativeModel(model_name="gemini-1.5-flash")



# Load project documentation
def load_docs():
    with open("docs/project_docs.txt", "r", encoding="utf-8") as f:
        return f.read()

project_docs = load_docs()

# Restore chat history from file (if exists)
def load_chat_history_json():
    if os.path.exists("docs/chat_history.json"):
        with open("docs/chat_history.json", "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# Save chat history
def save_chat_history_json(history):
    with open("docs/chat_history.json", "w", encoding="utf-8") as f:
        json.dump(history, f)

def load_chat_history():
    session = Session()
    messages = session.query(ChatMessage).order_by(ChatMessage.timestamp).all()
    session.close()
    return [{"role": m.role, "parts": [m.content]} for m in messages]

def save_chat_history(history):
    session = Session()
    session.query(ChatMessage).delete()  # Clear old history if you want full overwrite
    for item in history:
        msg = ChatMessage(role=item["role"], content=item["parts"][0])
        session.add(msg)
    session.commit()
    session.close()

# Serialize Gemini messages for JSON
def serialize_message(msg):
    return {
        "role": msg.role,
        "parts": [str(part) for part in msg.parts]
    }

# Convert history to readable string for prompt context
def format_history(history):
    text = ""
    for msg in history:
        role = msg.get("role", "unknown").capitalize()
        parts = msg.get("parts", [])
        for part in parts:
            content = part if isinstance(part, str) else part.get("text", "")
            text += f"{role}: {content}\n"
    return text

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_input = data.get("user_input")

    if not user_input:
        return jsonify({"error": "Missing user_input"}), 400

    history = load_chat_history()
    formatted_history = format_history(history)

    # Create combined context
    combined_context = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted_history}

User Query:
{user_input}
"""

    # Send combined context as a single message
    response = model.generate_content(combined_context)

    # Append current interaction to history
    history.append({"role": "user", "parts": [user_input]})
    history.append({"role": "model", "parts": [response.text]})
    save_chat_history(history)

    return jsonify({
        "reply": response.text,
        "new_messages": history
    })

@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(load_chat_history())

@app.route("/stream", methods=["POST"])
def stream():
    def generate():
        data = request.json
        msg = data.get('chat', '')

        history = load_chat_history()
        formatted_history = format_history(history)

        combined_context = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted_history}

User Query:
{msg}
"""

        response = model.generate_content(combined_context, stream=True)

        collected_response = ""
        for chunk in response:
            collected_response += chunk.text
            yield chunk.text

        # Append to history after full stream
        history.append({"role": "user", "parts": [msg]})
        history.append({"role": "model", "parts": [collected_response]})
        save_chat_history(history)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")

if __name__ == '__main__':
    app.run(port=os.getenv("PORT"))
