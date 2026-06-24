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

# ==============================
# LOAD ENV
# ==============================
load_dotenv()

# Modul lokal
from . import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Smart Lamp Controller API - Lemari System")

# ==============================
# CORS
# ==============================
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# MULTI BOARD CONFIG & ADDRESS MAPPING
# ==============================
SEND_PATH = "/send"
STATUS_PATH = "/status"

# Alamat range untuk setiap lemari
LEMARI_CONFIG = {
    1: {
        "name": "Lemari 1",
        "raks": {
            "1-4": {"start": 1, "end": 16},      # 11A-14D
            "5-8": {"start": 145, "end": 160}     # 15A-18D
        },
        "base_url": (os.getenv("ESP_Lemari1_Base") or "").rstrip("/")
    },
    2: {
        "name": "Lemari 2",
        "start": 17,
        "end": 48,
        "base_url": (os.getenv("ESP_Lemari2_Base") or "").rstrip("/")
    },    # 21A-28D
    3: {
        "name": "Lemari 3",
        "start": 49,
        "end": 80,
        "base_url": (os.getenv("ESP_Lemari3_Base") or "").rstrip("/")
    },    # 31A-38D
    4: {
        "name": "Lemari 4",
        "start": 81,
        "end": 112,
        "base_url": (os.getenv("ESP_Lemari4_Base") or "").rstrip("/")
    },   # 41A-48D
    5: {
        "name": "Lemari 5",
        "start": 113,
        "end": 144,
        "base_url": (os.getenv("ESP_Lemari5_Base") or "").rstrip("/")
    }   # 51A-58D
}

print("\n=== LEMARI & ADDRESS CONFIGURATION ===")
for lemari_num, config in LEMARI_CONFIG.items():
    print(f"Lemari {lemari_num}: {config['name']}")
print("\n=== ESP LEMARI BASE CONFIGURATION ===")
for lemari_num, config in LEMARI_CONFIG.items():
    print(f"Lemari {lemari_num} -> {config.get('base_url', '')}")
print("="*40 + "\n")

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


# ==============================
# LAMP MAPPING FUNCTION
# ==============================
def generate_lamp_code(lamp_str: str):
    """
    Format baru: [Lemari][Rak][Posisi]
    Contoh: 11A, 21B, 58D
    
    11A = Lemari 1, Rak 1, Posisi A (alamat 1)
    58D = Lemari 5, Rak 8, Posisi D (alamat 144)
    """

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

    # Validasi Lemari
    if lemari < 1 or lemari > 5:
        raise HTTPException(
            status_code=400,
            detail="Lemari hanya ada 1 sampai 5"
        )

    # Validasi Rak
    if rak < 1 or rak > 8:
        raise HTTPException(
            status_code=400,
            detail="Rak hanya ada 1 sampai 8"
        )

    posisi_index = {
        "A": 0,
        "B": 1,
        "C": 2,
        "D": 3,
    }

    # Hitung alamat lampu
    if lemari == 1:
        # Lemari 1 punya 2 bagian: 1-16 dan 145-160
        if rak <= 4:
            # Bagian pertama (1-16)
            lamp_code = ((rak - 1) * 4) + posisi_index[posisi] + 1
        else:
            # Bagian kedua (145-160)
            lamp_code = 145 + ((rak - 5) * 4) + posisi_index[posisi]
    else:
        # Lemari 2-5: sequential
        config = LEMARI_CONFIG[lemari]
        base_address = config["start"]
        lamp_code = base_address + ((rak - 1) * 4) + posisi_index[posisi]

        # Validasi jangan melebihi range
        if lamp_code > config["end"]:
            raise HTTPException(
                status_code=400,
                detail=f"Alamat lampu {lamp_code} melebihi batas Lemari {lemari} (max: {config['end']})"
            )

    board = {
        "id": f"LEMARI_{lemari}",
        "name": f"ESP Lemari {lemari}",
        "lemari_range": [lemari],
        "address_range": [lamp_code, lamp_code],
        "base_url": LEMARI_CONFIG[lemari].get("base_url", ""),
    }

    return lamp_code, board


# ==============================
# HTTP CLIENT
# ==============================
def _http_client() -> httpx.AsyncClient:
    timeout = httpx.Timeout(connect=5.0, read=2.0, write=1.0, pool=2.0)
    return httpx.AsyncClient(timeout=timeout)


# ==============================
# ESP COMMUNICATION
# ==============================
async def _esp_send_cmd(board: dict, cmd: str) -> tuple[bool, str]:
    base_url = board["base_url"]

    if not base_url:
        return False, "not_configured"

    url = f"{base_url}{SEND_PATH}"

    try:
        async with _http_client() as client:
            r = await client.post(url, json={"cmd": cmd})
            return r.status_code == 200, "ok"
    except Exception as e:
        print(f"ERROR kirim ke {board['name']}:", e)
        return False, "offline"


async def _esp_get_status(board: dict):
    base_url = board["base_url"]

    if not base_url:
        return None

    try:
        async with _http_client() as client:
            r = await client.get(f"{base_url}{STATUS_PATH}")
            if r.status_code == 200:
                return r.json()
    except Exception:
        return None

    return None


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

    lamp_input = request.lamp.upper()
    lamp_code, board = generate_lamp_code(lamp_input)

    cmd = f"{lamp_code}{request.state}"

    is_esp_online, esp_status = await _esp_send_cmd(board, cmd)

    if esp_status == "not_configured":
        raise HTTPException(
            status_code=400,
            detail=f"{board['name']} belum dikonfigurasi. Set ESP_{board['id']}_Base di file .env"
        )

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
        "board": board["name"],
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
# ENDPOINT: STATUS SEMUA BOARD
# ==============================
@app.get("/api/esp-status")
async def esp_status():
    """
    Mengembalikan status koneksi ESP per lemari dengan detail
    """
    status = {}

    for lemari_num, lemari_config in LEMARI_CONFIG.items():
        base_url = lemari_config.get("base_url", "")
        
        # Try to connect to ESP
        online = False
        if base_url:
            try:
                async with httpx.AsyncClient(timeout=2) as client:
                    res = await client.get(f"{base_url}{STATUS_PATH}")
                    online = res.status_code == 200
            except:
                online = False
        
        if lemari_num == 1:
            address_range = [1, 16, 145, 160]
        else:
            address_range = [lemari_config["start"], lemari_config["end"]]

        configured = bool(base_url)

        if not configured:
            config_message = "Belum diKonfigurasi"
        elif online:
            config_message = "Online"
        else:
            config_message = "Offline"

        status[f"LEMARI_{lemari_num}"] = {
            "name": f"ESP Lemari {lemari_num}",
            "online": online,
            "configured": configured,
            "config_message": config_message,
            "lemari_range": [lemari_num],
            "address_range": address_range,
            "url": base_url if base_url else "Not configured"
        }

    return status
