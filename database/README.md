# Database

Folder ini berisi script SQL untuk migrasi dan stored procedure.

## Struktur Folder

- `query_sql/` — Stored procedure definitions + full schema snapshot

## File Migration

| File | Keterangan |
|------|------------|
| `add_master_produk_stok_tanggal_keterangan.sql` | Tambah kolom Stok_Sampel, Tanggal_Produksi, Keterangan di Master_Produk |
| `add_nomor_lebar_sisir_columns.sql` | Tambah kolom Nomor_Sisir, Lebar_Sisir di Spesifikasi |
| `add_quantity_column.sql` | Tambah kolom quantity |
| `remove_quantity_column.sql` | Rollback kolom quantity |
| `add_rw_rf_columns.sql` | Tambah/konversi kolom RW, RF di Spesifikasi |
| `update_diberikan_to_keluar.sql` | Update status "Diberikan" → "Keluar" di Sample_Loan |

## Cara Pakai

1. Buka SSMS, konek ke server yang sesuai
2. Buka file `.sql` yang diinginkan
3. Execute (F5)
