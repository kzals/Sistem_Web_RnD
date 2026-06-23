from sqlalchemy import Column, Integer, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from .database import Base

class HistoryLampu(Base):
	"""
	Model SQLAlchemy untuk tabel history_lampu.
	"""
	__tablename__ = "history_lampu"

	id = Column(Integer, primary_key=True, index=True)
	lamp_number = Column(Integer, nullable=False)
	state = Column(Boolean, nullable=False)
	success = Column(Boolean, nullable=False)
	buzzer_activated = Column(Boolean, nullable=False, server_default='false')
	timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())
