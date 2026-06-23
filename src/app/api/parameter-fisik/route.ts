import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

function getTableName(): string {
  const rawTable = process.env.DB_PARAMETER_FISIK_TABLE || 'Parameter_Fisik';
  const isValid = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(rawTable);

  if (!isValid) {
    throw new Error('Konfigurasi DB_PARAMETER_FISIK_TABLE tidak valid');
  }

  return rawTable
    .split('.')
    .map((name) => `[${name}]`)
    .join('.');
}

function getColumnMappings() {
  const raw = {
    idFisik: process.env.DB_COL_FISIK_ID || 'ID_Fisik',
    idSampel: process.env.DB_COL_FISIK_ID_SAMPEL || 'ID_Sampel',
    corak6Angka: process.env.DB_COL_CORAK_6_ANGKA || 'Corak_6Angka',
    warna: process.env.DB_COL_WARNA || 'Warna',
    widthCm: process.env.DB_COL_WIDTH_CM || 'Width_Cm',
    lebarAct: process.env.DB_COL_LEBAR_ACT || 'Lebar_Act',
    beratBulatan: process.env.DB_COL_BERAT_BULATAN || 'Berat_Bulatan',
    grLYd: process.env.DB_COL_GR_L_YD || 'Gr_L_Yd',
    grSqm: process.env.DB_COL_GR_SQM || 'Gr_Sqm',
    grLMtr: process.env.DB_COL_GR_L_MTR || 'Gr_L_Mtr',
    grSqYd: process.env.DB_COL_GR_SQ_YD || 'Gr_SqYd',
    ozLYd: process.env.DB_COL_OZ_L_YD || 'Oz_LYd',
    ozSqYd: process.env.DB_COL_OZ_SQ_YD || 'Oz_SqYd',
    lyd58Inch: process.env.DB_COL_LYD_58_INCH || 'LYd_58_inch',
  };

  const isValidIdentifier = (value: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

  if (
    !isValidIdentifier(raw.idFisik) ||
    !isValidIdentifier(raw.idSampel) ||
    !isValidIdentifier(raw.corak6Angka) ||
    !isValidIdentifier(raw.warna) ||
    !isValidIdentifier(raw.widthCm) ||
    !isValidIdentifier(raw.lebarAct) ||
    !isValidIdentifier(raw.beratBulatan) ||
    !isValidIdentifier(raw.grLYd) ||
    !isValidIdentifier(raw.grSqm) ||
    !isValidIdentifier(raw.grLMtr) ||
    !isValidIdentifier(raw.grSqYd) ||
    !isValidIdentifier(raw.ozLYd) ||
    !isValidIdentifier(raw.ozSqYd) ||
    !isValidIdentifier(raw.lyd58Inch)
  ) {
    throw new Error('Konfigurasi kolom parameter fisik database tidak valid');
  }

  return {
    raw,
    sql: {
      idFisik: `[${raw.idFisik}]`,
      idSampel: `[${raw.idSampel}]`,
      corak6Angka: `[${raw.corak6Angka}]`,
      warna: `[${raw.warna}]`,
      widthCm: `[${raw.widthCm}]`,
      lebarAct: `[${raw.lebarAct}]`,
      beratBulatan: `[${raw.beratBulatan}]`,
      grLYd: `[${raw.grLYd}]`,
      grSqm: `[${raw.grSqm}]`,
      grLMtr: `[${raw.grLMtr}]`,
      grSqYd: `[${raw.grSqYd}]`,
      ozLYd: `[${raw.ozLYd}]`,
      ozSqYd: `[${raw.ozSqYd}]`,
      lyd58Inch: `[${raw.lyd58Inch}]`,
    },
  };
}

function normalizeParameterFisikRecord(record: any, columns: ReturnType<typeof getColumnMappings>['raw']) {
  return {
    IdFisik: record?.[columns.idFisik],
    IdSampel: record?.[columns.idSampel],
    Corak6Angka: record?.[columns.corak6Angka],
    Warna: record?.[columns.warna],
    WidthCm: record?.[columns.widthCm],
    LebarAct: record?.[columns.lebarAct],
    BeratBulatan: record?.[columns.beratBulatan],
    GrLYd: record?.[columns.grLYd],
    GrSqm: record?.[columns.grSqm],
    GrLMtr: record?.[columns.grLMtr],
    GrSqYd: record?.[columns.grSqYd],
    OzLYd: record?.[columns.ozLYd],
    OzSqYd: record?.[columns.ozSqYd],
    LYd58Inch: record?.[columns.lyd58Inch],
    CreatedAt: record?.CreatedAt,
  };
}

function readPayload(body: any) {
  return {
    idFisik: body?.idFisik ?? body?.IdFisik,
    idSampel: Number(body?.idSampel ?? body?.IdSampel),
    corak6Angka: String(body?.corak6Angka ?? body?.Corak6Angka ?? '').trim(),
    warna: String(body?.warna ?? body?.Warna ?? '').trim(),
    widthCm: String(body?.widthCm ?? body?.WidthCm ?? '').trim(),
    lebarAct: Number(body?.lebarAct ?? body?.LebarAct),
    beratBulatan: Number(body?.beratBulatan ?? body?.BeratBulatan),
    grLYd: Number(body?.grLYd ?? body?.GrLYd),
    grSqm: Number(body?.grSqm ?? body?.GrSqm),
    grLMtr: Number(body?.grLMtr ?? body?.GrLMtr),
    grSqYd: Number(body?.grSqYd ?? body?.GrSqYd),
    ozLYd: Number(body?.ozLYd ?? body?.OzLYd),
    ozSqYd: Number(body?.ozSqYd ?? body?.OzSqYd),
    lyd58Inch: Number(body?.lyd58Inch ?? body?.LYd58Inch),
  };
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
        .input('idFisik', sql.Int, Number(id))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idFisik} = @idFisik`);

      if (result.recordset.length === 0) {
        return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json(normalizeParameterFisikRecord(result.recordset[0], columns.raw));
    }

    if (idSampel) {
      const result = await pool.request()
        .input('idSampel', sql.Int, Number(idSampel))
        .query(`SELECT * FROM ${tableName} WHERE ${columns.sql.idSampel} = @idSampel ORDER BY ${columns.sql.idFisik} DESC`);

      return NextResponse.json(result.recordset.map((record: any) => normalizeParameterFisikRecord(record, columns.raw)));
    }

    const result = await pool.request().query(`SELECT * FROM ${tableName} ORDER BY ${columns.sql.idFisik} DESC`);
    return NextResponse.json(result.recordset.map((record: any) => normalizeParameterFisikRecord(record, columns.raw)));
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idSampel, corak6Angka, warna, widthCm, lebarAct, beratBulatan, grLYd, grSqm, grLMtr, grSqYd, ozLYd, ozSqYd, lyd58Inch } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    if (!idSampel || Number.isNaN(idSampel)) {
      return NextResponse.json({ error: 'ID Sampel harus diisi' }, { status: 400 });
    }

    // Semua parameter fisik sekarang opsional

    const pool = await getConnection();
    const result = await pool.request()
      .input('idSampel', sql.Int, idSampel)
      .input('corak6Angka', sql.VarChar(50), corak6Angka)
      .input('warna', sql.VarChar(100), warna)
      .input('widthCm', sql.VarChar(50), widthCm)
      .input('lebarAct', sql.Decimal(10, 2), lebarAct)
      .input('beratBulatan', sql.Decimal(10, 2), beratBulatan)
      .input('grLYd', sql.Decimal(10, 2), grLYd)
      .input('grSqm', sql.Decimal(10, 2), grSqm)
      .input('grLMtr', sql.Decimal(10, 2), grLMtr)
      .input('grSqYd', sql.Decimal(10, 2), grSqYd)
      .input('ozLYd', sql.Decimal(10, 2), ozLYd)
      .input('ozSqYd', sql.Decimal(10, 2), ozSqYd)
      .input('lyd58Inch', sql.Decimal(10, 2), lyd58Inch)
      .query(`
        INSERT INTO ${tableName} (${columns.sql.idSampel}, ${columns.sql.corak6Angka}, ${columns.sql.warna}, ${columns.sql.widthCm}, ${columns.sql.lebarAct}, ${columns.sql.beratBulatan}, ${columns.sql.grLYd}, ${columns.sql.grSqm}, ${columns.sql.grLMtr}, ${columns.sql.grSqYd}, ${columns.sql.ozLYd}, ${columns.sql.ozSqYd}, ${columns.sql.lyd58Inch})
        OUTPUT INSERTED.*
        VALUES (@idSampel, @corak6Angka, @warna, @widthCm, @lebarAct, @beratBulatan, @grLYd, @grSqm, @grLMtr, @grSqYd, @ozLYd, @ozSqYd, @lyd58Inch)
      `);

    return NextResponse.json(normalizeParameterFisikRecord(result.recordset[0], columns.raw), { status: 201 });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { idFisik, idSampel, corak6Angka, warna, widthCm, lebarAct, beratBulatan, grLYd, grSqm, grLMtr, grSqYd, ozLYd, ozSqYd, lyd58Inch } = readPayload(body);
    const tableName = getTableName();
    const columns = getColumnMappings();

    const hasIdFisik = idFisik && !Number.isNaN(Number(idFisik));
    const hasIdSampel = idSampel && !Number.isNaN(Number(idSampel));

    if (!hasIdFisik && !hasIdSampel) {
      return NextResponse.json({ error: 'ID Fisik atau ID Sampel harus diisi' }, { status: 400 });
    }

    // Semua parameter fisik sekarang opsional

    const pool = await getConnection();
    const whereClause = hasIdFisik
      ? `WHERE ${columns.sql.idFisik} = @idFisik`
      : `WHERE ${columns.sql.idSampel} = @idSampel`;

    const requestObject = pool.request()
      .input('corak6Angka', sql.VarChar(50), corak6Angka)
      .input('warna', sql.VarChar(100), warna)
      .input('widthCm', sql.VarChar(50), widthCm)
      .input('lebarAct', sql.Decimal(10, 2), lebarAct)
      .input('beratBulatan', sql.Decimal(10, 2), beratBulatan)
      .input('grLYd', sql.Decimal(10, 2), grLYd)
      .input('grSqm', sql.Decimal(10, 2), grSqm)
      .input('grLMtr', sql.Decimal(10, 2), grLMtr)
      .input('grSqYd', sql.Decimal(10, 2), grSqYd)
      .input('ozLYd', sql.Decimal(10, 2), ozLYd)
      .input('ozSqYd', sql.Decimal(10, 2), ozSqYd)
      .input('lyd58Inch', sql.Decimal(10, 2), lyd58Inch);

    if (hasIdFisik) {
      requestObject.input('idFisik', sql.Int, Number(idFisik));
    } else {
      requestObject.input('idSampel', sql.Int, Number(idSampel));
    }

    const result = await requestObject.query(`
      UPDATE ${tableName}
        SET ${columns.sql.corak6Angka} = @corak6Angka,
          ${columns.sql.warna} = @warna,
          ${columns.sql.widthCm} = @widthCm,
          ${columns.sql.lebarAct} = @lebarAct,
          ${columns.sql.beratBulatan} = @beratBulatan,
          ${columns.sql.grLYd} = @grLYd,
          ${columns.sql.grSqm} = @grSqm,
          ${columns.sql.grLMtr} = @grLMtr,
          ${columns.sql.grSqYd} = @grSqYd,
          ${columns.sql.ozLYd} = @ozLYd,
          ${columns.sql.ozSqYd} = @ozSqYd,
          ${columns.sql.lyd58Inch} = @lyd58Inch
      OUTPUT INSERTED.*
      ${whereClause}
    `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(normalizeParameterFisikRecord(result.recordset[0], columns.raw));
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
      return NextResponse.json({ error: 'ID Fisik harus diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('idFisik', sql.Int, Number(id))
      .query(`DELETE FROM ${tableName} WHERE ${columns.sql.idFisik} = @idFisik; SELECT @@ROWCOUNT as deleted`);

    if (result.recordset[0].deleted === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data berhasil dihapus' });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
