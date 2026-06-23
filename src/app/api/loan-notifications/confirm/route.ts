import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { ensureNotificationTables } from '../_shared';
import { COOKIE_NAME, verifySessionToken, canAccessRnd } from '@/lib/auth';
import webpush from 'web-push';

type ConfirmBody = {
  requestId: string;
};

function normalizeLoanStatus(value: unknown): 'Dipinjam' | 'Keluar' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'keluar') return 'Keluar';
  if (raw === 'dipinjam' || raw === 'siap dikirim') return 'Dipinjam';
  return null;
}

async function ensureStockColumns(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF COL_LENGTH('Master_Produk', 'Stok_Sampel') IS NULL
      ALTER TABLE Master_Produk ADD Stok_Sampel INT NOT NULL CONSTRAINT DF_Master_Produk_Stok_Sampel DEFAULT(0);
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Stock_Mutations')
    CREATE TABLE Sample_Stock_Mutations (
      ID_Mutation INT PRIMARY KEY IDENTITY(1,1),
      Event_Key NVARCHAR(150) NOT NULL,
      Event_Type NVARCHAR(50) NOT NULL,
      Request_ID NVARCHAR(64) NULL,
      Return_Notification_ID INT NULL,
      ID_Sampel INT NOT NULL,
      Qty_Change INT NOT NULL,
      Notes NVARCHAR(255) NULL,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'UX_Sample_Stock_Mutations_EventKey'
        AND object_id = OBJECT_ID('Sample_Stock_Mutations')
    )
    CREATE UNIQUE INDEX UX_Sample_Stock_Mutations_EventKey ON Sample_Stock_Mutations(Event_Key);
  `);
}

async function applyStockOnLoanConfirm(
  tx: sql.Transaction,
  requestId: string,
  finalStatus: 'Dipinjam' | 'Keluar'
) {
  const itemsResult = await new sql.Request(tx)
    .input('requestId', sql.NVarChar(64), requestId)
    .query(`
      SELECT ID_Sampel, COUNT(1) AS Qty
      FROM Loan_Request_Items
      WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
      GROUP BY ID_Sampel
    `);

  const rows = itemsResult.recordset || [];
  for (const row of rows) {
    const idSampel = Number(row.ID_Sampel || 0);
    const qty = Math.max(1, Number(row.Qty || 1));
    if (!Number.isInteger(idSampel) || idSampel <= 0) {
      continue;
    }

    const eventKey = `loan-confirm:${requestId}:${idSampel}`;
    await new sql.Request(tx)
      .input('eventKey', sql.NVarChar(150), eventKey)
      .input('eventType', sql.NVarChar(50), 'LOAN_CONFIRM')
      .input('requestId', sql.NVarChar(64), requestId)
      .input('idSampel', sql.Int, idSampel)
      .input('qtyChange', sql.Int, -qty)
      .input('notes', sql.NVarChar(255), `Konfirmasi R&D (${finalStatus})`)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Sample_Stock_Mutations WHERE Event_Key = @eventKey)
        BEGIN
          UPDATE Master_Produk
          SET Stok_Sampel = CASE WHEN ISNULL(Stok_Sampel, 0) >= ABS(@qtyChange)
            THEN ISNULL(Stok_Sampel, 0) - ABS(@qtyChange)
            ELSE 0 END
          WHERE ID_Sampel = @idSampel;

          INSERT INTO Sample_Stock_Mutations (Event_Key, Event_Type, Request_ID, ID_Sampel, Qty_Change, Notes)
          VALUES (@eventKey, @eventType, @requestId, @idSampel, @qtyChange, @notes);
        END
      `);
  }
}

async function ensurePushSubscriptionColumns(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Push_Subscriptions')
    CREATE TABLE Push_Subscriptions (
      ID_Subscription INT PRIMARY KEY IDENTITY(1,1),
      Endpoint NVARCHAR(MAX) NOT NULL,
      P256DH NVARCHAR(MAX) NOT NULL,
      Auth NVARCHAR(MAX) NOT NULL,
      TargetApp NVARCHAR(50) NOT NULL DEFAULT 'unknown',
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'Dept') IS NULL
      ALTER TABLE Push_Subscriptions ADD Dept NVARCHAR(255) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'User_Key') IS NULL
      ALTER TABLE Push_Subscriptions ADD User_Key NVARCHAR(120) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'Is_Active') IS NULL
      ALTER TABLE Push_Subscriptions ADD Is_Active BIT NOT NULL DEFAULT 1;
  `);
}

async function sendPushNotificationToRequester(payload: {
  requestId: string;
  status: string;
  recipientUserKey?: string | null;
  recipientDept?: string | null;
  customerName: string;
  requestedStatus: string;
  sampleCount: number;
  urgency?: string | null;
  departemen?: string | null;
  createdAt?: string | null;
}) {
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    return { delivered: false, skipped: true, reason: 'VAPID config belum lengkap', attempts: [] as Array<{ target: string; ok: boolean; reason?: string }> };
  }

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  const pool = await getConnection();
  await ensurePushSubscriptionColumns(pool);

  let subscriptions;
  try {
    const req = pool.request()
      .input('recipientUserKey', sql.NVarChar(120), payload.recipientUserKey || null)
      .input('recipientDept', sql.NVarChar(255), payload.recipientDept || null);

    subscriptions = await req.query(`
      SELECT Endpoint, P256DH, Auth
      FROM Push_Subscriptions
      WHERE Is_Active = 1
        AND TargetApp = 'ui_web_rnd'
        AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) NOT IN ('RND', 'RD')
        AND (
          (@recipientUserKey IS NOT NULL AND UPPER(LTRIM(RTRIM(ISNULL(User_Key, '')))) = UPPER(@recipientUserKey))
          OR
          (@recipientUserKey IS NULL AND @recipientDept IS NOT NULL AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) = UPPER(REPLACE(LTRIM(RTRIM(@recipientDept)), '&', '')))
        )
    `);
  } catch {
    subscriptions = { recordset: [] as any[] } as any;
  }

  if ((!subscriptions?.recordset || subscriptions.recordset.length === 0) && payload.recipientDept) {
    subscriptions = await pool.request()
      .input('recipientDept', sql.NVarChar(255), payload.recipientDept || null)
      .query(`
        SELECT Endpoint, P256DH, Auth
        FROM Push_Subscriptions
        WHERE Is_Active = 1
          AND TargetApp = 'ui_web_rnd'
          AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) NOT IN ('RND', 'RD')
          AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) = UPPER(REPLACE(LTRIM(RTRIM(@recipientDept)), '&', ''))
      `);
  }

  const attempts: Array<{ target: string; ok: boolean; reason?: string }> = [];

  for (const sub of subscriptions.recordset || []) {
    const endpoint = String(sub.Endpoint || '').trim();
    if (!endpoint) {
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint,
          keys: {
            p256dh: sub.P256DH,
            auth: sub.Auth,
          },
        },
        JSON.stringify({
          title: 'Permintaan Sudah Dikonfirmasi R&D',
          body: `${payload.customerName} - status: ${payload.status}`,
          url: `/loan-notifications/${encodeURIComponent(payload.requestId)}`,
          notificationType: 'pengambilan',
          kind: 'loan',
          Request_ID: payload.requestId,
          Customer_Name: payload.customerName,
          Departemen: payload.departemen,
          Requested_Status: payload.requestedStatus,
          Status_Request: payload.status,
          Sample_Count: payload.sampleCount,
          Urgency: payload.urgency || 'Sedang',
          Created_At: payload.createdAt || new Date().toISOString(),
        })
      );
      attempts.push({ target: endpoint, ok: true });
    } catch (error: any) {
      attempts.push({ target: endpoint, ok: false, reason: error?.message || 'Gagal kirim push' });
    }
  }

  return {
    delivered: attempts.some((item) => item.ok),
    attempts,
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || !canAccessRnd(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await request.json()) as ConfirmBody;
    const requestId = String(body.requestId || '').trim();

    if (!requestId) {
      return NextResponse.json({ error: 'requestId wajib diisi' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureNotificationTables(pool);

    const exists = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .query(`
        SELECT Request_ID, Requested_Status, Status_Request, Customer_Name, Requester_User_Key, Requester_Dept, Departemen, Urgency, Stock_Applied,
               CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
        FROM Loan_Request_Notifications 
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
      `);

    if (exists.recordset.length === 0) {
      return NextResponse.json({ error: 'Request tidak ditemukan' }, { status: 404 });
    }

    const requestedStatus = normalizeLoanStatus(exists.recordset[0]?.Requested_Status);
    const currentStatus = normalizeLoanStatus(exists.recordset[0]?.Status_Request);
    const finalStatus = requestedStatus || currentStatus || 'Dipinjam';
    const customerName = String(exists.recordset[0]?.Customer_Name || 'Unknown').trim();
    const recipientUserKey = String(exists.recordset[0]?.Requester_User_Key || '').trim() || null;
    const recipientDept = String(
      exists.recordset[0]?.Requester_Dept || exists.recordset[0]?.Departemen || ''
    ).trim() || null;
    const departemen = String(exists.recordset[0]?.Departemen || '').trim() || null;
    const urgency = String(exists.recordset[0]?.Urgency || '').trim() || null;
    const createdAt = String(exists.recordset[0]?.Created_At || '').trim() || null;
    const stockApplied = Boolean(exists.recordset[0]?.Stock_Applied);

    const countResult = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .query(`
        SELECT COUNT(1) AS Sample_Count
        FROM Loan_Request_Items
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
      `);
    const sampleCount = Number(countResult.recordset?.[0]?.Sample_Count || 0);
    const finalMessage = finalStatus === 'Keluar'
      ? 'Sampel keluar permanen sesuai pengajuan departemen peminjam.'
      : 'Permintaan telah dikonfirmasi. Sampel akan segera diantar.';

    if (!stockApplied) {
      await ensureStockColumns(pool);

      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        const txRequest = new sql.Request(tx);
        const lockResult = await txRequest
          .input('requestId', sql.NVarChar(64), requestId)
          .query(`
            SELECT ISNULL(Stock_Applied, 0) AS Stock_Applied
            FROM Loan_Request_Notifications WITH (UPDLOCK, ROWLOCK)
            WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
          `);

        const shouldApply = Number(lockResult.recordset?.[0]?.Stock_Applied || 0) === 0;
        if (shouldApply) {
          await applyStockOnLoanConfirm(tx, requestId, finalStatus);

          await new sql.Request(tx)
            .input('requestId', sql.NVarChar(64), requestId)
            .input('finalStatus', sql.NVarChar(50), finalStatus)
            .query(`
              UPDATE Loan_Request_Notifications
              SET Status_Request = @finalStatus,
                  Is_Read = 0,
                  Stock_Applied = 1,
                  Stock_Applied_At = GETDATE()
              WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
            `);
        } else {
          await new sql.Request(tx)
            .input('requestId', sql.NVarChar(64), requestId)
            .input('finalStatus', sql.NVarChar(50), finalStatus)
            .query(`
              UPDATE Loan_Request_Notifications
              SET Status_Request = @finalStatus,
                  Is_Read = 0
              WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
            `);
        }

        await tx.commit();
      } catch (txError) {
        await tx.rollback();
        throw txError;
      }
    } else {
      await pool.request()
        .input('requestId', sql.NVarChar(64), requestId)
        .input('finalStatus', sql.NVarChar(50), finalStatus)
        .query(`
          UPDATE Loan_Request_Notifications
          SET Status_Request = @finalStatus,
              Is_Read = 0
          WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
        `);
    }

    // Get associated loan IDs from database for tracking
    let loanIds: number[] = [];
    try {
      const loansResult = await pool.request()
        .input('requestId', sql.NVarChar(64), requestId)
        .query(`
            SELECT ID_Loan FROM Sample_Loan WHERE LTRIM(RTRIM(Request_Group_ID)) = LTRIM(RTRIM(@requestId))
        `);
      loanIds = loansResult.recordset.map((r: any) => Number(r.ID_Loan)).filter((id: number) => !isNaN(id));
    } catch (err) {
      console.warn('Could not fetch loan IDs:', err);
    }

    const pushResult = await sendPushNotificationToRequester({
      requestId,
      status: finalStatus,
      recipientUserKey,
      recipientDept,
      customerName,
      requestedStatus: requestedStatus || finalStatus,
      sampleCount,
      urgency,
      departemen,
      createdAt,
    });

    const notifyResult = {
      delivered: pushResult.delivered,
      attempts: pushResult.attempts,
      pushDelivered: pushResult.delivered,
      pushSkipped: (pushResult as any).skipped === true,
      reason: !pushResult.delivered && (pushResult as any).reason
        ? (pushResult as any).reason
        : undefined,
    };

    console.log('✅ Confirmation notification sent:', {
      requestId,
      finalStatus,
      notifyResult,
      loanIds,
    });

    return NextResponse.json({
      success: true,
      requestId,
      status: finalStatus,
      notifyResult,
    });
  } catch (error: any) {
    console.error('Loan notification confirm error:', error);
    return NextResponse.json({ error: error.message || 'Gagal konfirmasi pengiriman' }, { status: 500 });
  }
}
