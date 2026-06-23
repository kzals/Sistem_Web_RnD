-- Add or convert RW and RF columns as VARCHAR in db_SampelKain.
-- Run this script manually on SQL Server if needed.

USE db_SampelKain;
GO

IF COL_LENGTH('Spesifikasi', 'RW') IS NULL
BEGIN
    ALTER TABLE Spesifikasi ADD RW VARCHAR(50) NULL;
    PRINT 'Column RW added as VARCHAR(50)';
END
ELSE IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Spesifikasi'
      AND COLUMN_NAME = 'RW'
      AND DATA_TYPE NOT IN ('varchar', 'nvarchar')
)
BEGIN
    ALTER TABLE Spesifikasi ALTER COLUMN RW VARCHAR(50) NULL;
    PRINT 'Column RW converted to VARCHAR(50)';
END
ELSE
BEGIN
    PRINT 'Column RW already VARCHAR/NVARCHAR';
END

IF COL_LENGTH('Spesifikasi', 'RF') IS NULL
BEGIN
    ALTER TABLE Spesifikasi ADD RF VARCHAR(50) NULL;
    PRINT 'Column RF added as VARCHAR(50)';
END
ELSE IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Spesifikasi'
      AND COLUMN_NAME = 'RF'
      AND DATA_TYPE NOT IN ('varchar', 'nvarchar')
)
BEGIN
    ALTER TABLE Spesifikasi ALTER COLUMN RF VARCHAR(50) NULL;
    PRINT 'Column RF converted to VARCHAR(50)';
END
ELSE
BEGIN
    PRINT 'Column RF already VARCHAR/NVARCHAR';
END
