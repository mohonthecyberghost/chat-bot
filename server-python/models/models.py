from sqlalchemy import Column, Integer, String, DateTime, func
from .database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    role = Column(String)
    content = Column(String)
    timestamp = Column(DateTime, default=func.now())

class User(Base):
    __tablename__ = "chat_users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="user")
