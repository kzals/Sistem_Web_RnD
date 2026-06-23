-- -- Script untuk setup database SQL Server
-- -- Jalankan script ini di SQL Server Management Studio atau Azure Data Studio

-- -- 1. Buat database baru (jika belum ada)
-- IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TestDB')
-- BEGIN
--     CREATE DATABASE TestDB;
--     PRINT 'Database TestDB berhasil dibuat';
-- END
-- ELSE
-- BEGIN
--     PRINT 'Database TestDB sudah ada';
-- END
-- GO

-- -- 2. Gunakan database TestDB
-- USE TestDB;
-- GO

-- -- 3. Buat tabel Users (jika belum ada)
-- IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
-- BEGIN
--     CREATE TABLE Users (
--         Id INT IDENTITY(1,1) PRIMARY KEY,
--         Nama NVARCHAR(100) NOT NULL,
--         Email NVARCHAR(100) NOT NULL,
--         Telepon NVARCHAR(20),
--         CreatedAt DATETIME DEFAULT GETDATE()
--     );
--     PRINT 'Tabel Users berhasil dibuat';
-- END
-- ELSE
-- BEGIN
--     PRINT 'Tabel Users sudah ada';
-- END
-- GO

-- -- 4. (Opsional) Insert data contoh
-- IF NOT EXISTS (SELECT * FROM Users)
-- BEGIN
--     INSERT INTO Users (Nama, Email, Telepon) VALUES 
--     ('John Doe', 'john.doe@example.com', '08123456789'),
--     ('Jane Smith', 'jane.smith@example.com', '08198765432'),
--     ('Bob Johnson', 'bob.johnson@example.com', '08111222333');
    
--     PRINT 'Data contoh berhasil ditambahkan';
-- END
-- ELSE
-- BEGIN
--     PRINT 'Tabel Users sudah memiliki data';
-- END
-- GO

-- -- 5. Tampilkan semua data
-- SELECT * FROM Users;
-- GO

-- -- 6. Informasi tabel
-- EXEC sp_help 'Users';
-- GO
