import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { verifySessionToken, COOKIE_NAME, canAccessRequester } from '@/lib/auth';

/**
 * GET /api/sample-loan
 * - Dengan ?idSampel=123: Get status stok sampel tertentu
 * - Tanpa parameter: Get list riwayat semua pengambilan/peminjaman
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idSampel = searchParams.get('idSampel');
    const departemen = (searchParams.get('departemen') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const effectiveDepartemen = canAccessRequester(session?.role)
      ? String(session?.dept || '').trim()
      : departemen;
    
    const pool = await getConnection();

    if (idSampel) {
      const result = await pool.request()
        .input('idSampel', sql.Int, Number(idSampel))
        .execute('sp_SampleLoan_GetStock');

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { error: 'Sampel tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.recordset[0]);
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = (searchParams.get('search') || '').trim();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();

    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .input('departemen', sql.NVarChar(255), effectiveDepartemen || null)
      .input('status', sql.NVarChar(50), status || null)
      .input('search', sql.NVarChar(255), search || null)
      .input('dateFrom', sql.Date, dateFrom || null)
      .input('dateTo', sql.Date, dateTo || null)
      .output('totalCount', sql.Int)
      .execute('sp_SampleLoan_GetList');

    return NextResponse.json({
      items: result.recordset,
      total: result.output.totalCount || 0
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sample-loan
 * Body: {
 *   idSampel: number,
 *   customerName: string,
 *   status: 'Keluar' | 'Dipinjam',
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idSampel, customerName, departemen, status, notes } = body;

    if (!idSampel || !customerName || !departemen || !status) {
      return NextResponse.json(
        { error: 'idSampel, nama peminjam, departemen, dan status sampel harus diisi' },
        { status: 400 }
      );
    }

    if (status !== 'Dipinjam' && status !== 'Keluar') {
      return NextResponse.json(
        { error: 'Status sampel hanya boleh "Dipinjam" atau "Keluar"' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const sampelCheck = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .query('SELECT ID_Sampel FROM Master_Produk WHERE ID_Sampel = @idSampel');

    if (sampelCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Sampel tidak ditemukan' },
        { status: 404 }
      );
    }

    const result = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .input('customerName', sql.NVarChar(255), customerName)
      .input('departemen', sql.NVarChar(255), departemen)
      .input('status', sql.NVarChar(50), status)
      .input('notes', sql.NVarChar(sql.MAX), notes || null)
      .output('newLoanId', sql.Int)
      .execute('sp_SampleLoan_Insert');

    const loanId = result.output.newLoanId;

    return NextResponse.json(
      { success: true, ID_Loan: loanId, message: 'Status sampel berhasil dicatat' },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sample-loan
 * Body: {
 *   loanId: number,
 *   status: string (Dipinjam, Dikembalikan, Pending, dll),
 *   notes?: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, loanIds, status, notes } = body;

    if ((!loanId && !Array.isArray(loanIds)) || !status) {
      return NextResponse.json(
        { error: 'loanId/loanIds dan status harus diisi' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const ids = Array.isArray(loanIds)
      ? loanIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
      : [Number(loanId)];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'loanId/loanIds tidak valid' },
        { status: 400 }
      );
    }

    const result = await pool.request()
      .input('loanIds', sql.NVarChar(sql.MAX), ids.join(','))
      .input('status', sql.NVarChar(50), status)
      .input('notes', sql.NVarChar(sql.MAX), notes || null)
      .output('updated', sql.Int)
      .execute('sp_SampleLoan_UpdateStatus');

    return NextResponse.json({
      success: true,
      updated: result.output.updated || ids.length,
      message: `Status peminjaman berhasil diubah menjadi "${status}"`,
    });

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sample-loan
 * Body: {
 *   loanId?: number,
 *   loanIds?: number[]
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const loanIdsRaw = Array.isArray(body?.loanIds)
      ? body.loanIds
      : body?.loanId !== undefined
        ? [body.loanId]
        : [];

    const loanIds = Array.from(
      new Set(
        loanIdsRaw
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      )
    );

    if (loanIds.length === 0) {
      return NextResponse.json(
        { error: 'loanId/loanIds tidak valid' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    const result = await pool.request()
      .input('loanIds', sql.NVarChar(sql.MAX), loanIds.join(','))
      .output('deletedCount', sql.Int)
      .execute('sp_SampleLoan_Delete');

    const deletedCount = result.output.deletedCount || 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} riwayat pengambilan berhasil dihapus`,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
