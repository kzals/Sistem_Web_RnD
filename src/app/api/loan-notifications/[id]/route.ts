import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { ensureNotificationTables } from '../_shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;
    const pool = await getConnection();
    await ensureNotificationTables(pool);

    const header = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .query(`
        SELECT Request_ID, Customer_Name, Departemen, Requested_Status, Status_Request, Notes, Urgency, Requested_By_App, Is_Read,
               Created_At AS Created_At
        FROM Loan_Request_Notifications
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
      `);

    if (header.recordset.length === 0) {
      return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });
    }

    const items = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .query(`
        SELECT ID_Item, Request_ID, ID_Sampel, Design, Lemari, Rak_Hanger, Created_At
        FROM Loan_Request_Items
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
        ORDER BY ID_Item ASC
      `);

    return NextResponse.json({
      notification: header.recordset[0],
      samples: items.recordset,
    });
  } catch (error: any) {
    console.error('Loan notification detail error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil detail notifikasi' }, { status: 500 });
  }
}
