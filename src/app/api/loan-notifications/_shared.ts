import { sql } from '@/lib/db';

export async function ensureNotificationTables(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Loan_Request_Notifications')
    CREATE TABLE Loan_Request_Notifications (
      Request_ID NVARCHAR(64) PRIMARY KEY,
      Customer_Name NVARCHAR(255) NOT NULL,
      Departemen NVARCHAR(255) NOT NULL,
      Requested_Status NVARCHAR(50) NOT NULL DEFAULT 'Dipinjam',
      Status_Request NVARCHAR(50) NOT NULL DEFAULT 'Baru',
      Notes NVARCHAR(MAX) NULL,
      Requested_By_App NVARCHAR(100) NOT NULL DEFAULT 'ui_crud_generic',
      Is_Read BIT NOT NULL DEFAULT 0,
      Created_At DATETIME NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Requested_Status') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Requested_Status NVARCHAR(50) NOT NULL DEFAULT 'Dipinjam';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Urgency') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Urgency NVARCHAR(20) DEFAULT 'Sedang';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'TargetApp') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD TargetApp NVARCHAR(50) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Requester_User_Key') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Requester_User_Key NVARCHAR(120) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Requester_Dept') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Requester_Dept NVARCHAR(255) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Recipient_Mode') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Recipient_Mode NVARCHAR(30) NOT NULL DEFAULT 'RND_ALL';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Stock_Applied') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Stock_Applied BIT NOT NULL DEFAULT 0;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Loan_Request_Notifications', 'Stock_Applied_At') IS NULL
      ALTER TABLE Loan_Request_Notifications ADD Stock_Applied_At DATETIME2 NULL;
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Loan_Request_Items')
    CREATE TABLE Loan_Request_Items (
      ID_Item INT PRIMARY KEY IDENTITY(1,1),
      Request_ID NVARCHAR(64) NOT NULL,
      ID_Sampel INT NOT NULL,
      Design NVARCHAR(255) NOT NULL,
      Lemari NVARCHAR(50) NULL,
      Rak_Hanger NVARCHAR(50) NULL,
      Created_At DATETIME NOT NULL DEFAULT GETDATE(),
      FOREIGN KEY (Request_ID) REFERENCES Loan_Request_Notifications(Request_ID)
    )
  `);
}
