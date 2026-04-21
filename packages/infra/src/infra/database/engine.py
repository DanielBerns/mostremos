from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from infra.database.schema import Base
from core.config import APP_INSTANCE

# Isolate databases based on the instance parameter
DB_PATH = f"sqlite:///crowdsource_{APP_INSTANCE}.db"

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})

# Enable WAL mode for concurrent reads/writes
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
