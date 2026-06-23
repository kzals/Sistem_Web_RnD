
from dotenv import load_dotenv
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# Tambahkan path dari direktori 'backend' ke dalam path Python
# agar kita bisa mengimpor 'models'
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from models import Base

config = context.config

# Muat variabel dari file .env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')

# Tambahkan print untuk debugging path .env
print(f"DEBUG: Mencari file .env di: {os.path.abspath(dotenv_path)}")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"Peringatan: File .env tidak ditemukan di path yang dicari.")

db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)
else:
    raise ValueError("DATABASE_URL tidak disetel di environment atau file .env.")

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # --- PERUBAHAN UTAMA DI SINI ---
    # Kita akan membuat engine secara langsung dari URL yang sudah dimuat
    # untuk menghindari error 'AttributeError' dari 'config.get_section'.
    db_url_from_env = os.getenv("DATABASE_URL")
    if not db_url_from_env:
        raise ValueError("DATABASE_URL tidak ditemukan untuk mode online.")
        
    connectable = create_engine(db_url_from_env, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
