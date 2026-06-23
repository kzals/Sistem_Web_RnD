import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

/**
 * GET /api/samples-count
 * Return total count of fabric samples in Master_Produk
 */
export async function GET() {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
        ISNULL(SUM(ISNULL(Stok_Sampel, 0)), 0) as TotalStokTersedia,
        COUNT(*) as TotalProduk,
        COUNT(DISTINCT NULLIF(LTRIM(RTRIM(CAST(Design AS NVARCHAR(255)))), '')) as TotalDesign
      FROM Master_Produk
      WHERE ID_Sampel IS NOT NULL
    `);

    const totalStokTersedia = result.recordset[0]?.TotalStokTersedia || 0;
    const totalProduk = result.recordset[0]?.TotalProduk || 0;
    const totalDesign = result.recordset[0]?.TotalDesign || 0;

    return NextResponse.json({
      totalSampel: totalStokTersedia,
      totalStokTersedia,
      totalProduk,
      totalDesign,
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message, totalSampel: 0, totalStokTersedia: 0, totalProduk: 0, totalDesign: 0 },
      { status: 500 }
    );
  }
}
