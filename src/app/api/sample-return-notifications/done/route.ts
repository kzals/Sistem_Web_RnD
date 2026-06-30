import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

type DoneBody = {
  notificationId: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DoneBody;
    const notificationId = Number(body.notificationId);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return NextResponse.json({ error: 'notificationId tidak valid' }, { status: 400 });
    }

    const pool = await getConnection();
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .execute('sp_SampleReturnNotif_SetReturned');

    return NextResponse.json({ success: true, notificationId, pickupStatus: 'Dikembalikan' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menandai notifikasi sebagai Dikembalikan' }, { status: 500 });
  }
}
