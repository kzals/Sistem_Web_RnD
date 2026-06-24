import os
import sys

# Tambah parent directory ke path agar import bisa dari root project
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from backend.database import SessionLocal, engine, Base
from backend.models import Device

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

DEVICE_SEED = [
	{
		"cabinet_number": 1,
		"name": "Lemari Putih 1",
		"ip_address": (os.getenv("ESP_Lemari1_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 1,
		"address_end": 16,
	},
	{
		"cabinet_number": 2,
		"name": "Lemari Kuning",
		"ip_address": (os.getenv("ESP_Lemari2_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 17,
		"address_end": 48,
	},
	{
		"cabinet_number": 3,
		"name": "Lemari Biru",
		"ip_address": (os.getenv("ESP_Lemari3_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 49,
		"address_end": 80,
	},
	{
		"cabinet_number": 4,
		"name": "Lemari Merah",
		"ip_address": (os.getenv("ESP_Lemari4_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 81,
		"address_end": 112,
	},
	{
		"cabinet_number": 5,
		"name": "Lemari Hijau",
		"ip_address": (os.getenv("ESP_Lemari5_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 113,
		"address_end": 144,
	},
	{
		"cabinet_number": 6,
		"name": "Lemari Putih 2",
		"ip_address": (os.getenv("ESP_Lemari6_Base") or "").rstrip("/") or None,
		"is_active": True,
		"address_start": 145,
		"address_end": 160,
	},
]


def seed():
	Base.metadata.create_all(bind=engine)

	db = SessionLocal()
	try:
		existing = db.query(Device).count()
		if existing > 0:
			print(f"Tabel devices sudah berisi {existing} record. Lewati seed.")
			print("Gunakan DELETE /api/devices/{cabinet_number} atau hapus manual jika ingin mengulang.")
			return

		for data in DEVICE_SEED:
			device = Device(**data)
			db.add(device)
		db.commit()
		print(f"Berhasil menambahkan {len(DEVICE_SEED)} device ke database.\n")
		for d in DEVICE_SEED:
			status = "dengan IP" if d["ip_address"] else "tanpa IP"
			print(f"  - {d['name']} (cabinet {d['cabinet_number']}) {status}")
	finally:
		db.close()


if __name__ == "__main__":
	seed()
