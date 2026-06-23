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

    // Ensure table exists (auto-create if needed)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Loan')
      CREATE TABLE Sample_Loan (
        ID_Loan INT PRIMARY KEY IDENTITY(1,1),
        ID_Sampel INT NOT NULL,
        Customer_Name NVARCHAR(255) NOT NULL,
        Departemen NVARCHAR(255) NULL,
        Loan_Date DATETIME DEFAULT GETDATE(),
        Return_Date DATETIME NULL,
        Status NVARCHAR(50) DEFAULT 'Dipinjam',
        Notes NVARCHAR(MAX),
        Created_At DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (ID_Sampel) REFERENCES Master_Produk(ID_Sampel)
      )
    `);

    await pool.request().query(`
      IF COL_LENGTH('Sample_Loan', 'Departemen') IS NULL
      BEGIN
        ALTER TABLE Sample_Loan ADD Departemen NVARCHAR(255) NULL;
      END
    `);

    // Jika ada idSampel, return stok info untuk sampel tersebut
    if (idSampel) {
      const result = await pool.request()
        .input('idSampel', sql.Int, Number(idSampel))
        .query(`
          SELECT 
            m.ID_Sampel,
            m.Design,
            m.Lemari as Lemari,
            ISNULL(m.Rak_Hanger, '-') as RakHanger,
            ISNULL((SELECT COUNT(*) FROM Sample_Loan WHERE ID_Sampel = @idSampel AND Status = 'Dipinjam'), 0) as JumlahDipinjam,
            ISNULL((SELECT COUNT(*) FROM Sample_Loan WHERE ID_Sampel = @idSampel AND Status = 'Dikembalikan'), 0) as JumlahDikembalikan
          FROM Master_Produk m
          WHERE m.ID_Sampel = @idSampel
        `);

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { error: 'Sampel tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.recordset[0]);
    }

    // Get list riwayat pengambilan (dengan pagination dan server-side filtering)
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = (searchParams.get('search') || '').trim();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();

    // Ensure useful indexes exist to speed up common queries
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Sample_Loan_Loan_Date' AND object_id = OBJECT_ID('Sample_Loan'))
        CREATE INDEX IX_Sample_Loan_Loan_Date ON Sample_Loan(Loan_Date);
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Sample_Loan_Status' AND object_id = OBJECT_ID('Sample_Loan'))
        CREATE INDEX IX_Sample_Loan_Status ON Sample_Loan(Status);
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Sample_Loan_Departemen' AND object_id = OBJECT_ID('Sample_Loan'))
        CREATE INDEX IX_Sample_Loan_Departemen ON Sample_Loan(Departemen);
    `);

    const req = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .input('departemen', sql.NVarChar(255), effectiveDepartemen || null)
      .input('status', sql.NVarChar(50), status || null)
      .input('search', sql.NVarChar(255), search || null)
      .input('dateFrom', sql.Date, dateFrom || null)
      .input('dateTo', sql.Date, dateTo || null);

    // Build WHERE conditions compatible with parameters
    const whereClause = `
      WHERE (@departemen IS NULL OR LTRIM(RTRIM(ISNULL(sl.Departemen, ''))) = LTRIM(RTRIM(@departemen)))
        AND (
          @status IS NULL
          OR LTRIM(RTRIM(ISNULL(sl.Status, ''))) = LTRIM(RTRIM(@status))
          OR (LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Siap Dikirim' AND LTRIM(RTRIM(@status)) = 'Dipinjam')
        )
        AND (
          @search IS NULL
          OR (m.Design LIKE '%' + @search + '%' OR sl.Customer_Name LIKE '%' + @search + '%')
        )
        AND (
          @dateFrom IS NULL OR CONVERT(date, sl.Loan_Date) >= @dateFrom
        )
        AND (
          @dateTo IS NULL OR CONVERT(date, sl.Loan_Date) <= @dateTo
        )
    `;

    // total count for pagination
    const countResult = await pool.request()
      .input('departemen', sql.NVarChar(255), effectiveDepartemen || null)
      .input('status', sql.NVarChar(50), status || null)
      .input('search', sql.NVarChar(255), search || null)
      .input('dateFrom', sql.Date, dateFrom || null)
      .input('dateTo', sql.Date, dateTo || null)
      .query(`
        SELECT COUNT(*) as total
        FROM Sample_Loan sl
        LEFT JOIN Master_Produk m ON sl.ID_Sampel = m.ID_Sampel
        ${whereClause}
      `);

    const result = await req.query(`
      SELECT 
        sl.ID_Loan,
        sl.ID_Sampel,
        m.Design,
        sl.Customer_Name,
        sl.Departemen,
        sl.Loan_Date,
        sl.Return_Date,
        CASE WHEN LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Siap Dikirim' THEN 'Dipinjam' ELSE sl.Status END as Status,
        sl.Notes,
        DATEDIFF(day, sl.Loan_Date, ISNULL(sl.Return_Date, GETDATE())) as Durasi_Hari
      FROM Sample_Loan sl
      LEFT JOIN Master_Produk m ON sl.ID_Sampel = m.ID_Sampel
      ${whereClause}
      ORDER BY sl.Loan_Date DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    return NextResponse.json({ items: result.recordset, total: Number(countResult.recordset?.[0]?.total || 0) });

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
 * Buat pengambilan/peminjaman sampel baru
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

    // Validate sampel exists
    const sampelCheck = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .query('SELECT ID_Sampel FROM Master_Produk WHERE ID_Sampel = @idSampel');

    if (sampelCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Sampel tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if table exists, if not create it
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Loan')
      CREATE TABLE Sample_Loan (
        ID_Loan INT PRIMARY KEY IDENTITY(1,1),
        ID_Sampel INT NOT NULL,
        Customer_Name NVARCHAR(255) NOT NULL,
        Departemen NVARCHAR(255) NULL,
        Loan_Date DATETIME DEFAULT GETDATE(),
        Return_Date DATETIME NULL,
        Status NVARCHAR(50) DEFAULT 'Dipinjam',
        Notes NVARCHAR(MAX),
        Created_At DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (ID_Sampel) REFERENCES Master_Produk(ID_Sampel)
      )
    `);

    await pool.request().query(`
      IF COL_LENGTH('Sample_Loan', 'Departemen') IS NULL
      BEGIN
        ALTER TABLE Sample_Loan ADD Departemen NVARCHAR(255) NULL;
      END
    `);

    // Insert loan record
    const result = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .input('customerName', sql.NVarChar(255), customerName)
      .input('departemen', sql.NVarChar(255), departemen)
      .input('status', sql.NVarChar(50), status)
      .input('notes', sql.NVarChar(sql.MAX), notes || null)
      .query(`
        INSERT INTO Sample_Loan (ID_Sampel, Customer_Name, Departemen, Status, Notes)
        VALUES (@idSampel, @customerName, @departemen, @status, @notes)
        SELECT SCOPE_IDENTITY() as ID_Loan
      `);

    const loanId = result.recordset[0].ID_Loan;

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
 * Update status peminjaman
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

    // If single loanId provided, normalize to array for batch update
    const ids = Array.isArray(loanIds)
      ? loanIds.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
      : [Number(loanId)];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'loanId/loanIds tidak valid' },
        { status: 400 }
      );
    }

    // Build parameterized placeholders
    let req = pool.request();
    const placeholders = ids.map((_, index) => `@loanId${index}`).join(', ');
    ids.forEach((id: number, index: number) => {
      req = req.input(`loanId${index}`, sql.Int, id);
    });

    req = req.input('status', sql.NVarChar(50), status)
      .input('notes', sql.NVarChar(sql.MAX), notes || null);

    await req.query(`
      UPDATE Sample_Loan
      SET Status = @status,
          Return_Date = CASE WHEN @status = 'Dikembalikan' THEN GETDATE() ELSE Return_Date END,
          Notes = ISNULL(@notes, Notes)
      WHERE ID_Loan IN (${placeholders})
    `);

    return NextResponse.json({
      success: true,
      updated: ids.length,
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
 * Hapus satu atau beberapa riwayat pengambilan
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
    let req = pool.request();
    const placeholders = loanIds.map((_, index) => `@loanId${index}`).join(', ');
    loanIds.forEach((loanId, index) => {
      req = req.input(`loanId${index}`, sql.Int, loanId);
    });

    const result = await req.query(`
      DELETE FROM Sample_Loan
      WHERE ID_Loan IN (${placeholders});

      SELECT @@ROWCOUNT as deletedCount;
    `);

    const deletedCount = Number(result.recordset?.[0]?.deletedCount || 0);

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
