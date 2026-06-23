# 📦 Requirements & Dependencies

Dokumentasi lengkap semua dependencies yang dibutuhkan UI Web R&D (frontend Next.js + backend FastAPI).

## 🔧 System Requirements (Prerequisites)

Sebelum install dependencies, pastikan sudah install:

| Requirement | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v18+ | JavaScript runtime |
| **npm** | v9+ | Package manager |
| **Python** | v3.8+ | Python runtime |
| **pip** | latest | Python package manager |
| **SQL Server** | 2019+ | Database server |
| **Git** | latest | Version control |

**Verifikasi:**
```bash
node --version      # v18+
npm --version       # v9+
python --version    # v3.8+
pip --version       # latest
git --version       # latest
```

---

## 📥 Install Dependencies

### 1️⃣ Node.js Dependencies (Frontend Next.js)

```bash
npm install
```

Ini akan:
- Download semua npm packages dari `package.json`
- Membuat folder `/node_modules`
- Membuat `package-lock.json`

**Durasi:** 2-5 menit

### 2️⃣ Python Dependencies (Backend FastAPI)

Backend Python berada di folder `SampleTracking/`.

**Setup Option A: Simple (tidak recommended untuk production)**
```bash
cd SampleTracking
pip install -r requirements.txt
```

**Setup Option B: Virtual Environment (Recommended)**

```bash
# Buka PowerShell/Terminal di folder project

# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Windows CMD:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
cd SampleTracking
pip install -r requirements.txt
```

**Durasi:** 1-3 menit

---

## 📋 Daftar Dependencies

### Frontend - Node.js

#### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| **next** | ^14.2.35 | Next.js framework |
| **react** | ^18.2.0 | React library |
| **react-dom** | ^18.2.0 | React DOM rendering |

#### Database
| Package | Version | Purpose |
|---------|---------|---------|
| **mssql** | ^12.2.0 | SQL Server driver untuk Node.js |

#### File Processing
| Package | Version | Purpose |
|---------|---------|---------|
| **exceljs** | ^4.4.0 | Excel file reading/writing |
| **xlsx** | ^0.18.5 | Excel format support |

#### PWA & Notifications
| Package | Version | Purpose |
|---------|---------|---------|
| **next-pwa** | ^5.6.0 | Progressive Web App configuration |
| **web-push** | ^3.6.7 | Web push notification server |

#### AI/ML Integration
| Package | Version | Purpose |
|---------|---------|---------|
| **@google/genai** | ^1.43.0 | Google Generative AI API |
| **openai** | ^6.25.0 | OpenAI API client |

#### Styling
| Package | Version | Purpose |
|---------|---------|---------|
| **tailwindcss** | ^3.4.1 | Utility-first CSS framework |
| **autoprefixer** | ^10.4.17 | PostCSS plugin for vendor prefixes |
| **postcss** | ^8.4.33 | CSS transformation |

#### Development
| Package | Version | Purpose |
|---------|---------|---------|
| **typescript** | ^5.3.3 | Type checking |
| **eslint** | ^10.0.2 | Code linting |
| **eslint-config-next** | ^16.1.6 | ESLint config untuk Next.js |
| **@types/node** | ^20.11.5 | TypeScript types untuk Node.js |
| **@types/react** | ^18.2.48 | TypeScript types untuk React |
| **@types/react-dom** | ^18.2.18 | TypeScript types untuk React DOM |
| **@types/mssql** | ^9.1.9 | TypeScript types untuk mssql |
| **@types/web-push** | ^3.6.4 | TypeScript types untuk web-push |

### Backend - Python

| Package | Purpose |
|---------|---------|
| **fastapi** | Web framework untuk API |
| **uvicorn[standard]** | ASGI server untuk FastAPI |
| **sqlalchemy** | ORM untuk database |
| **psycopg2-binary** | PostgreSQL adapter (optional) |
| **python-dotenv** | Environment variables management |
| **requests** | HTTP client library |
| **websockets** | WebSocket support |
| **alembic** | Database migration tool |

---

## 📊 Dependency Size

**Approximate sizes:**
- Node.js `/node_modules`: ~500-600 MB
- Python `venv`: ~300-400 MB
- `package-lock.json`: ~20 KB
- `requirements.txt`: ~200 bytes

**Tips:** Jangan commit `/node_modules` dan `venv` ke GitHub (sudah di `.gitignore`)

---

## 🔄 Update Dependencies

### Node.js

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages
npm update
```

### Python

```bash
# Check for updates
pip list --outdated

# Update specific package
pip install --upgrade package-name

# Generate updated requirements
pip freeze > requirements.txt
```

---

## 🐛 Troubleshooting Dependencies

### Node.js - Error: "Cannot find module"
```bash
rm -r node_modules package-lock.json
npm install
```

### Node.js - Error: "npm ERR! code ERESOLVE"
```bash
npm install --legacy-peer-deps
```

### Python - Error: "ModuleNotFoundError"
```bash
# Check virtual environment is activated
pip list

# Re-install
pip install -r requirements.txt
```

### Python - pip command not found
```bash
# Windows: gunakan python -m pip
python -m pip install -r requirements.txt

# atau update Python installation
```

### Python - Virtual environment error
```bash
# Remove old venv
rm -r venv

# Create new
python -m venv venv

# Activate dan install
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

---

## ✅ Verify Installation

### Node.js
```bash
npm list
npm run build
```

### Python
```bash
# Activate venv first
venv\Scripts\activate  # Windows

# Check installed packages
pip list

# Test FastAPI
cd SampleTracking
python -m uvicorn src.backend.main:app --reload --port 8001
```

---

## 🚀 Running Both Systems

### Terminal 1 - Frontend (Next.js)
```bash
npm run dev
# http://localhost:3000
```

### Terminal 2 - Backend (FastAPI)
```bash
cd SampleTracking
venv\Scripts\activate  # Windows
python -m uvicorn src.backend.main:app --reload --port 8001
# http://localhost:8001/docs (API documentation)
```

Atau gunakan npm script yang sudah ada:
```bash
npm run dev:backend:alt  # Port 8001
```

---

## 📝 Key Dependencies Explained

### **mssql** (Node.js)
- Menghubungkan Next.js ke SQL Server
- Digunakan di API routes untuk query database

### **fastapi** (Python)
- Web framework untuk backend API
- Lebih cepat dari Flask
- Auto-generate Swagger docs

### **uvicorn** (Python)
- ASGI server untuk menjalankan FastAPI
- Replacement untuk gunicorn di production

### **sqlalchemy** (Python)
- ORM untuk abstraksi database
- Support SQL Server, PostgreSQL, MySQL, dll

### **python-dotenv** (Python)
- Membaca `.env` file untuk environment variables
- Sama seperti Node.js `.env.local`

### **next-pwa** (Node.js)
- PWA configuration untuk Next.js
- Service worker auto-generation

### **web-push** (Node.js)
- Server untuk mengirim web push notifications
- Integrasi dengan backend FastAPI

---

## 📚 Dokumentasi Lainnya

- **SETUP.md** - Setup lengkap dari awal
- **package.json** - Node.js dependencies detail
- **SampleTracking/requirements.txt** - Python dependencies
- **docs/** - Reference guides

---

## 🎯 Quick Checklist

- [ ] Node.js v18+ installed
- [ ] Python 3.8+ installed
- [ ] `npm install` selesai
- [ ] Virtual environment created
- [ ] `pip install -r requirements.txt` selesai
- [ ] `npm run dev` berjalan
- [ ] Backend FastAPI berjalan
- [ ] Bisa akses http://localhost:3000 (frontend)
- [ ] Bisa akses http://localhost:8001/docs (API docs)
