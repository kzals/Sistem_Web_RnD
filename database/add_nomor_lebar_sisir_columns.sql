-- Add Nomor_Sisir and Lebar_Sisir columns as DECIMAL(5,2) in db_SampelKain.
-- Run this script manually on SQL Server if needed.

USE db_SampelKain;
GO

IF COL_LENGTH('Konstruksi_Tenun', 'Nomor_Sisir') IS NULL
BEGIN
    ALTER TABLE Konstruksi_Tenun ADD Nomor_Sisir DECIMAL(5,2) NULL;
    PRINT 'Column Nomor_Sisir added as DECIMAL(5,2)';
END
ELSE IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Konstruksi_Tenun'
      AND COLUMN_NAME = 'Nomor_Sisir'
      AND (DATA_TYPE <> 'decimal' OR NUMERIC_PRECISION <> 5 OR NUMERIC_SCALE <> 2)
)
BEGIN
    ALTER TABLE Konstruksi_Tenun ALTER COLUMN Nomor_Sisir DECIMAL(5,2) NULL;
    PRINT 'Column Nomor_Sisir converted to DECIMAL(5,2)';
END
ELSE
BEGIN
    PRINT 'Column Nomor_Sisir already DECIMAL(5,2)';
END

IF COL_LENGTH('Konstruksi_Tenun', 'Lebar_Sisir') IS NULL
BEGIN
    ALTER TABLE Konstruksi_Tenun ADD Lebar_Sisir DECIMAL(5,2) NULL;
    PRINT 'Column Lebar_Sisir added as DECIMAL(5,2)';
END
ELSE IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Konstruksi_Tenun'
      AND COLUMN_NAME = 'Lebar_Sisir'
      AND (DATA_TYPE <> 'decimal' OR NUMERIC_PRECISION <> 5 OR NUMERIC_SCALE <> 2)
)
BEGIN
    ALTER TABLE Konstruksi_Tenun ALTER COLUMN Lebar_Sisir DECIMAL(5,2) NULL;
    PRINT 'Column Lebar_Sisir converted to DECIMAL(5,2)';
END
ELSE
BEGIN
    PRINT 'Column Lebar_Sisir already DECIMAL(5,2)';
END
