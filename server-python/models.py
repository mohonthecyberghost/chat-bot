from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime

Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    id = Column(Integer, primary_key=True)
    role = Column(String(10))         # 'user' or 'model'
    content = Column(Text)            # message text
    timestamp = Column(DateTime, default=datetime.utcnow)  # 🕒 timestamp added

engine = create_engine('sqlite:///db/chat_history.db', echo=False)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
