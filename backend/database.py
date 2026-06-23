import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Menentukan path ke file .env di folder backend (same directory)
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

# Tambahkan pengecekan ini untuk mencegah crash misterius
if DATABASE_URL is None:
	raise ValueError("ERROR: DATABASE_URL tidak ditemukan. Pastikan file .env sudah ada.")

# Membuat engine database
engine = create_engine(DATABASE_URL)

# Membuat session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class untuk model SQLAlchemy
Base = declarative_base()

# Dependency untuk mendapatkan session database di setiap request
def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
