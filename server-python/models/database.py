from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine("sqlite:///db/chatbot.db")
Base = declarative_base()
Session = sessionmaker(bind=engine)
