from mongoengine import Document, StringField, DateTimeField, ListField
from datetime import datetime

# Define the ChatMessage model
class ChatMessage(Document):
    role = StringField(required=True)
    content = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'chat_messages'  # MongoDB collection name
    }

class User(Document):
    username = StringField(required=True, unique=True)
    password = StringField(required=True)
    role = StringField(default="user")

    meta = {
        'collection': 'chat_users'  # MongoDB collection name
    }
