import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { verifySessionToken, COOKIE_NAME, canAccessRequester } from '@/lib/auth';
import crypto from 'crypto';
import { ensureNotificationTables } from '../loan-notifications/_shared';
import webpush from 'web-push';

type RequestBody = {
  sampleIds: number[];
  customerName: string;
  departemen: string;
  status: 'Dipinjam' | 'Keluar';
  notes?: string;
  urgency?: 'Rendah' | 'Sedang' | 'Tinggi';
};

function normalizeLoanStatus(value: unknown): 'Dipinjam' | 'Keluar' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'keluar') return 'Keluar';
  if (raw === 'dipinjam' || raw === 'siap dikirim') return 'Dipinjam';
  return null;
}

async function ensureTables(pool: sql.ConnectionPool) {
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
      ALTER TABLE Sample_Loan ADD Departemen NVARCHAR(255) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Loan', 'Request_Group_ID') IS NULL
      ALTER TABLE Sample_Loan ADD Request_Group_ID NVARCHAR(64) NULL;
  `);
}

async function fetchSampleRows(pool: sql.ConnectionPool, sampleIds: number[]) {
  const placeholders = sampleIds.map((_, index) => `@id${index}`).join(', ');
  let req = pool.request();
  sampleIds.forEach((id, index) => {
    req = req.input(`id${index}`, sql.Int, id);
  });

  const result = await req.query(`
    SELECT ID_Sampel, Design, Lemari as Lemari, Rak_Hanger
    FROM Master_Produk
    WHERE ID_Sampel IN (${placeholders})
  `);

  return result.recordset as Array<{
    ID_Sampel: number;
    Design: string;
    Lemari: string | null;
    Rak_Hanger: string | null;
  }>;
}

async function sendPushNotificationToRnd(payload: {
  requestId: string;
  customerName: string;
  departemen: string;
  sampleCount: number;
  urgency: string;
  requestedStatus: 'Dipinjam' | 'Keluar';
}) {
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    return { skipped: true, reason: 'VAPID config belum lengkap' };
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  const pool = await getConnection();
  let subscriptions;
  try {
    subscriptions = await pool.request().query(`
      SELECT Endpoint, P256DH, Auth
      FROM Push_Subscriptions
      WHERE Is_Active = 1
        AND TargetApp = 'ui_web_rnd'
        AND UPPER(REPLACE(ISNULL(Dept, ''), '&', '')) IN ('RND', 'RD')
    `);
  } catch {
    subscriptions = await pool.request().query(`
      SELECT Endpoint, P256DH, Auth
      FROM Push_Subscriptions
      WHERE TargetApp = 'ui_web_rnd'
    `);
  }

  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions.recordset || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.Endpoint,
          keys: {
            p256dh: sub.P256DH,
            auth: sub.Auth,
          },
        },
        JSON.stringify({
          title: 'Permintaan Sampel Baru',
          body: `Permintaan dari ${payload.departemen}: ${payload.sampleCount} sampel (${payload.requestedStatus})`,
          url: `/loan-notifications/${encodeURIComponent(payload.requestId)}`,
          notificationType: 'pengambilan',
          Request_ID: payload.requestId,
          Customer_Name: payload.customerName,
          Departemen: payload.departemen,
          Sample_Count: payload.sampleCount,
          Urgency: payload.urgency,
          Status_Request: 'Baru',
          Requested_Status: payload.requestedStatus,
          kind: 'loan',
        })
      );
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, attempted: (subscriptions.recordset || []).length };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session?.dept || !canAccessRequester(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const normalizedStatus = normalizeLoanStatus(body.status);
    const sampleIds = Array.isArray(body.sampleIds)
      ? Array.from(new Set(body.sampleIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
      : [];

    if (sampleIds.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal 1 sampel kain' }, { status: 400 });
    }

    if (!body.customerName?.trim()) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    }

    if (!normalizedStatus) {
      return NextResponse.json({ error: 'Status harus Dipinjam atau Keluar' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureTables(pool);
    await ensureNotificationTables(pool);

    const rows = await fetchSampleRows(pool, sampleIds);
    if (rows.length !== sampleIds.length) {
      return NextResponse.json({ error: 'Sebagian sampel tidak ditemukan di database' }, { status: 404 });
    }

    const requestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    for (const row of rows) {
      await pool.request()
        .input('idSampel', sql.Int, row.ID_Sampel)
        .input('customerName', sql.NVarChar(255), body.customerName.trim())
        .input('departemen', sql.NVarChar(255), session.dept)
        .input('status', sql.NVarChar(50), normalizedStatus)
        .input('notes', sql.NVarChar(sql.MAX), body.notes?.trim() || null)
        .input('requestGroupId', sql.NVarChar(64), requestId)
        .query(`
          INSERT INTO Sample_Loan (ID_Sampel, Customer_Name, Departemen, Status, Notes, Request_Group_ID)
          VALUES (@idSampel, @customerName, @departemen, @status, @notes, @requestGroupId)
        `);

      await pool.request()
        .input('requestId', sql.NVarChar(64), requestId)
        .input('idSampel', sql.Int, row.ID_Sampel)
        .input('design', sql.NVarChar(255), row.Design)
        .input('lemari', sql.NVarChar(50), row.Lemari || null)
        .input('rak', sql.NVarChar(50), row.Rak_Hanger || null)
        .query(`
          INSERT INTO Loan_Request_Items (Request_ID, ID_Sampel, Design, Lemari, Rak_Hanger)
          VALUES (@requestId, @idSampel, @design, @lemari, @rak)
        `);
    }

    await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .input('customerName', sql.NVarChar(255), body.customerName.trim())
      .input('departemen', sql.NVarChar(255), session.dept)
      .input('requesterUserKey', sql.NVarChar(120), session.userKey || session.dept)
      .input('requesterDept', sql.NVarChar(255), session.dept)
      .input('requestedStatus', sql.NVarChar(50), normalizedStatus)
      .input('notes', sql.NVarChar(sql.MAX), body.notes?.trim() || null)
      .input('urgency', sql.NVarChar(20), body.urgency || 'Sedang')
      .query(`
        INSERT INTO Loan_Request_Notifications
        (Request_ID, Customer_Name, Departemen, Requester_User_Key, Requester_Dept, Recipient_Mode, Requested_Status, Status_Request, Notes, Urgency, Requested_By_App, Is_Read, TargetApp)
        VALUES (@requestId, @customerName, @departemen, @requesterUserKey, @requesterDept, 'RND_ALL', @requestedStatus, 'Baru', @notes, @urgency, 'ui_web_rnd', 0, 'ui_web_rnd')
      `);

    const pushResult = await sendPushNotificationToRnd({
      requestId,
      customerName: body.customerName.trim(),
      departemen: session.dept,
      sampleCount: rows.length,
      urgency: body.urgency || 'Sedang',
      requestedStatus: normalizedStatus,
    });

    return NextResponse.json({
      success: true,
      requestId,
      effectiveStatus: normalizedStatus,
      sampleCount: rows.length,
      pushNotification: pushResult,
      message: `Permintaan ${rows.length} sampel berhasil disimpan`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses permintaan sampel' }, { status: 500 });
  }
}
