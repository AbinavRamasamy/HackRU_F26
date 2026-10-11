import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables
load_dotenv()

# Check for TigerData / PostgreSQL connection string
raw_db_url = os.getenv("DATABASE_URL") or os.getenv("TIGERDATA_DATABASE_URL", "").strip()

if raw_db_url:
    # SQLAlchemy 2.0 requires 'postgresql://' instead of legacy 'postgres://'
    if raw_db_url.startswith("postgres://"):
        db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        db_url = raw_db_url
    
    print(f"🐘 [Database] Connecting to PostgreSQL / TigerData...")
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
else:
    # Fallback to local zero-config SQLite
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app.db"))
    db_url = f"sqlite:///{sqlite_path}"
    print(f"🗄️ [Database] DATABASE_URL not set. Falling back to local SQLite at {sqlite_path}")
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
