import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

type DoneBody = {
  notificationId: number;
};

async function ensureSampleReturnTable() {
  const pool = await getConnection();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Return_Notifications')
    CREATE TABLE Sample_Return_Notifications (
      ID_Notification INT PRIMARY KEY IDENTITY(1,1),
      Sample_Ids NVARCHAR(MAX) NOT NULL,
      Loan_Ids NVARCHAR(MAX) NOT NULL,
      Count_Items INT NOT NULL,
      Sender_Departemen NVARCHAR(255) NOT NULL DEFAULT 'Unknown',
      Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru',
      Pickup_Confirmed_At DATETIME2 NULL,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Pickup_Status') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru';
  `);

  return pool;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DoneBody;
    const notificationId = Number(body.notificationId);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return NextResponse.json({ error: 'notificationId tidak valid' }, { status: 400 });
    }

    const pool = await ensureSampleReturnTable();

    const exists = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .query('SELECT ID_Notification FROM Sample_Return_Notifications WHERE ID_Notification = @notificationId');

    if (exists.recordset.length === 0) {
      return NextResponse.json({ error: 'Notifikasi pengembalian tidak ditemukan' }, { status: 404 });
    }

    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .query(`
        UPDATE Sample_Return_Notifications
        SET Pickup_Status = 'Dikembalikan', Pickup_Confirmed_At = ISNULL(Pickup_Confirmed_At, GETDATE())
        WHERE ID_Notification = @notificationId
      `);

    return NextResponse.json({ success: true, notificationId, pickupStatus: 'Dikembalikan' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menandai notifikasi sebagai Dikembalikan' }, { status: 500 });
  }
}
