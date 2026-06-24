import os
import re
import asyncio
from datetime import datetime
from typing import List, Optional

import httpx
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Smart Lamp Controller API - Lemari System")

origins = [
	"http://localhost",
	"http://localhost:3000",
	"http://localhost:3001"
]

app.add_middleware(
	CORSMiddleware,
	allow_origins=origins,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

SEND_PATH = "/send"
STATUS_PATH = "/status"


# ==============================
# ESP HELPERS
# ==============================
def _ensure_base_url(ip_address: str) -> str:
	if not ip_address:
		return ""
	ip = ip_address.strip()
	if ip.startswith("http://") or ip.startswith("https://"):
		return ip.rstrip("/")
	return f"http://{ip}"


async def _is_esp_online(ip_address: str) -> bool:
	base = _ensure_base_url(ip_address)
	if not base:
		return False
	candidates = [f"{base}{STATUS_PATH}", base, f"{base}/"]
	timeout = httpx.Timeout(connect=2.0, read=2.0, write=1.0, pool=2.0)
	async with httpx.AsyncClient(timeout=timeout) as client:
		for url in candidates:
			try:
				res = await client.get(url)
				if 200 <= res.status_code < 500:
					return True
			except Exception:
				continue
	return False


async def _esp_send_cmd(ip_address: str, cmd: str) -> tuple[bool, str]:
	base = _ensure_base_url(ip_address)
	if not base:
		return False, "not_configured"
	url = f"{base}{SEND_PATH}"
	try:
		timeout = httpx.Timeout(connect=5.0, read=2.0, write=1.0, pool=2.0)
		async with httpx.AsyncClient(timeout=timeout) as client:
			r = await client.post(url, json={"cmd": cmd})
			return r.status_code == 200, "ok"
	except Exception as e:
		print(f"ERROR kirim ke {base}:", e)
		return False, "offline"


async def _esp_get_status(ip_address: str):
	base = _ensure_base_url(ip_address)
	if not base:
		return None
	try:
		timeout = httpx.Timeout(connect=5.0, read=2.0, write=1.0, pool=2.0)
		async with httpx.AsyncClient(timeout=timeout) as client:
			for url in (f"{base}{STATUS_PATH}", base, f"{base}/"):
				try:
					r = await client.get(url)
					if r.status_code == 200:
						return r.json()
					if 200 <= r.status_code < 500:
						return {"reachable": True, "status_code": r.status_code}
				except Exception:
					continue
	except Exception:
		return None
	return None


# ==============================
# DATABASE HELPERS
# ==============================
def load_devices(db: Session) -> dict[int, models.Device]:
	devices = db.query(models.Device).filter(models.Device.is_active == True).all()
	return {d.cabinet_number: d for d in devices}


def generate_lamp_code(lamp_str: str, devices: dict[int, models.Device]):
	lamp_str = lamp_str.upper().strip()
	pattern = r"^(\d)(\d)([A-D])$"
	match = re.match(pattern, lamp_str)

	if not match:
		raise HTTPException(
			status_code=400,
			detail="Format harus seperti 11A, 21B, 58D (Lemari + Rak + Posisi A-D)"
		)

	lemari = int(match.group(1))
	rak = int(match.group(2))
	posisi = match.group(3)

	if rak < 1 or rak > 8:
		raise HTTPException(status_code=400, detail="Rak hanya ada 1 sampai 8")

	posisi_index = {"A": 0, "B": 1, "C": 2, "D": 3}

	# Lemari Putih terbagi 2 device: cabinet 1 (rak 1-4) dan cabinet 6 (rak 5-8)
	if lemari == 1 and rak > 4:
		device = devices.get(6)
		if not device:
			raise HTTPException(status_code=400, detail="Lemari Putih 2 belum dikonfigurasi")
		if device.address_start is None:
			raise HTTPException(status_code=400, detail=f"{device.name} belum memiliki konfigurasi alamat")
		lamp_code = device.address_start + ((rak - 5) * 4) + posisi_index[posisi]
	else:
		device = devices.get(lemari)
		if not device:
			raise HTTPException(status_code=400, detail=f"Lemari {lemari} belum dikonfigurasi")
		if device.address_start is None:
			raise HTTPException(status_code=400, detail=f"{device.name} belum memiliki konfigurasi alamat")
		lamp_code = device.address_start + ((rak - 1) * 4) + posisi_index[posisi]

	if device.address_end is not None and lamp_code > device.address_end:
		raise HTTPException(
			status_code=400,
			detail=f"Alamat lampu {lamp_code} melebihi batas {device.name} (max: {device.address_end})"
		)

	return lamp_code, device


# ==============================
# PYDANTIC MODELS
# ==============================
class LampControlRequest(BaseModel):
	lamp: str
	state: int
	activate_buzzer: Optional[bool] = False


class HistoryItemResponse(BaseModel):
	id: int
	lamp_number: int
	state: bool
	success: bool
	buzzer_activated: bool
	timestamp: datetime

	class Config:
		from_attributes = True


class DeviceCreate(BaseModel):
	cabinet_number: int
	name: str
	ip_address: Optional[str] = None
	is_active: Optional[bool] = True
	address_start: Optional[int] = None
	address_end: Optional[int] = None


class DeviceUpdate(BaseModel):
	name: Optional[str] = None
	ip_address: Optional[str] = None
	is_active: Optional[bool] = None
	address_start: Optional[int] = None
	address_end: Optional[int] = None


class DeviceResponse(BaseModel):
	id: int
	cabinet_number: int
	name: str
	ip_address: Optional[str] = None
	is_active: bool
	last_seen: Optional[datetime] = None
	address_start: Optional[int] = None
	address_end: Optional[int] = None

	class Config:
		from_attributes = True


# ==============================
# ENDPOINT: CONTROL LAMP
# ==============================
@app.post("/api/lampu")
async def control_lampu(
	request: LampControlRequest,
	db: Session = Depends(database.get_db)
):
	if request.state not in [0, 1]:
		raise HTTPException(status_code=400, detail="State harus 0 atau 1")

	devices = load_devices(db)
	if not devices:
		raise HTTPException(status_code=400, detail="Belum ada lemari yang dikonfigurasi")

	lamp_input = request.lamp.upper()
	lamp_code, device = generate_lamp_code(lamp_input, devices)

	cmd = f"{lamp_code}{request.state}"
	is_esp_online, esp_status = await _esp_send_cmd(device.ip_address, cmd)

	if esp_status == "not_configured":
		raise HTTPException(
			status_code=400,
			detail=f"{device.name} belum dikonfigurasi. Atur IP di menu Device."
		)

	if is_esp_online:
		device.last_seen = datetime.utcnow()
		db.commit()

	db_history = models.HistoryLampu(
		lamp_number=lamp_code,
		state=bool(request.state),
		success=is_esp_online,
		buzzer_activated=bool(request.activate_buzzer),
	)
	db.add(db_history)
	db.commit()
	db.refresh(db_history)

	return {
		"message": "Perintah diproses",
		"board": device.name,
		"configured": True,
		"esp_status": "online" if is_esp_online else "offline",
		"lamp_input": lamp_input,
		"lamp_mapped": lamp_code,
		"cmd_sent": cmd
	}


# ==============================
# ENDPOINT: HISTORY
# ==============================
@app.get("/api/history", response_model=List[HistoryItemResponse])
async def get_history(
	db: Session = Depends(database.get_db),
	skip: int = 0,
	limit: int = 100
):
	def db_query():
		return (
			db.query(models.HistoryLampu)
			.order_by(models.HistoryLampu.timestamp.desc())
			.offset(skip)
			.limit(limit)
			.all()
		)

	loop = asyncio.get_event_loop()
	return await loop.run_in_executor(None, db_query)


# ==============================
# ENDPOINT: DEVICE CRUD
# ==============================
@app.get("/api/devices", response_model=List[DeviceResponse])
async def get_devices(db: Session = Depends(database.get_db)):
	return db.query(models.Device).order_by(models.Device.cabinet_number).all()


@app.post("/api/devices", response_model=DeviceResponse)
async def create_device(device: DeviceCreate, db: Session = Depends(database.get_db)):
	existing = db.query(models.Device).filter(
		models.Device.cabinet_number == device.cabinet_number
	).first()
	if existing:
		raise HTTPException(
			status_code=400,
			detail=f"Lemari {device.cabinet_number} sudah ada"
		)
	db_device = models.Device(**device.model_dump())
	db.add(db_device)
	db.commit()
	db.refresh(db_device)
	return db_device


@app.put("/api/devices/{cabinet_number}", response_model=DeviceResponse)
async def update_device(
	cabinet_number: int,
	device: DeviceUpdate,
	db: Session = Depends(database.get_db)
):
	db_device = db.query(models.Device).filter(
		models.Device.cabinet_number == cabinet_number
	).first()
	if not db_device:
		raise HTTPException(status_code=404, detail=f"Lemari {cabinet_number} tidak ditemukan")
	update_data = device.model_dump(exclude_unset=True)
	for key, value in update_data.items():
		setattr(db_device, key, value)
	db.commit()
	db.refresh(db_device)
	return db_device


@app.delete("/api/devices/{cabinet_number}")
async def delete_device(cabinet_number: int, db: Session = Depends(database.get_db)):
	db_device = db.query(models.Device).filter(
		models.Device.cabinet_number == cabinet_number
	).first()
	if not db_device:
		raise HTTPException(status_code=404, detail=f"Lemari {cabinet_number} tidak ditemukan")
	db.delete(db_device)
	db.commit()
	return {"message": f"Lemari {cabinet_number} berhasil dihapus"}


# ==============================
# ENDPOINT: ESP STATUS
# ==============================
@app.get("/api/esp-status")
async def esp_status(db: Session = Depends(database.get_db)):
	devices = db.query(models.Device).filter(models.Device.is_active == True).all()
	if not devices:
		return {"message": "Belum ada lemari yang dikonfigurasi"}

	status = {}
	for dev in devices:
		online = await _is_esp_online(dev.ip_address) if dev.ip_address else False
		status[f"CABINET_{dev.cabinet_number}"] = {
			"name": dev.name,
			"cabinet_number": dev.cabinet_number,
			"online": online,
			"configured": bool(dev.ip_address),
			"config_message": "Online" if online else (
				"Offline" if dev.ip_address else "Belum diKonfigurasi"
			),
			"address_range": [dev.address_start, dev.address_end],
			"ip_address": dev.ip_address or "Not configured",
			"last_seen": dev.last_seen.isoformat() if dev.last_seen else None,
		}
	return status


# ==============================
# BACKGROUND HEARTBEAT
# ==============================
async def heartbeat_loop():
	while True:
		try:
			db = database.SessionLocal()
			devices = db.query(models.Device).filter(
				models.Device.is_active == True
			).all()
			for dev in devices:
				if dev.ip_address:
					is_online = await _is_esp_online(dev.ip_address)
					if is_online:
						dev.last_seen = datetime.utcnow()
			db.commit()
			db.close()
		except Exception as e:
			print(f"Heartbeat error: {e}")
		await asyncio.sleep(60)


@app.on_event("startup")
async def startup():
	asyncio.create_task(heartbeat_loop())
