import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { ensureNotificationTables } from './_shared';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get('onlyUnread') === '1';
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const pool = await getConnection();
    await ensureNotificationTables(pool);

    const filters: string[] = [];
    if (onlyUnread) {
      filters.push('n.Is_Read = 0');
      filters.push('n.Created_At >= DATEADD(DAY, -14, GETDATE())');
      if (session?.role === 'rnd' || session?.role === 'root') {
        filters.push("ISNULL(n.Status_Request, 'Baru') = 'Baru'");
      }
    }
    if (session?.role === 'requester') {
      filters.push("ISNULL(n.Status_Request, 'Baru') <> 'Baru'");
      filters.push('(UPPER(REPLACE(LTRIM(RTRIM(ISNULL(n.Requester_Dept, \'\'))), \'&\', \'\')) = UPPER(REPLACE(LTRIM(RTRIM(@sessionDept)), \'&\', \'\')) OR UPPER(LTRIM(RTRIM(ISNULL(n.Requester_User_Key, \'\')))) = UPPER(LTRIM(RTRIM(@sessionUserKey))))');
    }
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const req = pool.request();
    if (session?.role === 'requester') {
      req.input('sessionDept', sql.NVarChar(255), session.dept || '');
      req.input('sessionUserKey', sql.NVarChar(120), session.userKey || session.dept || '');
    }

    const result = await req.query(`
      SELECT
        n.Request_ID,
        n.Customer_Name,
        n.Departemen,
        n.Requested_Status,
        n.Status_Request,
        n.Notes,
        n.Requested_By_App,
        n.Is_Read,
        n.Urgency,
        CONVERT(VARCHAR(19), n.Created_At, 120) AS Created_At,
        COUNT(i.ID_Item) AS Sample_Count
      FROM Loan_Request_Notifications n
      LEFT JOIN Loan_Request_Items i ON i.Request_ID = n.Request_ID
      ${whereClause}
      GROUP BY
        n.Request_ID,
        n.Customer_Name,
        n.Departemen,
        n.Requested_Status,
        n.Status_Request,
        n.Notes,
        n.Requested_By_App,
        n.Is_Read,
        n.Urgency,
        n.Created_At
      ORDER BY n.Created_At DESC
    `);

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
    await ensureNotificationTables(pool);

    await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .query('UPDATE Loan_Request_Notifications SET Is_Read = 1 WHERE Request_ID = @requestId');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Loan notification update error:', error);
    return NextResponse.json({ error: error.message || 'Gagal update notifikasi' }, { status: 500 });
  }
}
