import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

function getTableName(): string {
  const rawTable = process.env.DB_KONSTRUKSI_TABLE || 'Konstruksi_Tenun';
  const isValid = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(rawTable);

  if (!isValid) {
    throw new Error('Konfigurasi DB_KONSTRUKSI_TABLE tidak valid');
  }

  return rawTable
    .split('.')
    .map((name) => `[${name}]`)
    .join('.');
}

function getColumnMappings() {
  const raw = {
    idKonstruksi: process.env.DB_COL_KONSTRUKSI_ID || 'ID_Konstruksi',
    idProduksi: process.env.DB_COL_KONSTRUKSI_ID_PRODUKSI || process.env.DB_COL_KONSTRUKSI_ID_SAMPEL || 'ID_Sampel',
    weaveConstr: process.env.DB_COL_WEAVE_CONSTR || 'Weave_Constr',
    density: process.env.DB_COL_DENSITY || 'Density',
    densityWarp: process.env.DB_COL_DENSITY_WARP || 'Density_Warp',
    densityWeft: process.env.DB_COL_DENSITY_WEFT || 'Density_Weft',
    nomorSisir: process.env.DB_COL_NOMOR_SISIR || 'Nomor_Sisir',
    lebarSisir: process.env.DB_COL_LEBAR_SISIR || 'Lebar_Sisir',
  };

  const isValidIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

  if (
    !isValidIdentifier(raw.idKonstruksi) ||
    !isValidIdentifier(raw.idProduksi) ||
    !isValidIdentifier(raw.weaveConstr) ||
    !isValidIdentifier(raw.density) ||
    !isValidIdentifier(raw.densityWarp) ||
    !isValidIdentifier(raw.densityWeft) ||
    !isValidIdentifier(raw.nomorSisir) ||
    !isValidIdentifier(raw.lebarSisir)
  ) {
    throw new Error('Konfigurasi kolom konstruksi database tidak valid');
  }

  return {
    raw,
    sql: {
      idKonstruksi: `[${raw.idKonstruksi}]`,
      idProduksi: `[${raw.idProduksi}]`,
      weaveConstr: `[${raw.weaveConstr}]`,
      density: `[${raw.density}]`,
      densityWarp: `[${raw.densityWarp}]`,
      densityWeft: `[${raw.densityWeft}]`,
      nomorSisir: `[${raw.nomorSisir}]`,
      lebarSisir: `[${raw.lebarSisir}]`,
    },
  };
}

function normalizeKonstruksiRecord(record: any, columns: ReturnType<typeof getColumnMappings>['raw']) {
  const idProduksi = record?.[columns.idProduksi];
  return {
    IdKonstruksi: record?.[columns.idKonstruksi],
    IdProduksi: idProduksi,
    IdSampel: idProduksi,
    WeaveConstr: record?.[columns.weaveConstr],
    Density: record?.[columns.density],
    DensityWarp: record?.[columns.densityWarp],
    DensityWeft: record?.[columns.densityWeft],
    NomorSisir: record?.[columns.nomorSisir],
    LebarSisir: record?.[columns.lebarSisir],
    CreatedAt: record?.CreatedAt,
  };
}

function readPayload(body: any) {
  const toNullableDecimal = (value: any) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  };

  return {
    idKonstruksi: body?.idKonstruksi ?? body?.IdKonstruksi,
    idProduksi: Number(body?.idProduksi ?? body?.IdProduksi ?? body?.idSampel ?? body?.IdSampel),
    weaveConstr: body?.weaveConstr ?? body?.WeaveConstr ?? '',
    density: body?.density ?? body?.Density ?? '',
    densityWarp: Number(body?.densityWarp ?? body?.DensityWarp),
    densityWeft: Number(body?.densityWeft ?? body?.DensityWeft),
    nomorSisir: toNullableDecimal(body?.nomorSisir ?? body?.NomorSisir),
    lebarSisir: toNullableDecimal(body?.lebarSisir ?? body?.LebarSisir),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idProduksi = searchParams.get('idProduksi') ?? searchParams.get('idSampel');
    const tableName = getTableName();
    const columns = getColumnMappings();

    const pool = await getConnection();

    if (id) {
      const result = await pool.request()
        .input('idKonstruksi', sql.Int, Number(id))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idKonstruksi} = @idKonstruksi`);

      if (result.recordset.length === 0) {
        return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json(normalizeKonstruksiRecord(result.recordset[0], columns.raw));
    }

    if (idProduksi) {
      const result = await pool.request()
        .input('idProduksi', sql.Int, Number(idProduksi))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idProduksi} = @idProduksi ORDER BY ${columns.sql.idKonstruksi} DESC`);

      return NextResponse.json(result.recordset.map((record: any) => normalizeKonstruksiRecord(record, columns.raw)));
    }

    const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${columns.sql.idKonstruksi} DESC`);
    return NextResponse.json(result.recordset.map((record: any) => normalizeKonstruksiRecord(record, columns.raw)));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idProduksi, weaveConstr, density, densityWarp, densityWeft, nomorSisir, lebarSisir } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!idProduksi || Number.isNaN(idProduksi)) {
      return NextResponse.json({ error: 'ID Produksi harus diisi' }, { status: 400 });
    }

    // WeaveConstr, DensityWarp, dan DensityWeft sekarang opsional

    const pool = await getConnection();
    const result = await pool.request()
      .input('idProduksi', sql.Int, idProduksi)
      .input('weaveConstr', sql.VarChar(100), weaveConstr)
      .input('densityWarp', sql.Int, densityWarp)
      .input('densityWeft', sql.Int, densityWeft)
      .input('nomorSisir', sql.Decimal(5, 2), nomorSisir ?? null)
      .input('lebarSisir', sql.Decimal(5, 2), lebarSisir ?? null)
      .query(`
        INSERT INTO ${tableName} (${columns.sql.idProduksi}, ${columns.sql.weaveConstr}, ${columns.sql.densityWarp}, ${columns.sql.densityWeft}, ${columns.sql.nomorSisir}, ${columns.sql.lebarSisir})
        OUTPUT INSERTED.*
        VALUES (@idProduksi, @weaveConstr, @densityWarp, @densityWeft, @nomorSisir, @lebarSisir)
      `);

    return NextResponse.json(normalizeKonstruksiRecord(result.recordset[0], columns.raw), { status: 201 });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { idKonstruksi, idProduksi, weaveConstr, density, densityWarp, densityWeft, nomorSisir, lebarSisir } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    const hasIdKonstruksi = idKonstruksi && !Number.isNaN(Number(idKonstruksi));
    const hasIdProduksi = idProduksi && !Number.isNaN(Number(idProduksi));

    if (!hasIdKonstruksi && !hasIdProduksi) {
      return NextResponse.json({ error: 'ID Konstruksi atau ID Produksi harus diisi' }, { status: 400 });
    }

    // WeaveConstr, DensityWarp, dan DensityWeft sekarang opsional

    const pool = await getConnection();
    const whereClause = hasIdKonstruksi
      ? `WHERE ${columns.sql.idKonstruksi} = @idKonstruksi`
      : `WHERE ${columns.sql.idProduksi} = @idProduksi`;

    const requestObject = pool.request()
      .input('weaveConstr', sql.VarChar(100), weaveConstr)
      .input('densityWarp', sql.Int, densityWarp)
      .input('densityWeft', sql.Int, densityWeft)
      .input('nomorSisir', sql.Decimal(5, 2), nomorSisir ?? null)
      .input('lebarSisir', sql.Decimal(5, 2), lebarSisir ?? null);

    if (hasIdKonstruksi) {
      requestObject.input('idKonstruksi', sql.Int, Number(idKonstruksi));
    } else {
      requestObject.input('idProduksi', sql.Int, Number(idProduksi));
    }

    const result = await requestObject.query(`
      UPDATE ${tableName}
      SET ${columns.sql.weaveConstr} = @weaveConstr,
          ${columns.sql.densityWarp} = @densityWarp,
          ${columns.sql.densityWeft} = @densityWeft,
          ${columns.sql.nomorSisir} = @nomorSisir,
          ${columns.sql.lebarSisir} = @lebarSisir
      OUTPUT INSERTED.*
      ${whereClause}
    `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(normalizeKonstruksiRecord(result.recordset[0], columns.raw));
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
      return NextResponse.json({ error: 'ID Konstruksi harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('idKonstruksi', sql.Int, Number(id))
      .query(`DELETE FROM ${tableName} WHERE ${columns.sql.idKonstruksi} = @idKonstruksi; SELECT @@ROWCOUNT as deleted`);

    if (result.recordset[0].deleted === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
