-- Migration Script: Mengubah status "Diberikan" menjadi "Keluar" di tabel Sample_Loan
-- Tanggal: March 9, 2026
-- Deskripsi: Update semua record dengan status "Diberikan" menjadi "Keluar" untuk konsistensi penamaan

-- Gunakan database yang sesuai
-- USE YourDatabaseName;
-- GO

-- Cek jumlah record yang akan diupdate
SELECT 
    COUNT(*) AS TotalRecordDiberikan,
    'Record dengan status Diberikan yang akan diubah menjadi Keluar' AS Deskripsi
FROM Sample_Loan
WHERE Status = 'Diberikan';
GO

-- Update status dari "Diberikan" menjadi "Keluar"
UPDATE Sample_Loan
SET Status = 'Keluar'
WHERE Status = 'Diberikan';

PRINT 'Status berhasil diupdate dari "Diberikan" menjadi "Keluar"';
GO

-- Verifikasi hasil update
SELECT 
    Status,
    COUNT(*) AS JumlahRecord
FROM Sample_Loan
GROUP BY Status
ORDER BY Status;
GO

PRINT 'Migration selesai!';
GO
