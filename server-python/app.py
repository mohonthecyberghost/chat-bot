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
from models.models import User, ChatMessage,ChatMessageFull
import os
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import io
from flask import request
from PyPDF2 import PdfReader

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

def load_chat_history(history_type="normal"):
    model = ChatMessageFull if history_type == "full" else ChatMessage
    return [
        {"role": m.role, "parts": [m.content]}
        for m in model.objects.order_by("timestamp")
    ]

def save_chat_history(history, history_type="normal"):
    model = ChatMessageFull if history_type == "full" else ChatMessage
    model.objects.all().delete()
    for item in history:
        model(role=item["role"], content=item["parts"][0]).save()

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

def extract_text_from_pdf(pdf_file):
    try:
        # Read the PDF
        reader = PdfReader(pdf_file)
        pdf_text = "\n".join([page.extract_text() or "" for page in reader.pages])
    except Exception as e:
        pdf_text = f"[Error reading PDF: {str(e)}]"

    return pdf_text

def summarize_pdf_content(pdf_text):
    summary_prompt = f"Summarize the following document in detail:\n\n{pdf_text}"
    result = model.generate_content(summary_prompt)
    return result.text


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
    text = request.form.get("user_input", "")
    image_fs = request.files.get("image")
    pdf_fs = request.files.get("pdf")

    # Use normal history type for summary responses
    history_type = "normal"

    pdf_text = "No PDF content extracted."
    pdf_summary = "No PDF summary extracted."

    if pdf_fs:
        print("PDF received:", pdf_fs.filename)
        pdf_text = extract_text_from_pdf(pdf_fs)
        pdf_summary = summarize_pdf_content(pdf_text)

    history = load_chat_history(history_type)
    formatted = format_history(history)
    me = get_jwt_identity()
    u = User.objects(username=me).first()
    role = u.role if u else "user"

    #history_full = ""
    history_full = load_chat_history("full")

    ctx = f"""
Project Documentation:
{project_docs}


{"PDF Contents:"+pdf_summary if pdf_fs else ""}

Conversation History:
{formatted}

User Query:
{text}
"""

    if image_fs:
        img = image_from_file_storage(image_fs)
        resp = model.generate_content([ctx, img])
    else:
        resp = model.generate_content(ctx)

   
    
    if role == "manager":
        # Save summary to chat_messages (normal history)
        if text:
            history.append({"role": role, "parts": [text]})
            history.append({"role": "model", "parts": [resp.text]})

            history_full.append({"role": role, "parts": [text]})
            history_full.append({"role": "model", "parts": [resp.text]})


            save_chat_history(history, "normal")
            save_chat_history(history_full, "full")

            
        if pdf_fs:
            

            history.append({"role": role, "parts": [f"📄 Uploaded PDF Summary:\n{pdf_summary}"]})
            save_chat_history(history, "normal")

            history_full.append({"role": role, "parts": [f"📄 Uploaded PDF Contents:\n{pdf_text}"]})
            save_chat_history(history_full, "full")

  
        

        

    return jsonify(reply=resp.text, new_messages=history)


@app.route("/stream", methods=["POST"])
@jwt_required()
def stream():
    def generate():
        text = request.form.get("user_input", "")
        image_fs = request.files.get("image")
        pdf_fs = request.files.get("pdf")
        pdf_text = ""
        pdf_summary = ""

        if pdf_fs:
            print("PDF received in stream:", pdf_fs.filename)
            pdf_text = extract_text_from_pdf(pdf_fs)

        history = load_chat_history()
        formatted = format_history(history)
        me = get_jwt_identity()
        u = User.objects(username=me).first()
        role = u.role if u else "user"

        ctx = f"""
Project Documentation:
{project_docs}

PDF Summary:
{pdf_summary}

Conversation History:
{formatted}

User Query:
{text}
"""

        try:
            if image_fs:
                img = image_from_file_storage(image_fs)
                stream = model.generate_content([ctx, img], stream=True)
            else:
                stream = model.generate_content(ctx, stream=True)

            full = ""
            for chunk in stream:
                full += chunk.text
                yield chunk.text

        except Exception as e:
            yield f"[Stream error: {str(e)}]"

        if role == "manager":
            # Save chat history regardless of role
            if text:
                history.append({"role": role, "parts": [text]})
            if pdf_text:
                history.append({"role": role, "parts": [f"📄 Uploaded PDF:\n{pdf_summary}"]})
            history.append({"role": "model", "parts": [full]})
            save_chat_history(history)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")

@app.route("/get_full_response", methods=["POST"])
@jwt_required()
def get_full_response():
    try:
        # Get the message index and user input from the request
        data = request.get_json()
        message_index = data.get("message_index", 0)
        user_input = data.get("user_input", "")
        
        # Load full history
        full_history = load_chat_history("full")
        
        # Print debug info
        print(f"Requested message index: {message_index}, History length: {len(full_history)}")
        
        # Validate message index - use the last message if out of bounds
        if not full_history:
            return jsonify(error="No chat history found"), 404
            
        if message_index < 0 or message_index >= len(full_history):
            print(f"Invalid index {message_index}, using most recent message instead")
            # Use the most recent model message instead of returning an error
            for i in range(len(full_history) - 1, -1, -1):
                if full_history[i]["role"] == "model":
                    message_index = i
                    break
            else:
                return jsonify(error="No model messages found in history"), 404
        
        # Get the message content
        message = full_history[message_index]
        print(f"Using message at index {message_index}, role: {message['role']}")
        
        # Format the context with user's query
        ctx = f"""
User Query:
{user_input}

Project Documentation:
{project_docs}

Conversation History:
{format_history(full_history)}
"""
        
        # Generate full response with context
        resp = model.generate_content(ctx)
        
        # Return the full response
        return jsonify(full_reply=resp.text)
            
    except Exception as e:
        print(f"Error in get_full_response: {str(e)}")
        return jsonify(error=str(e)), 500
# ——— Run App —————————————————————————————————————————————————————————————

if __name__ == "__main__":
    app.run(host="10.88.231.7",port=int(os.getenv("PORT", 8000)), debug=True)
