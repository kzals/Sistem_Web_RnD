-- Migration Script: Tambah kolom Stok_Sampel, Tanggal_Produksi, dan Keterangan pada Master_Produk
-- Tanggal: 2026-04-10

IF COL_LENGTH('Master_Produk', 'Stok_Sampel') IS NULL
BEGIN
    ALTER TABLE Master_Produk
    ADD Stok_Sampel INT NOT NULL
        CONSTRAINT DF_Master_Produk_Stok_Sampel DEFAULT(0);

    PRINT 'Kolom Stok_Sampel berhasil ditambahkan ke Master_Produk';
END
ELSE
BEGIN
    PRINT 'Kolom Stok_Sampel sudah ada di Master_Produk';
END
GO

IF COL_LENGTH('Master_Produk', 'Tanggal_Produksi') IS NULL
BEGIN
    ALTER TABLE Master_Produk
    ADD Tanggal_Produksi DATE NULL;

    PRINT 'Kolom Tanggal_Produksi berhasil ditambahkan ke Master_Produk';
END
ELSE
BEGIN
    PRINT 'Kolom Tanggal_Produksi sudah ada di Master_Produk';
END
GO

IF COL_LENGTH('Master_Produk', 'Keterangan') IS NULL
BEGIN
    ALTER TABLE Master_Produk
    ADD Keterangan NVARCHAR(500) NULL;

    PRINT 'Kolom Keterangan berhasil ditambahkan ke Master_Produk';
END
ELSE
BEGIN
    PRINT 'Kolom Keterangan sudah ada di Master_Produk';
END
GO

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Master_Produk'
  AND COLUMN_NAME IN ('Stok_Sampel', 'Tanggal_Produksi', 'Keterangan')
ORDER BY COLUMN_NAME;
GO
