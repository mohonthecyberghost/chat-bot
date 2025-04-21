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

from flask import Flask, request, Response, stream_with_context, jsonify, session
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Session, ChatMessage, User

# Load environment variables from a .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Setup JWT
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "super-secret")
jwt = JWTManager(app)

# Setup Bcrypt
bcrypt = Bcrypt(app)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel(model_name="gemini-1.5-flash")

# Load docs
project_docs = ""
def load_docs():
    global project_docs
    with open("docs/project_docs.txt", "r", encoding="utf-8") as f:
        project_docs = f.read()
load_docs()

# Chat history helpers

def load_chat_history():
    session = Session()
    messages = session.query(ChatMessage).order_by(ChatMessage.timestamp).all()
    session.close()
    return [{"role": m.role, "parts": [m.content]} for m in messages]

def save_chat_history(history):
    session = Session()
    session.query(ChatMessage).delete()
    for item in history:
        msg = ChatMessage(role=item["role"], content=item["parts"][0])
        session.add(msg)
    session.commit()
    session.close()

def format_history(history):
    text = ""
    for msg in history:
        role = msg.get("role", "unknown").capitalize()
        parts = msg.get("parts", [])
        for part in parts:
            content = part if isinstance(part, str) else part.get("text", "")
            text += f"{role}: {content}\n"
    return text

# Auth endpoints
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    session_db = Session()
    existing_user = session_db.query(User).filter_by(username=username).first()

    if existing_user:
        session_db.close()
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password=hashed_pw)
    session_db.add(new_user)
    session_db.commit()
    session_db.close()

    return jsonify({"message": "User registered successfully"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    session_db = Session()
    user = session_db.query(User).filter_by(username=username).first()
    session_db.close()

    if user and bcrypt.check_password_hash(user.password, password):
        token = create_access_token(identity=username)
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Invalid credentials"}), 401

# Chat endpoint
@app.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    data = request.json
    user_input = data.get("user_input")

    if not user_input:
        return jsonify({"error": "Missing user_input"}), 400

    history = load_chat_history()
    formatted_history = format_history(history)

    # Step 1: Get the username from the JWT
    current_user = get_jwt_identity()

    # Step 2: Get user role from DB
    session_db = Session()
    user = session_db.query(User).filter_by(username=current_user).first()
    user_role = user.role if user else "user"
    session_db.close()

    combined_context = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted_history}

User Query:
{user_input}
"""

    response = model.generate_content(combined_context)

    if user_role=="manager":
        history.append({"role": user_role, "parts": [user_input]})
        history.append({"role": "model", "parts": [response.text]})
        save_chat_history(history)


    return jsonify({
        "reply": response.text,
        "new_messages": history
    })

@app.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    return jsonify(load_chat_history())

@app.route("/stream", methods=["POST"])
@jwt_required()
def stream():
    def generate():
        data = request.json
        msg = data.get('chat', '')

        history = load_chat_history()
        formatted_history = format_history(history)


        # Step 1: Get the username from the JWT
        current_user = get_jwt_identity()

        # Step 2: Get user role from DB
        session_db = Session()
        user = session_db.query(User).filter_by(username=current_user).first()
        user_role = user.role if user else "user"
        session_db.close()

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

        if user_role=="manager":
            history.append({"role": user_role, "parts": [msg]})
            history.append({"role": "model", "parts": [collected_response]})
            save_chat_history(history)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")

if __name__ == '__main__':
    app.run(port=os.getenv("PORT"))