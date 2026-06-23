# 🚀 Panduan Setup UI Web R&D

Panduan lengkap setup dan instalasi UI Web R&D dari awal hingga siap berjalan di localhost.

## 📋 Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Clone Repository](#clone-repository)
3. [Install Dependencies](#install-dependencies)
4. [Konfigurasi Environment](#konfigurasi-environment)
5. [Menjalankan Aplikasi](#menjalankan-aplikasi)
6. [Akses dari HP via WiFi](#akses-dari-hp-via-wifi)
7. [Install PWA di HP](#install-pwa-di-hp)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prasyarat

Sebelum memulai, pastikan sudah install:

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **npm** v9+ (biasanya bundled dengan Node.js)
- **Python** v3.8+ ([Download](https://www.python.org/))
- **pip** latest version (biasanya bundled dengan Python)
- **Git** ([Download](https://git-scm.com/))
- **SQL Server** terhubung dan dapat diakses (dari laptop/desktop)

Verifikasi di terminal/PowerShell:
```bash
node --version      # Contoh: v18.17.0
npm --version       # Contoh: 9.6.7
python --version    # Contoh: Python 3.11.0
pip --version       # Contoh: pip 23.x.x
git --version       # Contoh: git version 2.42.0
```

---

## 📥 Clone Repository

```bash
git clone <repository-url>
cd ui_web_rnd
```

---

## 📦 Install Dependencies

Sistem ini memiliki **2 bagian**: Frontend (Node.js) dan Backend (Python). Kedua perlu diinstall.

### 1️⃣ Verifikasi Prerequisites

Sebelum install, pastikan sudah install semua yang dibutuhkan:

```bash
# Check Node.js
node --version          # Harus v18+

# Check npm
npm --version           # Harus v9+

# Check Python
python --version        # Harus v3.8+

# Check pip
pip --version           # Latest version

# Check Git
git --version           # Versi latest
```

Jika belum install, download dari:
- **Node.js:** https://nodejs.org/ (akan include npm)
- **Python:** https://www.python.org/
- **Git:** https://git-scm.com/

---

### 2️⃣ Install Node.js Dependencies (Frontend Next.js)

```bash
# Pastikan Anda di folder project root (ui_web_rnd)
cd ui_web_rnd

# Install semua npm packages
npm install
```

**Output yang diharapkan:**
```
added 450+ packages in 2m 45s
```

Ini akan:
- 📥 Download semua packages dari `package.json`
- 📂 Membuat folder `/node_modules` (500+ MB)
- 📝 Membuat `package-lock.json`

**Durasi:** 2-5 menit

**Jika ada error:**
```bash
# Clean install
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
```

**Verifikasi:**
```bash
npm list --depth=0
```

---

### 3️⃣ Install Python Dependencies (Backend FastAPI)

Backend berada di folder `SampleTracking/`. Setup dengan virtual environment (recommended):

#### Step 1: Create Virtual Environment

```bash
# Di folder project root (ui_web_rnd), buat virtual environment
python -m venv venv
```

Output:
```
created virtual environment PyPy7.3.12 in 1234ms
```

#### Step 2: Activate Virtual Environment

Pilih command sesuai sistem operasi:

**Windows PowerShell:**
```bash
.\venv\Scripts\Activate.ps1
```

**Windows CMD:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

Jika berhasil, prompt terminal akan berubah menjadi:
```
(venv) C:\Project\ui_web_rnd>
```

Atau di macOS/Linux:
```
(venv) user@computer:~/ui_web_rnd$
```

#### Step 3: Install Python Packages

```bash
# Masuk folder SampleTracking
cd SampleTracking

# Install dependencies dari requirements.txt
pip install -r requirements.txt
```

Output yang diharapkan:
```
Successfully installed fastapi-0.x.x uvicorn-0.x.x sqlalchemy-2.x.x ...
```

**Durasi:** 1-3 menit

**Verifikasi:**
```bash
pip list
```

Seharusnya terlihat paket-paket:
- fastapi
- uvicorn
- sqlalchemy
- python-dotenv
- dll

**Jika ada error:**
```bash
# Update pip dulu
python -m pip install --upgrade pip

# Kemudian install lagi
pip install -r requirements.txt
```

---

### 4️⃣ Deactivate Virtual Environment (Optional)

Saat selesai development, bisa deactivate venv:

```bash
deactivate
```

Prompt akan kembali normal tanpa `(venv)`.

**Note:** Saat menjalankan backend, harus selalu activate venv dulu!

---

### 📝 Summary: Install Dependencies

| Langkah | Command | Durasi |
|---------|---------|--------|
| Node.js packages | `npm install` | 2-5 menit |
| Python venv | `python -m venv venv` | 1 menit |
| Activate venv | `.\venv\Scripts\Activate.ps1` (Windows) | instant |
| Python packages | `cd SampleTracking && pip install -r requirements.txt` | 1-3 menit |
| **Total** | | **5-12 menit** |

---

**Untuk info lengkap tentang dependencies, baca REQUIREMENTS.md**

---

## ⚙️ Berikutnya: Konfigurasi Environment

---

## ⚙️ Konfigurasi Environment

### 1. Copy Template `.env.example` ke `.env.local`

**Windows PowerShell:**
```bash
Copy-Item .env.example .env.local
```

**Windows CMD:**
```bash
copy .env.example .env.local
```

**macOS/Linux:**
```bash
cp .env.example .env.local
```

### 2. Edit `.env.local` dengan Nilai Actual

Buka file `.env.local` dan sesuaikan dengan setup Anda:

```env
# DATABASE
DB_SERVER=192.168.3.17          # IP/hostname SQL Server
DB_DATABASE=db_SampelKain        # Nama database
DB_USER=sa                       # Username SQL Server
DB_PASSWORD=your_actual_password # Password SQL Server
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# INTER-SYSTEM (komunikasi dengan ui_ambil_sampel)
GENERIC_SYSTEM_BASE_URL=http://localhost:3001
NEXT_PUBLIC_GENERIC_SYSTEM_BASE_URL=http://localhost:3001

# FastAPI Backend
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001

# R&D Credentials
RND_PASSWORD=rnd2024

# Web Push (sama dengan ui_ambil_sampel)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLfIFBRclY93ehyT16d8ZcbTXBDLIKn9xJDyt-CAReZhCzlslnQzzE3QJDIlUr_8ZIcS4LNr8fc1pnIaHaHVmHg
VAPID_PRIVATE_KEY=AmbcD21xNq2MXAXyr7llrUWgerZiI4ilHYGLwaZFi54
VAPID_EMAIL=mailto:admin@example.com
```

**Untuk akses dari HP via WiFi** (bukan localhost), update:
```env
GENERIC_SYSTEM_BASE_URL=http://192.168.14.45:3001
NEXT_PUBLIC_GENERIC_SYSTEM_BASE_URL=http://192.168.14.45:3001
```

Ganti `192.168.14.45` dengan IP laptop Anda di WiFi yang sama.

---

## 🏃 Menjalankan Aplikasi

### Untuk Localhost Development:

**Terminal 1 - Frontend (Next.js):**
```bash
npm run dev
```
Aplikasi akan berjalan di: **http://localhost:3000**

**Terminal 2 - Backend (FastAPI):**
```bash
# Pastikan venv sudah diaktifkan
venv\Scripts\activate  # Windows

cd SampleTracking
python -m uvicorn src.backend.main:app --reload --port 8001
```
Backend akan berjalan di: **http://localhost:8001**
- API Docs: http://localhost:8001/docs

Atau gunakan npm script yang sudah ada:
```bash
npm run dev:backend:alt
```

### Untuk Testing dari HP via WiFi:

Gunakan IP address laptop Anda di kedua terminal:

```bash
# Terminal 1
npm run dev -- --hostname 0.0.0.0

# Terminal 2
python -m uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8001
```

Aplikasi akan berjalan di:
- **Frontend dari HP:** http://192.168.14.45:3000 (sesuaikan IP)
- **Backend dari HP:** http://192.168.14.45:8001

**Catatan:** Pastikan .env.local sudah diupdate dengan IP yang benar.

---

## 📱 Akses dari HP via WiFi

### Prasyarat:
- HP dan laptop **terhubung ke WiFi yang SAMA**
- Firewall laptop **tidak blocking** port 3000
- `.env.local` sudah diupdate dengan IP laptop

### Langkah-langkah:

1. **Cari IP laptop** (Windows):
```bash
ipconfig
```
Cari "IPv4 Address" di bagian WiFi adapter (misal: 192.168.14.45)

2. **Pastikan aplikasi berjalan** dengan hostname 0.0.0.0:
```bash
npm run dev -- --hostname 0.0.0.0
```

3. **Akses dari HP:**
Buka browser di HP → masukkan URL: `http://192.168.14.45:3000`

4. **Troubleshooting jika tidak bisa:**
   - Cek firewall Windows (buka port 3000)
   - Pastikan WiFi tidak menggunakan isolasi SSID
   - Coba ping dari HP: `ping 192.168.14.45` (harus reply)
   - Cek console development dengan F12 untuk error details

---

## 📲 Install PWA di HP

### Prasyarat:
- Akses aplikasi dari HP sudah berhasil (bukan localhost)
- Menggunakan browser Chrome/Edge/Firefox di Android

### Langkah-langkah:

1. **Buka aplikasi di HP:**
   ```
   http://192.168.14.45:3000
   ```

2. **Tunggu beberapa detik**, akan muncul popup "Install App" atau ikon `+` di address bar

3. **Tap "Install"** → nama app akan menjadi "UI Web R&D"

4. **Aplikasi akan diinstall** seperti app native

### Fitur PWA:
- ✅ Offline ready (dengan limited functionality)
- ✅ Push notification (jika server mengirim)
- ✅ Full screen mode (tampil seperti app native)
- ✅ Responsive design (auto adjust ke ukuran HP)

---

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
npm install
npm run build
```

### Error: "Connection refused" ke database
- Cek IP DB_SERVER dan password di `.env.local`
- Pastikan SQL Server running
- Cek firewall memungkinkan koneksi ke port 1433

### Push notification tidak muncul
- Pastikan ui_ambil_sampel sudah running di port 3001
- Check browser console (F12) untuk error
- VAPID_PUBLIC_KEY harus sama di kedua project

### Aplikasi tidak accessible dari HP
```bash
# Terminal di folder project
ipconfig  # cari IPv4 Address
npm run dev -- --hostname 0.0.0.0

# Di HP:
http://<IP_LAPTOP>:3000
```

### Port 3000 sudah digunakan
```bash
# Ganti port
npm run dev -- -p 3002

# atau kill process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## ✅ Checklist Persiapan

- [ ] Node.js & npm sudah installed
- [ ] Git sudah installed
- [ ] SQL Server terhubung
- [ ] Repository sudah di-clone
- [ ] `npm install` selesai
- [ ] `.env.local` sudah dikonfigurasi
- [ ] `npm run dev` berjalan tanpa error
- [ ] Bisa akses http://localhost:3000
- [ ] Bisa akses dari HP via WiFi (optional)
- [ ] PWA install test (optional)

---

## 📖 Dokumentasi Lainnya

- **docs/SETUP_CHECKLIST.md** - Checklist detail setup
- **docs/SETUP_GUIDE.md** - Panduan setup database (jika ada)
- **docs/DEPLOYMENT_GUIDE.md** - Panduan deploy ke Vercel
- **docs/guides/** - Tutorial dan step-by-step guides

---

## 💬 Support

Jika ada masalah:
1. Check **Troubleshooting** section di atas
2. Lihat docs folder untuk panduan lebih detail
3. Check browser console dengan F12
4. Lihat terminal/PowerShell untuk error messages
