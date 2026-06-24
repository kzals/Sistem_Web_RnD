"""
Test script untuk memverifikasi backend Smart Sample Tracking
Jalankan dari root project: python -m backend.test_backend
"""

import sys
import os

def test_imports():
	"""Test apakah semua modul bisa di-import"""
	print("=" * 50)
	print("TEST 1: Import Modules")
	print("=" * 50)

	try:
		import backend.main
		print("OK backend.main")
	except Exception as e:
		print(f"FAILED backend.main: {e}")
		return False

	try:
		import backend.models
		print("OK backend.models")
	except Exception as e:
		print(f"FAILED backend.models: {e}")
		return False

	try:
		import backend.database
		print("OK backend.database")
	except Exception as e:
		print(f"FAILED backend.database: {e}")
		return False

	print()
	return True


def test_env_config():
	"""Test apakah environment variables tersedia"""
	print("=" * 50)
	print("TEST 2: Environment Configuration")
	print("=" * 50)

	from dotenv import load_dotenv
	env_path = os.path.join('backend', '.env')
	load_dotenv(dotenv_path=env_path)

	required_vars = ['DATABASE_URL']
	all_ok = True

	for var in required_vars:
		value = os.getenv(var)
		if value:
			print(f"OK {var} = {value[:30]}{'...' if len(value or '') > 30 else ''}")
		else:
			print(f"EMPTY {var}")

	# ESP vars tidak required lagi, cuma informatif
	for v in ['ESP_Lemari1_Base', 'ESP_Lemari2_Base', 'ESP_Lemari3_Base',
			  'ESP_Lemari4_Base', 'ESP_Lemari5_Base', 'ESP_Lemari6_Base']:
		val = os.getenv(v)
		print(f"INFO {v} = {'(empty)' if not val else '(set)'}")

	print()
	return True


def test_database():
	"""Test apakah database bisa diakses"""
	print("=" * 50)
	print("TEST 3: Database Connection")
	print("=" * 50)

	try:
		import backend.database
		from backend.database import engine

		with engine.connect() as conn:
			print("OK Database connection")

		import backend.models
		backend.models.Base.metadata.create_all(bind=engine)
		print("OK Table creation")

		from backend.models import Device
		db = backend.database.SessionLocal()
		count = db.query(Device).count()
		print(f"OK Device records in DB: {count}")
		db.close()

		print()
		return True
	except Exception as e:
		print(f"FAILED: {e}")
		print()
		return False


if __name__ == "__main__":
	all_ok = True
	all_ok &= test_imports()
	all_ok &= test_env_config()
	all_ok &= test_database()
	sys.exit(0 if all_ok else 1)
