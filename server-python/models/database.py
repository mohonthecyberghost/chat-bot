from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB URI (from Compass or .env)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)
db = client["chatbot-cps"]  # Database name

# Collections
users_collection = db["chat_users"]
messages_collection = db["chat_messages"]
messages_collection_full = db["chat_messages_full"]
