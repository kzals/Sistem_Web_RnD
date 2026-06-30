import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    const pool = await getConnection();

    const result = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .execute('sp_LoanRequest_GetDetail');

    const recordsets = result.recordsets as any as sql.IRecordSet<any>[];

    if (!recordsets[0]?.length) {
      return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      notification: recordsets[0][0],
      samples: recordsets[1] || [],
    });
  } catch (error: any) {
    console.error('Loan notification detail error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil detail notifikasi' }, { status: 500 });
  }
}
