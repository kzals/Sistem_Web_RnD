import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID notifikasi tidak valid' }, { status: 400 });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .execute('sp_SampleReturnNotif_GetById');

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

    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .execute('sp_SampleReturnNotif_MarkRead');

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menandai notifikasi sebagai dibaca' }, { status: 500 });
  }
}
