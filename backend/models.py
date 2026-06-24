from sqlalchemy import Column, Integer, Boolean, String, TIMESTAMP, DateTime
from sqlalchemy.sql import func
from .database import Base

class Device(Base):
	__tablename__ = "devices"

	id = Column(Integer, primary_key=True, index=True)
	cabinet_number = Column(Integer, unique=True, nullable=False, index=True)
	name = Column(String, nullable=False)
	ip_address = Column(String, nullable=True)
	is_active = Column(Boolean, default=True)
	last_seen = Column(DateTime, nullable=True)
	address_start = Column(Integer, nullable=True)
	address_end = Column(Integer, nullable=True)


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
