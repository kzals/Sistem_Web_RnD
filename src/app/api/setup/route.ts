import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// API untuk mengecek status koneksi database
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug');

  try {
    const pool = await getConnection();

    if (debug === 'return-notif') {
      const tableCheck = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Return_Notifications'
      `);
      const tableExists = Number(tableCheck.recordset[0]?.cnt || 0) > 0;
      if (!tableExists) {
        return NextResponse.json({ tableExists: false, total: 0, records: [] });
      }
      const records = await pool.request().query(`
        SELECT TOP 20 ID_Notification, Count_Items, Sender_Departemen, Is_Read, Pickup_Status, Created_At
        FROM Sample_Return_Notifications ORDER BY Created_At DESC
      `);
      return NextResponse.json({ tableExists: true, records: records.recordset });
    }

    // Cek status koneksi
    const result = await pool.request().query('SELECT @@VERSION as version');
    return NextResponse.json({ 
      status: 'connected',
      version: result.recordset[0].version 
    });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
}
