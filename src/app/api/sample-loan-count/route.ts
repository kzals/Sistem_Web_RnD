import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

/**
 * GET /api/sample-loan-count
 * Returns count of samples in different statuses
 */
export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
        ISNULL(SUM(CASE WHEN Status = 'Dipinjam' THEN 1 ELSE 0 END), 0) as totalDipinjam,
        ISNULL(SUM(CASE WHEN Status = 'Dikembalikan' THEN 1 ELSE 0 END), 0) as totalDikembalikan,
        ISNULL(SUM(CASE WHEN Status = 'Keluar' THEN 1 ELSE 0 END), 0) as totalKeluar,
        COUNT(*) as totalRecords
      FROM Sample_Loan
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({
        totalDipinjam: 0,
        totalDikembalikan: 0,
        totalKeluar: 0,
        totalRecords: 0,
      });
    }

    return NextResponse.json(result.recordset[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
