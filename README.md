# UI Web R&D — Fabric Sample Management System

Sistem manajemen sampel kain berbasis web untuk departemen R&D. Mengintegrasikan pencarian, pelacakan, peminjaman, dan pengembalian sampel kain dengan kendali lampu ESP32 pada lemari penyimpanan.

---

## Fitur Utama

- **Pencarian Kain** — Cari sampel berdasarkan ID, Design, use case, atau properti fisik (weave, komposisi, gramasi)
- **Input & Edit Sampel** — Wizard input multi-langkah + import Excel untuk data sampel baru
- **Mix & Match** — Sistem peminjaman sampel langsung dari halaman pencarian
- **Konfirmasi Pinjam / Kembali** — Proses approval pinjaman dan pengembalian dari Requester
- **ESP32 Lamp Integration** — Kontrol lampu indikator pada lemari penyimpanan secara real-time
- **Notifikasi PWA** — Push notification untuk status pengiriman, pinjaman, dan pengembalian
- **Panel Admin** — Manajemen user, hak akses, dan monitoring sistem
- **Riwayat & Pelacakan** — History lampu, status pinjaman, dan lokasi sampel

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, PWA |
| **Backend API** | FastAPI (Python), SQLAlchemy, SQLite |
| **Database** | SQL Server (master data) + SQLite (ESP config, lamp history) |
| **Hardware** | ESP32 microcontroller, HTTP API |
| **Auth** | Session-based, HMAC signed |
| **Notifications** | Web Push API (VAPID), Service Worker |

---

## Struktur Proyek

```
ui_web_rnd/
├── src/                    # Next.js frontend
│   ├── app/                # Pages & API routes
│   ├── components/         # React components
│   └── lib/                # Utility functions, auth, search engine
├── backend/                # FastAPI backend
│   ├── main.py             # ESP32 lamp control API + device CRUD + heartbeat
│   ├── models.py           # SQLAlchemy models (Device, HistoryLampu)
│   └── database.py         # DB connection (SQLite)
├── docs/                   # User manual & documentation
├── database/               # SQL migration scripts & SP definitions
│   └── query_sql/          # Stored procedures + full schema snapshot
├── scripts/                # Ngrok configs, utility scripts
├── public/                 # Static assets
├── .env.example            # Environment variable template
├── SETUP.md                # Setup guide (detail)
└── README.md               # This file
```

---

## Cara Install (Singkat)

> **Prasyarat:** Node.js 18+, Python 3.9+, SQL Server (untuk master data)

```bash
# 1. Clone repositori
git clone https://github.com/[username]/ui-web-rnd.git
cd ui-web-rnd

# 2. Install frontend dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local dengan konfigurasi database dan kredensial

# 4. Setup Python backend
cd backend
pip install -r requirements.txt
cd ..

# 5. Jalankan development server
npm run dev
```

Untuk panduan lengkap, lihat [SETUP.md](SETUP.md).

---


## Kredit

*Developed by [Nama Developer] as part of internship at [Nama Perusahaan]*
