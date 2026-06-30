import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get('onlyUnread') === '1';
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const pool = await getConnection();

    const result = await pool.request()
      .input('onlyUnread', sql.Bit, onlyUnread)
      .input('sessionRole', sql.NVarChar(50), session?.role || null)
      .input('sessionDept', sql.NVarChar(255), session?.dept || null)
      .input('sessionUserKey', sql.NVarChar(120), session?.userKey || null)
      .execute('sp_LoanRequest_GetList');

    return NextResponse.json(result.recordset);
  } catch (error: any) {
    console.error('Loan notification list error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil notifikasi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const requestId = String(body.requestId || '').trim();

    if (!requestId) {
      return NextResponse.json({ error: 'requestId wajib diisi' }, { status: 400 });
    }

    const pool = await getConnection();

    await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .execute('sp_LoanRequest_MarkRead');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Loan notification update error:', error);
    return NextResponse.json({ error: error.message || 'Gagal update notifikasi' }, { status: 500 });
  }
}
