import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

function getTableName(): string {
  const rawTable = process.env.DB_TABLE || 'Master_Produk';
  const isValid = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(rawTable);

  if (!isValid) {
    throw new Error('Konfigurasi DB_TABLE tidak valid');
  }

  return rawTable
    .split('.')
    .map((name) => `[${name}]`)
    .join('.');
}

function getColumnMappings() {
  const raw = {
    idProduksi: process.env.DB_COL_ID_PRODUKSI || process.env.DB_COL_ID || 'ID_Sampel',
    design: process.env.DB_COL_DESIGN || 'Design',
    stokSampel: process.env.DB_COL_STOK_SAMPEL || 'Stok_Sampel',
    lemari: process.env.DB_COL_LEMARI || process.env.DB_COL_NO_LEMARI || 'Lemari',
    rakHanger: process.env.DB_COL_RAK_HANGER || 'Rak_Hanger',
    brandNameNote: process.env.DB_COL_BRAND_NOTE || 'Brand_Name_NOTE',
    tanggalProduksi: process.env.DB_COL_TANGGAL_PRODUKSI || 'Tanggal_Produksi',
    keterangan: process.env.DB_COL_KETERANGAN || 'Keterangan',
    gambar: process.env.DB_COL_GAMBAR || 'Gambar',
  };

  const isValidIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

  if (
    !isValidIdentifier(raw.idProduksi) ||
    !isValidIdentifier(raw.design) ||
    !isValidIdentifier(raw.stokSampel) ||
    !isValidIdentifier(raw.lemari) ||
    !isValidIdentifier(raw.rakHanger) ||
    !isValidIdentifier(raw.brandNameNote) ||
    !isValidIdentifier(raw.tanggalProduksi) ||
    !isValidIdentifier(raw.keterangan) ||
    !isValidIdentifier(raw.gambar)
  ) {
    throw new Error('Konfigurasi kolom database tidak valid');
  }

  return {
    raw,
    sql: {
      idProduksi: `[${raw.idProduksi}]`,
      design: `[${raw.design}]`,
      stokSampel: `[${raw.stokSampel}]`,
      lemari: `[${raw.lemari}]`,
      rakHanger: `[${raw.rakHanger}]`,
      brandNameNote: `[${raw.brandNameNote}]`,
      tanggalProduksi: `[${raw.tanggalProduksi}]`,
      keterangan: `[${raw.keterangan}]`,      gambar: `[${raw.gambar}]`,    },
  };
}

function normalizeProductRecord(record: any, columns: ReturnType<typeof getColumnMappings>['raw']) {
  const idProduksi = record?.[columns.idProduksi];
  return {
    IdProduksi: idProduksi,
    IdSampel: idProduksi,
    Design: record?.[columns.design],
    StokSampel: record?.[columns.stokSampel],
    Lemari: record?.[columns.lemari],
    RakHanger: record?.[columns.rakHanger],
    BrandNameNote: record?.[columns.brandNameNote],
    TanggalProduksi: record?.[columns.tanggalProduksi],
    Keterangan: record?.[columns.keterangan],
    Gambar: record?.[columns.gambar],
    CreatedAt: record?.CreatedAt,
  };
}

function parseFilterValues(rawValue: string | null) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function getSessionRole(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.role || null;
}

async function rejectRequesterEdit(request: NextRequest) {
  const role = await getSessionRole(request);
  if (role === 'requester') {
    return NextResponse.json({ error: 'Requester tidak memiliki akses edit data' }, { status: 403 });
  }
  return null;
}

function readPayload(body: any) {
  const parsedStok = Number(body?.stokSampel ?? body?.StokSampel ?? 0);
  return {
    idProduksi: body?.idProduksi ?? body?.IdProduksi ?? body?.idSampel ?? body?.IdSampel,
    design: body?.design ?? body?.Design,
    stokSampel: Number.isNaN(parsedStok) ? 0 : Math.max(0, Math.trunc(parsedStok)),
    lemari: String(body?.lemari ?? body?.Lemari ?? body?.noLemari ?? body?.NoLemari ?? '').trim(),
    rakHanger: body?.rakHanger ?? body?.RakHanger ?? '',
    brandNameNote: body?.brandNameNote ?? body?.BrandNameNote ?? '',
    tanggalProduksi: body?.tanggalProduksi ?? body?.TanggalProduksi ?? null,
    keterangan: body?.keterangan ?? body?.Keterangan ?? '',
    gambar: body?.gambar ?? body?.Gambar ?? body?.gambarUrl ?? body?.GambarUrl ?? '',
  };
}

async function ensureMasterProdukColumns(pool: any) {
  await pool.request().query(`
    IF COL_LENGTH('Master_Produk', 'Lemari') IS NULL
      ALTER TABLE Master_Produk ADD Lemari VARCHAR(20) NULL;

    IF COL_LENGTH('Master_Produk', 'Stok_Sampel') IS NULL
      ALTER TABLE Master_Produk ADD Stok_Sampel INT NOT NULL CONSTRAINT DF_Master_Produk_Stok_Sampel DEFAULT(0);

    IF COL_LENGTH('Master_Produk', 'Tanggal_Produksi') IS NULL
      ALTER TABLE Master_Produk ADD Tanggal_Produksi DATE NULL;

    IF COL_LENGTH('Master_Produk', 'Keterangan') IS NULL
      ALTER TABLE Master_Produk ADD Keterangan NVARCHAR(500) NULL;

    IF COL_LENGTH('Master_Produk', 'Gambar') IS NULL
      ALTER TABLE Master_Produk ADD Gambar NVARCHAR(MAX) NULL;
  `);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = (searchParams.get('search') || '').trim();
    const lemariValues = parseFilterValues(searchParams.get('lemari'));
    const rakHangerValues = parseFilterValues(searchParams.get('rakHanger'));
    
    const tableName = getTableName();
    const columns = getColumnMappings();

    const pool = await getConnection();
    await ensureMasterProdukColumns(pool);

    if (id) {
      const result = await pool.request()
        .input('idProduksi', sql.Int, Number(id))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idProduksi} = @idProduksi`);

      if (result.recordset.length === 0) {
        return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json(normalizeProductRecord(result.recordset[0], columns.raw));
    }

    // Build WHERE clause with filters
    const filters: string[] = [];
    const request_obj = pool.request();
    
    if (search) {
      request_obj.input('search', sql.VarChar(255), `%${search}%`);
      filters.push(`(${columns.sql.design} LIKE @search OR ${columns.sql.brandNameNote} LIKE @search)`);
    }
    
    if (lemariValues.length > 0) {
      if (lemariValues.includes('__empty__')) {
        filters.push(`(${columns.sql.lemari} IS NULL OR LTRIM(RTRIM(CAST(${columns.sql.lemari} AS VARCHAR(255)))) = '')`);
      }

      const nonEmptyLemariValues = lemariValues.filter((value) => value !== '__empty__');
      if (nonEmptyLemariValues.length > 0) {
        request_obj.input('lemariValues', sql.VarChar(400), nonEmptyLemariValues.join(','));
        filters.push(`${columns.sql.lemari} IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@lemariValues, ','))`);
      }
    }
    
    if (rakHangerValues.length > 0) {
      if (rakHangerValues.includes('__empty__')) {
        filters.push(`(${columns.sql.rakHanger} IS NULL OR LTRIM(RTRIM(CAST(${columns.sql.rakHanger} AS VARCHAR(255)))) = '')`);
      }

      const nonEmptyRakValues = rakHangerValues.filter((value) => value !== '__empty__');
      if (nonEmptyRakValues.length > 0) {
        request_obj.input('rakHangerValues', sql.VarChar(400), nonEmptyRakValues.join(','));
        filters.push(`${columns.sql.rakHanger} IN (SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@rakHangerValues, ','))`);
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Get total count
    const countResult = await request_obj.query(
      `SELECT COUNT(*) as total FROM ${tableName} WITH (NOLOCK) ${whereClause}`
    );
    const totalRecords = countResult.recordset[0]?.total || 0;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const listRequest = pool.request();
    if (search) {
      listRequest.input('search', sql.VarChar(255), `%${search}%`);
    }
    if (lemariValues.length > 0) {
      const nonEmptyLemariValues = lemariValues.filter((value) => value !== '__empty__');
      if (nonEmptyLemariValues.length > 0) {
        listRequest.input('lemariValues', sql.VarChar(400), nonEmptyLemariValues.join(','));
      }
    }
    if (rakHangerValues.length > 0) {
      const nonEmptyRakValues = rakHangerValues.filter((value) => value !== '__empty__');
      if (nonEmptyRakValues.length > 0) {
        listRequest.input('rakHangerValues', sql.VarChar(400), nonEmptyRakValues.join(','));
      }
    }

    const result = await listRequest
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize)
      .query(`
        SELECT ${columns.sql.idProduksi}, ${columns.sql.design}, ${columns.sql.stokSampel}, ${columns.sql.lemari}, ${columns.sql.rakHanger}, ${columns.sql.brandNameNote}, ${columns.sql.tanggalProduksi}, ${columns.sql.keterangan}, ${columns.sql.gambar}
        FROM ${tableName} WITH (NOLOCK)
        ${whereClause}
        ORDER BY ${columns.sql.idProduksi} DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    return NextResponse.json({
      data: result.recordset.map((record: any) => normalizeProductRecord(record, columns.raw)),
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: totalRecords > 0 ? page < totalPages : false,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await rejectRequesterEdit(request);
    if (denied) return denied;

    const body = await request.json();
    const { design, stokSampel, lemari, rakHanger, brandNameNote, tanggalProduksi, keterangan, gambar } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!design) {
      return NextResponse.json({ error: 'Design harus diisi' }, { status: 400 });
    }

    const resolvedTanggalProduksi = String(tanggalProduksi || '').trim() ? tanggalProduksi : new Date();

    const pool = await getConnection();
    await ensureMasterProdukColumns(pool);
    const result = await pool.request()
      .input('design', sql.VarChar(50), design)
      .input('stokSampel', sql.Int, stokSampel)
      .input('lemari', sql.VarChar(20), lemari || null)
      .input('rakHanger', sql.VarChar(20), rakHanger || null)
      .input('brandNameNote', sql.VarChar(255), brandNameNote || '')
      .input('tanggalProduksi', sql.Date, resolvedTanggalProduksi)
      .input('keterangan', sql.NVarChar(500), keterangan || null)
      .input('gambar', sql.NVarChar(sql.MAX), gambar || null)
      .query(`
        INSERT INTO ${tableName} (${columns.sql.design}, ${columns.sql.stokSampel}, ${columns.sql.lemari}, ${columns.sql.rakHanger}, ${columns.sql.brandNameNote}, ${columns.sql.tanggalProduksi}, ${columns.sql.keterangan}, ${columns.sql.gambar})
        OUTPUT INSERTED.*
        VALUES (@design, @stokSampel, @lemari, @rakHanger, @brandNameNote, @tanggalProduksi, @keterangan, @gambar)
      `);

    return NextResponse.json(normalizeProductRecord(result.recordset[0], columns.raw), { status: 201 });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = await rejectRequesterEdit(request);
    if (denied) return denied;

    const body = await request.json();
    const { idProduksi, design, stokSampel, lemari, rakHanger, brandNameNote, tanggalProduksi, keterangan, gambar } = readPayload(body);    const tableName = getTableName();
    const columns = getColumnMappings();

    if (idProduksi === undefined || idProduksi === null || Number.isNaN(Number(idProduksi))) {
      return NextResponse.json({ error: 'ID Produksi harus diisi dan berupa angka' }, { status: 400 });
    }

    if (!design) {
      return NextResponse.json({ error: 'Design harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureMasterProdukColumns(pool);
    const result = await pool.request()
      .input('idProduksi', sql.Int, Number(idProduksi))
      .input('design', sql.VarChar(50), design)
      .input('stokSampel', sql.Int, stokSampel)
      .input('lemari', sql.VarChar(20), lemari || null)
      .input('rakHanger', sql.VarChar(20), rakHanger || null)
      .input('brandNameNote', sql.VarChar(255), brandNameNote || '')
      .input('tanggalProduksi', sql.Date, tanggalProduksi || null)
      .input('keterangan', sql.NVarChar(500), keterangan || null)
      .input('gambar', sql.NVarChar(sql.MAX), gambar || null)
      .query(`
        UPDATE ${tableName}
        SET ${columns.sql.design} = @design,
            ${columns.sql.stokSampel} = @stokSampel,
            ${columns.sql.lemari} = @lemari,
            ${columns.sql.rakHanger} = @rakHanger,
            ${columns.sql.brandNameNote} = @brandNameNote,
            ${columns.sql.tanggalProduksi} = @tanggalProduksi,
            ${columns.sql.keterangan} = @keterangan,
            ${columns.sql.gambar} = @gambar
        OUTPUT INSERTED.*
        WHERE ${columns.sql.idProduksi} = @idProduksi
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(normalizeProductRecord(result.recordset[0], columns.raw));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await rejectRequesterEdit(request);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID Produksi harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    const idProduksiValue = Number(id);
    
    // Delete related spesifikasi records first (handle foreign key constraint)
    const spesifikasiTableName = (process.env.DB_SPESIFIKASI_TABLE || 'Spesifikasi')
      .split('.')
      .map((name) => `[${name}]`)
      .join('.');
    const spesifikasiIdSampelCol = `[${process.env.DB_COL_SPESIFIKASI_ID_SAMPEL || 'ID_Sampel'}]`;

    const konstruksiTableName = (process.env.DB_KONSTRUKSI_TABLE || 'Konstruksi_Tenun')
      .split('.')
      .map((name) => `[${name}]`)
      .join('.');
    const konstruksiIdSampelCol = `[${process.env.DB_COL_KONSTRUKSI_ID_SAMPEL || 'ID_Sampel'}]`;
    
    try {
      await pool.request()
        .input('idSampel', sql.Int, idProduksiValue)
        .query(`DELETE FROM ${spesifikasiTableName} WHERE ${spesifikasiIdSampelCol} = @idSampel`);
    } catch (specError: any) {
      console.warn('Warning mendapatkan related spesifikasi:', specError.message);
      // Continue - tidak ada related spesifikasi is fine
    }

    try {
      await pool.request()
        .input('idSampel', sql.Int, idProduksiValue)
        .query(`DELETE FROM ${konstruksiTableName} WHERE ${konstruksiIdSampelCol} = @idSampel`);
    } catch (konstruksiError: any) {
      console.warn('Warning mendapatkan related konstruksi:', konstruksiError.message);
      // Continue - tidak ada related konstruksi is fine
    }

    // Delete related parameter fisik records
    const parameterFisikTableName = (process.env.DB_PARAMETER_FISIK_TABLE || 'Parameter_Fisik')
      .split('.')
      .map((name) => `[${name}]`)
      .join('.');
    const parameterFisikIdSampelCol = `[${process.env.DB_COL_FISIK_ID_SAMPEL || 'ID_Sampel'}]`;

    try {
      await pool.request()
        .input('idSampel', sql.Int, idProduksiValue)
        .query(`DELETE FROM ${parameterFisikTableName} WHERE ${parameterFisikIdSampelCol} = @idSampel`);
    } catch (parameterError: any) {
      console.warn('Warning mendapatkan related parameter fisik:', parameterError.message);
      // Continue - tidak ada related parameter fisik is fine
    }
    
    // Then delete the product record
    const result = await pool.request()
      .input('idProduksi', sql.Int, idProduksiValue)
      .query(`DELETE FROM ${tableName} WHERE ${columns.sql.idProduksi} = @idProduksi; SELECT @@ROWCOUNT as deleted`);

    if (result.recordset.length === 0 || result.recordset[0].deleted === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}
