from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from mongoengine import connect
# from models import User, ChatMessage  # Ensure correct imports from models.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB using mongoengine
connect(os.getenv("MONGO_DB_NAME"), host=os.getenv("MONGO_URI"))

# Initialize Flask app
app = Flask(__name__)

# Setup JWT
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "super-secret")
jwt = JWTManager(app)

# Setup Bcrypt
bcrypt = Bcrypt(app)

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    existing_user = User.objects(username=username).first()

    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password=hashed_pw)
    new_user.save()

    return jsonify({"message": "User registered successfully"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.objects(username=username).first()

    if user and bcrypt.check_password_hash(user.password, password):
        token = create_access_token(identity=username)
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    data = request.json
    user_input = data.get("user_input")

    if not user_input:
        return jsonify({"error": "Missing user_input"}), 400

    history = load_chat_history()
    formatted_history = format_history(history)

    current_user = get_jwt_identity()

    user = User.objects(username=current_user).first()
    user_role = user.role if user else "user"

    combined_context = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted_history}

User Query:
{user_input}
"""

    response = model.generate_content(combined_context)

    if user_role == "manager":
        history.append({"role": user_role, "parts": [user_input]})
        history.append({"role": "model", "parts": [response.text]})
        save_chat_history(history)

    return jsonify({
        "reply": response.text,
        "new_messages": history
    })

def load_chat_history():
    history = []
    messages = ChatMessage.objects().all()  # Load chat history from MongoDB
    for msg in messages:
        history.append({"role": msg.role, "parts": [msg.content]})
    return history

def save_chat_history(history):
    ChatMessage.objects.delete()  # Delete all existing chat messages
    for item in history:
        msg = ChatMessage(role=item["role"], content=item["parts"][0])
        msg.save()

def format_history(history):
    text = ""
    for msg in history:
        role = msg.get("role", "unknown").capitalize()
        parts = msg.get("parts", [])
        for part in parts:
            content = part if isinstance(part, str) else part.get("text", "")
            text += f"{role}: {content}\n"
    return text

if __name__ == '__main__':
    app.run(port=os.getenv("PORT"))
