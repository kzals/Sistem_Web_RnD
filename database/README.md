# Database Setup

Folder ini berisi script SQL untuk setup database.

## File

- `setup.sql` - Script untuk membuat database dan tabel Users

## Cara Menggunakan

### Menggunakan SQL Server Management Studio (SSMS)

1. Buka SQL Server Management Studio
2. Koneksi ke SQL Server Anda
3. Buka file `setup.sql`
4. Klik Execute atau tekan F5

### Menggunakan Azure Data Studio

1. Buka Azure Data Studio
2. Koneksi ke SQL Server Anda
3. Buka file `setup.sql`
4. Klik Run atau tekan F5

### Menggunakan Command Line (sqlcmd)

```bash
sqlcmd -S localhost -U sa -P YourPassword -i setup.sql
```

## Catatan

- Script akan membuat database `TestDB` jika belum ada
- Script akan membuat tabel `Users` jika belum ada
- Script akan menambahkan data contoh jika tabel masih kosong
- Anda dapat mengubah nama database sesuai kebutuhan
