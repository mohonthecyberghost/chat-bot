from flask import (
    Flask, request, jsonify, Response, stream_with_context
)
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_cors import CORS
from mongoengine import connect
from models.models import User, ChatMessage
import os
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io

# ——— Configuration —————————————————————————————————————————————————————————
load_dotenv()

# MongoDB
connect(
    db=os.getenv("MONGO_DB_NAME"),
    host=os.getenv("MONGO_URI")
)

# Flask app
app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "super-secret")
CORS(app)

# Extensions
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel(model_name="gemini-1.5-flash")

# Load your project docs once
project_docs = ""
with open("docs/project_docs.txt", "r", encoding="utf-8") as f:
    project_docs = f.read()


# ——— Helpers ———————————————————————————————————————————————————————————————

def load_chat_history():
    return [
        {"role": m.role, "parts": [m.content]}
        for m in ChatMessage.objects.order_by("timestamp")
    ]

def save_chat_history(history):
    ChatMessage.objects.delete()
    for item in history:
        ChatMessage(role=item["role"], content=item["parts"][0]).save()

def format_history(history):
    out = ""
    for msg in history:
        r = msg.get("role", "").capitalize()
        for part in msg.get("parts", []):
            txt = part if isinstance(part, str) else part.get("text", "")
            out += f"{r}: {txt}\n"
    return out

def image_from_file_storage(fs):
    """Load a PIL.Image from Flask FileStorage."""
    img_bytes = fs.read()
    return Image.open(io.BytesIO(img_bytes))


# ——— Routes ———————————————————————————————————————————————————————————————

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    u, p = data.get("username"), data.get("password")
    if not u or not p:
        return jsonify(error="Missing username or password"), 400

    if User.objects(username=u).first():
        return jsonify(error="User already exists"), 400

    hp = bcrypt.generate_password_hash(p).decode("utf-8")
    User(username=u, password=hp).save()
    return jsonify(message="User registered successfully")

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    u, p = data.get("username"), data.get("password")
    user = User.objects(username=u).first()
    if user and bcrypt.check_password_hash(user.password, p):
        tok = create_access_token(identity=u)
        return jsonify(token=tok)
    return jsonify(error="Invalid credentials"), 401

@app.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    # get text + optional image
    text = request.form.get("user_input", "")
    image_fs = request.files.get("image")

    # load history & user role
    history = load_chat_history()
    formatted = format_history(history)
    me = get_jwt_identity()
    u = User.objects(username=me).first()
    role = u.role if u else "user"

    # build context
    ctx = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted}

User Query:
{text}
"""

    # call Gemini
    if image_fs:
        img = image_from_file_storage(image_fs)
        resp = model.generate_content([ctx, img])
    else:
        resp = model.generate_content(ctx)

    # only managers persist history
    if role == "manager":
        history.append({"role": role, "parts": [text]})
        history.append({"role": "model", "parts": [resp.text]})
        save_chat_history(history)

    return jsonify(reply=resp.text, new_messages=history)

@app.route("/stream", methods=["POST"])
@jwt_required()
def stream():
    def gen():
        data = request.json
        text = data.get("chat", "")

        history = load_chat_history()
        formatted = format_history(history)
        me = get_jwt_identity()
        u = User.objects(username=me).first()
        role = u.role if u else "user"

        ctx = f"""
Project Documentation:
{project_docs}

Conversation History:
{formatted}

User Query:
{text}
"""

        # streaming only handles text—for image streaming you'd
        # need to buffer similarly as above
        response = model.generate_content(ctx, stream=True)
        full = ""
        for chunk in response:
            full += chunk.text
            yield chunk.text

        if role == "manager":
            history.append({"role": role, "parts": [text]})
            history.append({"role": "model", "parts": [full]})
            save_chat_history(history)

    return Response(stream_with_context(gen()), mimetype="text/event-stream")


# ——— Run App —————————————————————————————————————————————————————————————

if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 9000)), debug=True)
