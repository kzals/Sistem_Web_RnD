-- Migration Script: Menghapus kolom Quantity dari tabel Master_Produk
-- Tanggal: March 9, 2026
-- Deskripsi: Menghapus kolom Quantity yang tidak lagi digunakan

-- Gunakan database yang sesuai
-- USE YourDatabaseName;
-- GO

-- Cek apakah kolom Quantity ada, jika ada maka hapus
IF EXISTS (
    SELECT * 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Master_Produk' 
    AND COLUMN_NAME = 'Quantity'
)
BEGIN
    -- Hapus kolom Quantity dari tabel Master_Produk
    ALTER TABLE Master_Produk
    DROP COLUMN Quantity;
    
    PRINT 'Kolom Quantity berhasil dihapus dari tabel Master_Produk';
END
ELSE
BEGIN
    PRINT 'Kolom Quantity tidak ditemukan di tabel Master_Produk';
END
GO

-- Verifikasi kolom telah dihapus
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Master_Produk'
ORDER BY ORDINAL_POSITION;
GO

PRINT 'Migration selesai!';
GO
