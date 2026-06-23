import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

// Dynamic import untuk XLSX (untuk menghindari issues di build time)
let XLSX: any = null;

try {
  XLSX = require('xlsx');
} catch (e) {
  console.warn('XLSX library not available yet');
}

interface ParsedRow {
  lemari: string | null;
  rakHanger: string;
  design: string;
  jenisBenangLusi: string;
  pakan: string;
  densityWarp: number;
  densityWeft: number;
  poly: number;
  cd: number;
  ray: number;
  rw: string;
  rf: string;
  nyl: number;
  pu: number;
  ros: number;
  tac: number;
  dope: number;
  weaveConstr: string;
  nomorSisir: number;
  lebarSisir: number;
  grLYd: number;
  lYd58Inch: number;
  grSqm: number;
  grLMtr: number;
  grSqYd: number;
  ozLYd: number;
  ozSqYd: number;
  widthCm: string;
  lebarAct: number;
  beratBulatan: number;
  corak6Angka: string;
  warna: string;
  brandNameNote?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

type RowToProcess = {
  rowNumber: number;
  rowData: any[];
  rakHangerCell: any;
};

const IMPORT_CHUNK_SIZE = 200;
const IMPORT_CONCURRENCY = 4;

function normalizeCellText(value: any): string {
  return String(value ?? '').trim().toLowerCase();
}

function scoreWorksheetForImport(rows: any[]): number {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  let score = 0;

  // 1) Kecocokan header/label kolom pada baris awal
  const headerRows = rows.slice(0, 10);
  const headerText = headerRows
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .map((cell) => normalizeCellText(cell))
    .join(' ');

  const expectedTokens = [
    'design',
    'rak',
    'hanger',
    'lusi',
    'pakan',
    'weave',
    'density',
    'width',
    'warna',
    'corak',
    'sisir',
    'poly',
    'ray',
    'rw',
    'rf',
    'oz',
    'gr',
  ];

  const tokenMatches = expectedTokens.reduce((acc, token) => {
    return acc + (headerText.includes(token) ? 1 : 0);
  }, 0);

  score += tokenMatches * 2;

  // 2) Kecocokan pola data berdasarkan mapping kolom saat ini (mulai baris ke-6)
  const dataRows = rows.slice(5, 105).filter((row) => Array.isArray(row));

  const designRows = dataRows.filter((row) => normalizeCellText(row[1]) !== '').length;
  score += Math.min(designRows, 30) * 0.6;

  const rackRows = dataRows.filter((row) => normalizeCellText(row[0]) !== '').length;
  score += Math.min(rackRows, 20) * 0.3;

  const numericCols = [4, 5, 6, 13, 15, 18, 23, 24, 46, 47];
  const numericRows = dataRows.filter((row) => {
    let numericHit = 0;
    for (const col of numericCols) {
      const cell = row[col];
      if (cell === '' || cell === null || cell === undefined) {
        continue;
      }
      const value = Number(cell);
      if (!Number.isNaN(value)) {
        numericHit++;
      }
    }
    return numericHit >= 2;
  }).length;

  score += Math.min(numericRows, 20) * 0.5;

  return score;
}

function pickWorksheetName(workbook: any): { sheetName: string | null; mode: 'preferred' | 'auto' | 'none' } {
  const sheetNames: string[] = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
  if (sheetNames.length === 0) {
    return { sheetName: null, mode: 'none' };
  }

  // Mode 1: prioritas nama sheet "Sumber"
  if (sheetNames.includes('Sumber')) {
    return { sheetName: 'Sumber', mode: 'preferred' };
  }

  // Fallback: cari sheet paling cocok berdasarkan skor struktur + konten
  let bestSheetName: string | null = null;
  let bestScore = 0;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[];
    const score = scoreWorksheetForImport(rows);
    if (score > bestScore) {
      bestScore = score;
      bestSheetName = sheetName;
    }
  }

  if (!bestSheetName || bestScore < 6) {
    return { sheetName: null, mode: 'none' };
  }

  return { sheetName: bestSheetName, mode: 'auto' };
}

function mapLemariFromCellStyle(cell: any): { lemari: string | null; ambiguous: boolean } {
  if (!cell || !cell.s) {
    return { lemari: null, ambiguous: true };
  }

  const fg = cell.s.fgColor;
  if (!fg) {
    return { lemari: null, ambiguous: true };
  }

  const rgbRaw = fg.rgb ? String(fg.rgb).toUpperCase() : '';
  const rgb = rgbRaw.startsWith('FF') && rgbRaw.length === 8 ? rgbRaw.slice(2) : rgbRaw;

  // Theme putih bawaan dianggap ambigu. Putih akan diputuskan oleh fallback berbasis isi Rak Hanger.
  if (fg.theme === 0) return { lemari: null, ambiguous: true };
  if (rgb === 'FFFFFF') return { lemari: 'Putih', ambiguous: false };
  if (rgb === 'FFFF00') return { lemari: 'Kuning', ambiguous: false };
  if (rgb === '0000FF') return { lemari: 'Biru', ambiguous: false };
  if (rgb === 'FF0000') return { lemari: 'Merah', ambiguous: false };
  if (rgb === '00CC99' || rgb === '00FF00') return { lemari: 'Hijau', ambiguous: false };

  return { lemari: null, ambiguous: true };
}


function validateRow(row: any, rowNumber: number, rakHangerCell: any): { valid: boolean; data?: ParsedRow; error?: string } {
  try {
    const toNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    const toString = (val: any): string => {
      return val ? String(val).trim() : '';
    };

    // Extract data dari row array (template sheet import)
    // A:Rak Hanger (warna cell dipakai untuk mapping Lemari), B:Design, C:Lusi, D:Pakan
    // E-L:Composition, M:Weave Constr, N:Density Warp, P:Density Weft
    // Q:Gr/L Yd, R:L/Yd(58"), S:Gr/Sqm, T:Gr/L Mtr, U:Gr/SqYd, V:Oz/LYd
    // W:Width(Cm), X:Lebar Act, Y:Berat Bulatan, Z:Oz/SqYd, AA:Brand Name Note
    // AF:RW, AG:RF, AI:Warna, AO:Corak 6 Angka, AU:Nomor Sisir, AV:Lebar Sisir
    const rakHanger = toString(row[0]); // Col A
    const styleResult = mapLemariFromCellStyle(rakHangerCell);
    const lemari = styleResult.ambiguous
      ? (rakHanger ? 'Putih' : null)
      : styleResult.lemari;
    const design = toString(row[1]); // Col B
    const jenisBenangLusi = toString(row[2]); // Col C
    const pakan = toString(row[3]); // Col D

    // Composition columns (E-L)
    const poly = toNumber(row[4]); // Col E
    const cd = toNumber(row[5]); // Col F
    const ray = toNumber(row[6]); // Col G
    const nyl = toNumber(row[7]); // Col H
    const pu = toNumber(row[8]); // Col I
    const ros = toNumber(row[9]); // Col J
    const tac = toNumber(row[10]); // Col K
    const dope = toNumber(row[11]); // Col L


    const weaveConstr = toString(row[12]); // Col M
    const densityWarp = toNumber(row[13]); // Col N - Density
    const densityWeft = toNumber(row[15]); // Col P - second density value
    const grLYd = toNumber(row[16]); // Col Q - Gr/L Yd
    const lYd58Inch = toNumber(row[17]); // Col R - L/Yd (58")
    const grSqm = toNumber(row[18]); // Col S - Gr/Sqm
    const grLMtr = toNumber(row[19]); // Col T - Gr/L Mtr
    const grSqYd = toNumber(row[20]); // Col U - Gr/SqYd
    const ozLYd = toNumber(row[21]); // Col V - Oz/LYd
    const widthCm = toString(row[22]); // Col W - Width (Cm)
    const lebarAct = toNumber(row[23]); // Col X - Lebar Act
    const beratBulatan = toNumber(row[24]); // Col Y - Berat Bulatan
    const ozSqYd = toNumber(row[25]); // Col Z - Oz/SqYd
    const brandNameNote = toString(row[26]); // Col AA - Brand Name NOTE
    const rw = toString(row[31]); // Col AF - RW
    const rf = toString(row[32]); // Col AG - RF
    const warna = toString(row[34]); // Col AI - Warna
    const corak6Angka = toString(row[40]); // Col AO - Corak 6 Angka
    const nomorSisir = toNumber(row[46]); // Col AU - Nomor Sisir
    const lebarSisir = toNumber(row[47]); // Col AV - Lebar Sisir

    // Validasi field required - hanya Design yang wajib
    if (!design) {
      return { valid: false, error: 'Design harus diisi' };
    }
    
    // Field lainnya (termasuk Benang Lusi/Pakan, Lemari dari warna, Weave Constr, Density, Parameter Fisik) boleh kosong

    return {
      valid: true,
      data: {
        lemari,
        rakHanger,
        design,
        jenisBenangLusi,
        pakan,
        poly,
        cd,
        ray,
        rw,
        rf,
        nyl,
        pu,
        ros,
        tac,
        dope,
        weaveConstr,
        densityWarp,
        densityWeft,
        nomorSisir,
        lebarSisir,
        grLYd,
        lYd58Inch,
        grSqm,
        grLMtr,
        grSqYd,
        ozLYd,
        ozSqYd,
        widthCm,
        lebarAct,
        beratBulatan,
        corak6Angka,
        warna,
        brandNameNote: brandNameNote || undefined,
      },
    };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

async function insertRowData(
  pool: any,
  data: ParsedRow
): Promise<{ success: boolean; error?: string }> {
  let transaction: any = null;
  try {
    // Satu transaksi + satu round-trip query per baris untuk menjaga konsistensi
    // sekaligus mengurangi overhead query berulang.
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const request = new sql.Request(transaction)
      .input('design', sql.VarChar(255), data.design)
      .input('lemari', sql.VarChar(20), data.lemari)
      .input('rakHanger', sql.VarChar(50), data.rakHanger || null)
      .input('brandNote', sql.VarChar(255), data.brandNameNote || null)
      .input('benangLusi', sql.VarChar(255), data.jenisBenangLusi || '')
      .input('benangPakan', sql.VarChar(255), data.pakan || '')
      .input('poly', sql.Numeric(5, 2), data.poly)
      .input('cd', sql.Numeric(5, 2), data.cd)
      .input('ray', sql.Numeric(5, 2), data.ray)
      .input('rw', sql.VarChar(255), data.rw || null)
      .input('rf', sql.VarChar(255), data.rf || null)
      .input('nyl', sql.Numeric(5, 2), data.nyl)
      .input('pu', sql.Numeric(5, 2), data.pu)
      .input('ros', sql.Numeric(5, 2), data.ros)
      .input('tac', sql.Numeric(5, 2), data.tac)
      .input('dope', sql.Numeric(5, 2), data.dope)
      .input('weaveConstr', sql.VarChar(100), data.weaveConstr)
      .input('densityWarp', sql.Int, Math.round(data.densityWarp))
      .input('densityWeft', sql.Int, Math.round(data.densityWeft))
      .input('nomorSisir', sql.Decimal(5, 2), data.nomorSisir || null)
      .input('lebarSisir', sql.Decimal(5, 2), data.lebarSisir || null)
      .input('widthCm', sql.VarChar(50), data.widthCm)
      .input('lebarAct', sql.Decimal(10, 2), data.lebarAct)
      .input('beratBulatan', sql.Decimal(10, 2), data.beratBulatan)
      .input('grLYd', sql.Decimal(10, 2), data.grLYd)
      .input('grSqm', sql.Decimal(10, 2), data.grSqm)
      .input('grLMtr', sql.Decimal(10, 2), data.grLMtr)
      .input('grSqYd', sql.Decimal(10, 2), data.grSqYd)
      .input('ozLYd', sql.Decimal(10, 2), data.ozLYd)
      .input('ozSqYd', sql.Decimal(10, 2), data.ozSqYd)
      .input('lYd58Inch', sql.Decimal(10, 2), data.lYd58Inch)
      .input('corak6Angka', sql.VarChar(50), data.corak6Angka || null)
      .input('warna', sql.VarChar(100), data.warna || null);

    await request.query(`
      DECLARE @Inserted TABLE (ID_Sampel INT);

      INSERT INTO Master_Produk ([Design], [Lemari], [Rak_Hanger], [Brand_Name_NOTE])
      OUTPUT INSERTED.[ID_Sampel] INTO @Inserted(ID_Sampel)
      VALUES (@design, @lemari, @rakHanger, @brandNote);

      INSERT INTO Spesifikasi
      ([ID_Sampel], [Benang_Lusi], [Benang_Pakan], [Poly], [CD], [Ray], [RW], [RF], [Nyl], [PU], [Ros], [Tac], [Dope])
      SELECT ID_Sampel, @benangLusi, @benangPakan, @poly, @cd, @ray, @rw, @rf, @nyl, @pu, @ros, @tac, @dope
      FROM @Inserted;

      INSERT INTO Konstruksi_Tenun
      ([ID_Sampel], [Weave_Constr], [Density_Warp], [Density_Weft], [Nomor_Sisir], [Lebar_Sisir])
      SELECT ID_Sampel, @weaveConstr, @densityWarp, @densityWeft, @nomorSisir, @lebarSisir
      FROM @Inserted;

      INSERT INTO Parameter_Fisik
      ([ID_Sampel], [Corak_6Angka], [Warna], [Width_Cm], [Lebar_Act], [Berat_Bulatan], [Gr_L_Yd], [Gr_Sqm], [Gr_L_Mtr], [Gr_SqYd], [Oz_LYd], [Oz_SqYd], [LYd_58_inch])
      SELECT ID_Sampel, @corak6Angka, @warna, @widthCm, @lebarAct, @beratBulatan, @grLYd, @grSqm, @grLMtr, @grSqYd, @ozLYd, @ozSqYd, @lYd58Inch
      FROM @Inserted;
    `);

    await transaction.commit();

    return { success: true };
  } catch (error: any) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // noop
      }
    }
    return { success: false, error: error.message };
  }
}

async function processRowBatch(
  pool: any,
  batch: RowToProcess[],
  result: ImportResult
) {
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor++;

      if (index >= batch.length) {
        break;
      }

      const item = batch[index];
      const validation = validateRow(item.rowData, item.rowNumber, item.rakHangerCell);

      if (!validation.valid) {
        result.failed++;
        result.errors.push({
          row: item.rowNumber,
          message: validation.error || 'Unknown error',
        });
        continue;
      }

      const insertResult = await insertRowData(pool, validation.data!);
      if (insertResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          row: item.rowNumber,
          message: insertResult.error || 'Gagal insert data',
        });
      }
    }
  };

  const workerCount = Math.max(1, Math.min(IMPORT_CONCURRENCY, batch.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export async function POST(request: NextRequest) {
  try {
    const startedAt = Date.now();
    if (!XLSX) {
      return NextResponse.json(
        { error: 'Sistem excel parser belum tersedia. Silakan jalankan: npm install xlsx --legacy-peer-deps' },
        { status: 500 }
      );
    }

    const pool = await getConnection();
    await pool.request().query(`
      IF COL_LENGTH('Master_Produk', 'Lemari') IS NULL
        ALTER TABLE Master_Produk ADD Lemari VARCHAR(20) NULL;
    `);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File harus diupload' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Hanya file .xlsx yang didukung' }, { status: 400 });
    }

    // Convert file ke buffer
    const buffer = await file.arrayBuffer();
    const bytes = Buffer.from(buffer);

    // Parse Excel (cellStyles wajib untuk mapping Lemari dari warna Rak Hanger)
    const workbook = XLSX.read(bytes, { type: 'buffer', cellStyles: true });

    const sheetSelection = pickWorksheetName(workbook);
    if (!sheetSelection.sheetName) {
      return NextResponse.json(
        { error: 'Tidak ditemukan sheet yang sesuai untuk import. Gunakan sheet bernama "Sumber" atau format kolom yang sesuai template.' },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetSelection.sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

    // Data dimulai dari row 6 (index 5)
    const dataRows = rows.slice(5);

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diimport' }, { status: 400 });
    }

    // Validasi dan insert semua rows
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const rowsToProcess: RowToProcess[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 6;
      const rowData = dataRows[i];

      // Skip empty rows berdasarkan kolom Design (col B => index 1)
      if (!rowData || rowData.length === 0 || !rowData[1]) {
        continue;
      }

      const rakHangerCellAddress = `A${rowNumber}`;
      rowsToProcess.push({
        rowNumber,
        rowData,
        rakHangerCell: worksheet[rakHangerCellAddress],
      });
    }

    for (let i = 0; i < rowsToProcess.length; i += IMPORT_CHUNK_SIZE) {
      const batch = rowsToProcess.slice(i, i + IMPORT_CHUNK_SIZE);
      await processRowBatch(pool, batch, result);
    }

    const durationMs = Date.now() - startedAt;
    return NextResponse.json({
      ...result,
      selectedSheetName: sheetSelection.sheetName,
      selectedSheetMode: sheetSelection.mode,
      durationMs,
      processedRows: rowsToProcess.length,
      chunkSize: IMPORT_CHUNK_SIZE,
      concurrency: IMPORT_CONCURRENCY,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

