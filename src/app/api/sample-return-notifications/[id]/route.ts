import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

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
      Is_Read BIT NOT NULL DEFAULT 0,
      Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru',
      Pickup_Confirmed_At DATETIME2 NULL,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Sender_Departemen') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Sender_Departemen NVARCHAR(255) NOT NULL DEFAULT 'Unknown';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Is_Read') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Is_Read BIT NOT NULL DEFAULT 0;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Pickup_Status') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Pickup_Confirmed_At') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Pickup_Confirmed_At DATETIME2 NULL;
  `);

  return pool;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID notifikasi tidak valid' }, { status: 400 });
    }

    const pool = await ensureSampleReturnTable();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT ID_Notification, Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Pickup_Status, Pickup_Confirmed_At, Created_At
        FROM Sample_Return_Notifications
        WHERE ID_Notification = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Notifikasi pengembalian tidak ditemukan' }, { status: 404 });
    }

    const row = result.recordset[0];

    return NextResponse.json({
      id: Number(row.ID_Notification || 0),
      sampleIds: JSON.parse(row.Sample_Ids || '[]'),
      loanIds: JSON.parse(row.Loan_Ids || '[]'),
      count: Number(row.Count_Items || 0),
      senderDepartemen: String(row.Sender_Departemen || 'Unknown'),
      pickupStatus: row.Pickup_Status === 'Dikembalikan'
        ? 'Dikembalikan'
        : row.Pickup_Status === 'Dikonfirmasi'
          ? 'Dikonfirmasi'
          : 'Baru',
      pickupConfirmedAt: row.Pickup_Confirmed_At ? new Date(row.Pickup_Confirmed_At).toISOString() : null,
      createdAt: row.Created_At ? new Date(row.Created_At).toISOString() : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengambil detail notifikasi pengembalian' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID notifikasi tidak valid' }, { status: 400 });
    }

    const pool = await ensureSampleReturnTable();
    await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Sample_Return_Notifications
        SET Is_Read = 1
        WHERE ID_Notification = @id
      `);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menandai notifikasi sebagai dibaca' }, { status: 500 });
  }
}
