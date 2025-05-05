from mongoengine import Document, StringField, DateTimeField, ListField
import datetime

class User(Document):
    username = StringField(unique=True, required=True)
    password = StringField(required=True)
    role = StringField(default="user")

    meta = {
        'collection': 'chat_users'
    }

class ChatMessage(Document):
    role = StringField(required=True)
    content = StringField(required=True)
    timestamp = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'collection': 'chat_messages'
    }


class ChatMessageFull(Document):
    role = StringField(required=True)
    content = StringField(required=True)
    timestamp = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        'collection': 'chat_messages_full'
    }
