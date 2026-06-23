# 🚀 Panduan Push ke GitHub

Langkah-langkah untuk push project UI Web R&D ke GitHub.

---

## 📋 Langkah 1: Buat Repository di GitHub

1. **Buka GitHub:**
   - Pergi ke https://github.com/new

2. **Isi Form:**
   - **Repository name:** `ui-web-rnd`
   - **Description:** `UI Web R&D - R&D management system with PWA & web push notifications`
   - **Visibility:** Public (jika ingin publik) atau Private
   - **Initialize:** Jangan centang apapun (kosongkan)

3. **Create repository**

4. **Copy HTTPS URL** (akan digunakan di step 2)
   - Format: `https://github.com/kzals/ui-web-rnd.git`

---

## 🔧 Langkah 2: Configure Git & Push

Buka **PowerShell** atau **Terminal** di folder `ui_web_rnd`:

```bash
cd c:\Project\ui_web_rnd
```

### Step 1: Initialize Git Repository

```bash
git init
```

### Step 2: Configure Git User (First time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Ganti dengan nama dan email Anda.

### Step 3: Add All Files

```bash
git add .
```

Verifikasi file yang akan di-push:
```bash
git status
```

Expected output:
```
On branch master
Changes to be committed:
  new file:   .env.example
  new file:   .gitignore
  new file:   package.json
  new file:   SETUP.md
  new file:   REQUIREMENTS.md
  ... (lebih banyak files)
```

**Pastikan `.env.local` TIDAK ada di list** (harus sudah di .gitignore)

### Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: UI Web R&D - R&D management system with PWA & web push notifications

- Database configuration for SQL Server (Master Produk, Spesifikasi, etc.)
- Next.js PWA with responsive design
- Web push notifications (foreground & background)
- FastAPI backend for sample tracking
- Inter-system communication with ui_ambil_sampel
- Cross-network WiFi access support
- Complete environment configuration template (.env.example)
- Comprehensive setup documentation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Step 5: Add Remote Repository

Ganti `<HTTPS-URL>` dengan URL yang Anda copy dari GitHub:

```bash
git remote add origin https://github.com/kzals/ui-web-rnd.git
```

Verifikasi:
```bash
git remote -v
```

Expected output:
```
origin  https://github.com/kzals/ui-web-rnd.git (fetch)
origin  https://github.com/kzals/ui-web-rnd.git (push)
```

### Step 6: Rename Branch to Main

```bash
git branch -M main
```

### Step 7: Push ke GitHub

```bash
git push -u origin main
```

Akan muncul prompt untuk **GitHub authentication**:
- Pilih **Authorize with browser** atau
- Gunakan **GitHub CLI token**

Setelah berhasil:
```
Enumerating objects: 200, done.
Counting objects: 100% (200/200), done.
Delta compression using up to 8 threads
Compressing objects: 100% (150/150), done.
Writing objects: 100% (200/200), 8.00 MiB
...
* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## ✅ Verifikasi

Buka GitHub di browser:
- https://github.com/kzals/ui-web-rnd

Seharusnya terlihat semua files sudah ter-push.

---

## 📝 Summary Commands

```bash
# Step 1-3: Setup git
git init
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git add .

# Step 4-5: Commit & add remote
git commit -m "Initial commit: UI Web R&D..."
git remote add origin https://github.com/kzals/ui-web-rnd.git

# Step 6-7: Rename branch & push
git branch -M main
git push -u origin main
```

---

## 🐛 Troubleshooting

### Error: "fatal: not a git repository"
```bash
# Pastikan sudah jalankan git init
git init
git add .
```

### Error: "remote origin already exists"
```bash
# Remove existing remote
git remote remove origin

# Add lagi dengan URL yang benar
git remote add origin https://github.com/kzals/ui-web-rnd.git
```

### Error: "Permission denied" saat push
```bash
# Check credentials
git config --list | grep user

# Update credentials jika perlu
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Error: ".env.local" sudah ter-push
```bash
# Remove dari git (jangan delete file local)
git rm --cached .env.local
git commit -m "Remove .env.local from tracking"
git push origin main

# Pastikan .env.local ada di .gitignore
```

---

## 🚀 Next Step: Hosting ke Vercel

Setelah push ke GitHub:
1. Buka https://vercel.com
2. Login dengan GitHub account
3. Click "Import Project"
4. Select repository `ui-web-rnd`
5. Configure environment variables (dari .env.example)
6. Konfigurasi untuk FastAPI backend:
   - Bisa di-host terpisah atau gunakan Vercel Functions
   - Atau deploy FastAPI ke Heroku/Railway
7. Deploy!

Dokumentasi:
- Next.js di Vercel: https://vercel.com/docs/concepts/git/vercel-for-git
- FastAPI deployment: https://fastapi.tiangolo.com/deployment/

