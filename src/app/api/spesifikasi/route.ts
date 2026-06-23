import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

function getTableName(): string {
  const rawTable = process.env.DB_SPESIFIKASI_TABLE || 'Spesifikasi';
  const isValid = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(rawTable);

  if (!isValid) {
    throw new Error('Konfigurasi DB_SPESIFIKASI_TABLE tidak valid');
  }

  return rawTable
    .split('.')
    .map((name) => `[${name}]`)
    .join('.');
}

function getColumnMappings() {
  const raw = {
    idBenang: process.env.DB_COL_SPESIFIKASI_ID || 'ID_Benang',
    idSampel: process.env.DB_COL_SPESIFIKASI_ID_SAMPEL || 'ID_Sampel',
    benangLusi: process.env.DB_COL_BENANG_LUSI || 'Benang_Lusi',
    benangPakan: process.env.DB_COL_BENANG_PAKAN || 'Benang_Pakan',
    poly: process.env.DB_COL_POLY || 'Poly',
    cd: process.env.DB_COL_CD || 'CD',
    ray: process.env.DB_COL_RAY || 'Ray',
    rw: process.env.DB_COL_RW || 'RW',
    rf: process.env.DB_COL_RF || 'RF',
    nyl: process.env.DB_COL_NYL || 'Nyl',
    pu: process.env.DB_COL_PU || 'PU',
    ros: process.env.DB_COL_ROS || 'Ros',
    tac: process.env.DB_COL_TAC || 'Tac',
    dope: process.env.DB_COL_DOPE || 'Dope',
  };

  const isValidIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

  if (
    !isValidIdentifier(raw.idBenang) ||
    !isValidIdentifier(raw.idSampel) ||
    !isValidIdentifier(raw.benangLusi) ||
    !isValidIdentifier(raw.benangPakan) ||
    !isValidIdentifier(raw.poly) ||
    !isValidIdentifier(raw.cd) ||
    !isValidIdentifier(raw.ray) ||
    !isValidIdentifier(raw.rw) ||
    !isValidIdentifier(raw.rf) ||
    !isValidIdentifier(raw.nyl) ||
    !isValidIdentifier(raw.pu) ||
    !isValidIdentifier(raw.ros) ||
    !isValidIdentifier(raw.tac) ||
    !isValidIdentifier(raw.dope)
  ) {
    throw new Error('Konfigurasi kolom spesifikasi database tidak valid');
  }

  return {
    raw,
    sql: {
      idBenang: `[${raw.idBenang}]`,
      idSampel: `[${raw.idSampel}]`,
      benangLusi: `[${raw.benangLusi}]`,
      benangPakan: `[${raw.benangPakan}]`,
      poly: `[${raw.poly}]`,
      cd: `[${raw.cd}]`,
      ray: `[${raw.ray}]`,
      rw: `[${raw.rw}]`,
      rf: `[${raw.rf}]`,
      nyl: `[${raw.nyl}]`,
      pu: `[${raw.pu}]`,
      ros: `[${raw.ros}]`,
      tac: `[${raw.tac}]`,
      dope: `[${raw.dope}]`,
    },
  };
}

function normalizeSpesifikasiRecord(record: any, columns: ReturnType<typeof getColumnMappings>['raw']) {
  return {
    IdBenang: record?.[columns.idBenang],
    IdSampel: record?.[columns.idSampel],
    BenangLusi: record?.[columns.benangLusi],
    BenangPakan: record?.[columns.benangPakan],
    Poly: record?.[columns.poly],
    CD: record?.[columns.cd],
    Ray: record?.[columns.ray],
    RW: record?.[columns.rw],
    RF: record?.[columns.rf],
    Nyl: record?.[columns.nyl],
    PU: record?.[columns.pu],
    Ros: record?.[columns.ros],
    Tac: record?.[columns.tac],
    Dope: record?.[columns.dope],
    CreatedAt: record?.CreatedAt,
  };
}

function readPayload(body: any) {
  return {
    idBenang: body?.idBenang ?? body?.IdBenang,
    idSampel: Number(body?.idSampel ?? body?.IdSampel),
    benangLusi: body?.benangLusi ?? body?.BenangLusi ?? '',
    benangPakan: body?.benangPakan ?? body?.BenangPakan ?? '',
    poly: (body?.poly ?? body?.Poly) ? Number(body?.poly ?? body?.Poly) : 0,
    cd: (body?.cd ?? body?.CD) ? Number(body?.cd ?? body?.CD) : 0,
    ray: (body?.ray ?? body?.Ray) ? Number(body?.ray ?? body?.Ray) : 0,
    rw: String(body?.rw ?? body?.RW ?? ''),
    rf: String(body?.rf ?? body?.RF ?? ''),
    nyl: (body?.nyl ?? body?.Nyl) ? Number(body?.nyl ?? body?.Nyl) : 0,
    pu: (body?.pu ?? body?.PU) ? Number(body?.pu ?? body?.PU) : 0,
    ros: (body?.ros ?? body?.Ros) ? Number(body?.ros ?? body?.Ros) : 0,
    tac: (body?.tac ?? body?.Tac) ? Number(body?.tac ?? body?.Tac) : 0,
    dope: (body?.dope ?? body?.Dope) ? Number(body?.dope ?? body?.Dope) : 0,
  };
}

async function ensureRwRfColumns(pool: any, columns: ReturnType<typeof getColumnMappings>['raw']) {
  const tableName = getTableName();
  const rawTableName = process.env.DB_SPESIFIKASI_TABLE || 'Spesifikasi';

  await pool.request().query(`
    IF COL_LENGTH('${rawTableName}', '${columns.rw}') IS NULL
    BEGIN
      ALTER TABLE ${tableName} ADD [${columns.rw}] VARCHAR(50) NULL;
    END
    ELSE IF EXISTS (
      SELECT 1
      FROM sys.columns c
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('${rawTableName}')
        AND c.name = '${columns.rw}'
        AND t.name NOT IN ('varchar', 'nvarchar')
    )
    BEGIN
      ALTER TABLE ${tableName} ALTER COLUMN [${columns.rw}] VARCHAR(50) NULL;
    END

    IF COL_LENGTH('${rawTableName}', '${columns.rf}') IS NULL
    BEGIN
      ALTER TABLE ${tableName} ADD [${columns.rf}] VARCHAR(50) NULL;
    END
    ELSE IF EXISTS (
      SELECT 1
      FROM sys.columns c
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('${rawTableName}')
        AND c.name = '${columns.rf}'
        AND t.name NOT IN ('varchar', 'nvarchar')
    )
    BEGIN
      ALTER TABLE ${tableName} ALTER COLUMN [${columns.rf}] VARCHAR(50) NULL;
    END
  `);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idSampel = searchParams.get('idSampel');
    const tableName = getTableName();
    const columns = getColumnMappings();

    const pool = await getConnection();

    if (id) {
      const result = await pool.request()
        .input('idBenang', sql.Int, Number(id))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idBenang} = @idBenang`);

      if (result.recordset.length === 0) {
        return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json(normalizeSpesifikasiRecord(result.recordset[0], columns.raw));
    }

    if (idSampel) {
      const result = await pool.request()
        .input('idSampel', sql.Int, Number(idSampel))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idSampel} = @idSampel ORDER BY ${columns.sql.idBenang} DESC`);

      return NextResponse.json(result.recordset.map((record: any) => normalizeSpesifikasiRecord(record, columns.raw)));
    }

    const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${columns.sql.idBenang} DESC`);
    return NextResponse.json(result.recordset.map((record: any) => normalizeSpesifikasiRecord(record, columns.raw)));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idSampel, benangLusi, benangPakan, poly, cd, ray, rw, rf, nyl, pu, ros, tac, dope } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!idSampel || Number.isNaN(idSampel)) {
      return NextResponse.json({ error: 'ID Sampel harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureRwRfColumns(pool, columns.raw);
    const result = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .input('benangLusi', sql.VarChar(255), benangLusi || '')
      .input('benangPakan', sql.VarChar(255), benangPakan || '')
      .input('poly', sql.Decimal(5, 2), poly || 0)
      .input('cd', sql.Decimal(5, 2), cd || 0)
      .input('ray', sql.Decimal(5, 2), ray || 0)
      .input('rw', sql.VarChar(255), rw || '')
      .input('rf', sql.VarChar(255), rf || '')
      .input('nyl', sql.Decimal(5, 2), nyl || 0)
      .input('pu', sql.Decimal(5, 2), pu || 0)
      .input('ros', sql.Decimal(5, 2), ros || 0)
      .input('tac', sql.Decimal(5, 2), tac || 0)
      .input('dope', sql.Decimal(5, 2), dope || 0)
      .query(`
        INSERT INTO ${tableName} (${columns.sql.idSampel}, ${columns.sql.benangLusi}, ${columns.sql.benangPakan}, ${columns.sql.poly}, ${columns.sql.cd}, ${columns.sql.ray}, ${columns.sql.rw}, ${columns.sql.rf}, ${columns.sql.nyl}, ${columns.sql.pu}, ${columns.sql.ros}, ${columns.sql.tac}, ${columns.sql.dope})
        OUTPUT INSERTED.*
        VALUES (@idSampel, @benangLusi, @benangPakan, @poly, @cd, @ray, @rw, @rf, @nyl, @pu, @ros, @tac, @dope)
      `);

    return NextResponse.json(normalizeSpesifikasiRecord(result.recordset[0], columns.raw), { status: 201 });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { idBenang, idSampel, benangLusi, benangPakan, poly, cd, ray, rw, rf, nyl, pu, ros, tac, dope } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    // Gunakan idBenang jika tersedia (update by ID), atau gunakan idSampel (update existing spesifikasi)
    const hasIdBenang = idBenang && !Number.isNaN(idBenang);
    const hasIdSampel = idSampel && !Number.isNaN(idSampel);

    if (!hasIdBenang && !hasIdSampel) {
      return NextResponse.json({ error: 'ID Benang atau ID Sampel harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureRwRfColumns(pool, columns.raw);
    const whereClause = hasIdBenang 
      ? `WHERE ${columns.sql.idBenang} = @idBenang`
      : `WHERE ${columns.sql.idSampel} = @idSampel`;

    const request_obj = pool.request()
      .input('benangLusi', sql.VarChar(255), benangLusi || '')
      .input('benangPakan', sql.VarChar(255), benangPakan || '')
      .input('poly', sql.Decimal(5, 2), poly || 0)
      .input('cd', sql.Decimal(5, 2), cd || 0)
      .input('ray', sql.Decimal(5, 2), ray || 0)
      .input('rw', sql.VarChar(255), rw || '')
      .input('rf', sql.VarChar(255), rf || '')
      .input('nyl', sql.Decimal(5, 2), nyl || 0)
      .input('pu', sql.Decimal(5, 2), pu || 0)
      .input('ros', sql.Decimal(5, 2), ros || 0)
      .input('tac', sql.Decimal(5, 2), tac || 0)
      .input('dope', sql.Decimal(5, 2), dope || 0);

    if (hasIdBenang) {
      request_obj.input('idBenang', sql.Int, idBenang);
    } else {
      request_obj.input('idSampel', sql.Int, idSampel);
    }

    const result = await request_obj.query(`
      UPDATE ${tableName}
      SET ${columns.sql.benangLusi} = @benangLusi,
          ${columns.sql.benangPakan} = @benangPakan,
          ${columns.sql.poly} = @poly,
          ${columns.sql.cd} = @cd,
          ${columns.sql.ray} = @ray,
          ${columns.sql.rw} = @rw,
          ${columns.sql.rf} = @rf,
          ${columns.sql.nyl} = @nyl,
          ${columns.sql.pu} = @pu,
          ${columns.sql.ros} = @ros,
          ${columns.sql.tac} = @tac,
          ${columns.sql.dope} = @dope
      OUTPUT INSERTED.*
      ${whereClause}
    `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(normalizeSpesifikasiRecord(result.recordset[0], columns.raw));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ error: 'ID Benang harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('idBenang', sql.Int, Number(id))
      .query(`DELETE FROM ${tableName} WHERE ${columns.sql.idBenang} = @idBenang; SELECT @@ROWCOUNT as deleted`);

    if (result.recordset[0].deleted === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
