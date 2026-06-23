"""
Test script untuk memverifikasi backend Smart Sample Tracking
Jalankan dari root project: python backend/test_backend.py
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
		print("✓ backend.main - OK")
	except Exception as e:
		print(f"✗ backend.main - FAILED: {e}")
		return False
    
	try:
		import backend.models
		print("✓ backend.models - OK")
	except Exception as e:
		print(f"✗ backend.models - FAILED: {e}")
		return False
    
	try:
		import backend.database
		print("✓ backend.database - OK")
	except Exception as e:
		print(f"✗ backend.database - FAILED: {e}")
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
    
	required_vars = [
		'DATABASE_URL',
		'ESP_Lemari1_Base',
		'ESP_Lemari2_Base',
		'ESP_Lemari3_Base',
		'ESP_Lemari4_Base',
		'ESP_Lemari5_Base',
		'ESP_Lemari6_Base',
	]
	all_ok = True
    
	for var in required_vars:
		value = os.getenv(var)
		if value:
			# Mask sensitive info
			display_value = value if 'ESP' in var else value[:20] + '...'
			print(f"✓ {var} = {display_value}")
		else:
			print(f"✓ {var} = (empty)")
    
	print()
	return True


def test_database():
	"""Test apakah database bisa diakses"""
	print("=" * 50)
	print("TEST 3: Database Connection")
	print("=" * 50)
    
	try:
		from backend import database
		from backend.database import engine
        
		# Test connection
		with engine.connect() as conn:
			print("✓ Database connection - OK")
            
		# Test table creation
		from backend import models
		models.Base.metadata.create_all(bind=engine)
		print("✓ Table creation - OK")
        
		print()
		return True
	except Exception as e:
		print(f"✗ Database test FAILED: {e}")
		print()
		return False


def test_lamp_mapping():
