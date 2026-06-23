import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { COOKIE_NAME, verifySessionToken, canAccessRnd } from '@/lib/auth';
import webpush from 'web-push';

type ConfirmBody = {
  notificationId: number;
};

function normalizeLoanStatus(value: unknown): 'Dipinjam' | 'Keluar' | 'Pengembalian Diajukan' | 'Dikembalikan' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'keluar') return 'Keluar';
  if (raw === 'dipinjam' || raw === 'siap dikirim') return 'Dipinjam';
  if (raw === 'pengembalian diajukan') return 'Pengembalian Diajukan';
  if (raw === 'dikembalikan') return 'Dikembalikan';
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

async function applyStockOnReturnConfirm(
  tx: sql.Transaction,
  notificationId: number,
  loanIds: number[]
) {
  if (!loanIds.length) {
    return;
  }

  const loanReq = new sql.Request(tx);
  loanIds.forEach((loanId, idx) => {
    loanReq.input(`loanId${idx}`, sql.Int, loanId);
  });

  const placeholders = loanIds.map((_, idx) => `@loanId${idx}`).join(', ');
  const loansResult = await loanReq.query(`
    SELECT ID_Loan, ID_Sampel, Status
    FROM Sample_Loan
    WHERE ID_Loan IN (${placeholders})
  `);

  const restockMap = new Map<number, number>();
  for (const row of loansResult.recordset || []) {
    const status = normalizeLoanStatus(row.Status);
    const idSampel = Number(row.ID_Sampel || 0);
    if (!Number.isInteger(idSampel) || idSampel <= 0) {
      continue;
    }
    if (status === 'Keluar') {
      continue;
    }
    restockMap.set(idSampel, (restockMap.get(idSampel) || 0) + 1);
  }

  for (const [idSampel, qty] of Array.from(restockMap.entries())) {
    const eventKey = `return-confirm:${notificationId}:${idSampel}`;
    await new sql.Request(tx)
      .input('eventKey', sql.NVarChar(150), eventKey)
      .input('eventType', sql.NVarChar(50), 'RETURN_CONFIRM')
      .input('notificationId', sql.Int, notificationId)
      .input('idSampel', sql.Int, idSampel)
      .input('qtyChange', sql.Int, qty)
      .input('notes', sql.NVarChar(255), 'Konfirmasi pengembalian oleh R&D')
      .query(`
        IF NOT EXISTS (SELECT 1 FROM Sample_Stock_Mutations WHERE Event_Key = @eventKey)
        BEGIN
          UPDATE Master_Produk
          SET Stok_Sampel = ISNULL(Stok_Sampel, 0) + @qtyChange
          WHERE ID_Sampel = @idSampel;

          INSERT INTO Sample_Stock_Mutations (Event_Key, Event_Type, Return_Notification_ID, ID_Sampel, Qty_Change, Notes)
          VALUES (@eventKey, @eventType, @notificationId, @idSampel, @qtyChange, @notes);
        END
      `);
  }

  const updateReq = new sql.Request(tx);
  loanIds.forEach((loanId, idx) => {
    updateReq.input(`updateLoanId${idx}`, sql.Int, loanId);
  });
  const updatePlaceholders = loanIds.map((_, idx) => `@updateLoanId${idx}`).join(', ');
  await updateReq.query(`
    UPDATE Sample_Loan
    SET Status = CASE
      WHEN LTRIM(RTRIM(ISNULL(Status, ''))) = 'Keluar' THEN Status
      ELSE 'Dikembalikan'
    END,
    Return_Date = CASE
      WHEN LTRIM(RTRIM(ISNULL(Status, ''))) = 'Keluar' THEN Return_Date
      ELSE GETDATE()
    END
    WHERE ID_Loan IN (${updatePlaceholders})
  `);
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

async function ensureSampleReturnTable() {
  const pool = await getConnection();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Return_Notifications')
    CREATE TABLE Sample_Return_Notifications (
      ID_Notification INT PRIMARY KEY IDENTITY(1,1),
      Sample_Ids NVARCHAR(MAX) NOT NULL,
      Loan_Ids NVARCHAR(MAX) NOT NULL,
      Count_Items INT NOT NULL,
      Sender_Departemen NVARCHAR(255) NOT NULL DEFAULT 'Unknown',
      Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru',
      Pickup_Confirmed_At DATETIME2 NULL,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Sender_Departemen') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Sender_Departemen NVARCHAR(255) NOT NULL DEFAULT 'Unknown';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Pickup_Status') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru';
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Pickup_Confirmed_At') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Pickup_Confirmed_At DATETIME2 NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Requester_User_Key') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Requester_User_Key NVARCHAR(120) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Sample_Return_Notifications', 'Requester_Dept') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Requester_Dept NVARCHAR(255) NULL;
  `);

  return pool;
}

async function sendPushNotificationToRequester(payload: {
  notificationId: number;
  count: number;
  senderDepartemen: string;
  sampleIds: number[];
  loanIds: number[];
  createdAt: string;
  recipientUserKey?: string | null;
  recipientDept?: string | null;
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

  const attempts: Array<{ target: string; ok: boolean; reason?: string }> = [];
  try {
    const req = pool.request()
      .input('recipientUserKey', sql.NVarChar(120), payload.recipientUserKey || null)
      .input('recipientDept', sql.NVarChar(255), payload.recipientDept || null);

    const subscriptions = await req.query(`
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

    const effectiveSubscriptions = (subscriptions.recordset || []).length > 0
      ? subscriptions
      : await pool.request()
          .input('recipientDept', sql.NVarChar(255), payload.recipientDept || null)
          .query(`
          SELECT Endpoint, P256DH, Auth
          FROM Push_Subscriptions
          WHERE Is_Active = 1
            AND TargetApp = 'ui_web_rnd'
            AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) NOT IN ('RND', 'RD')
            AND @recipientDept IS NOT NULL
            AND UPPER(REPLACE(LTRIM(RTRIM(ISNULL(Dept, ''))), '&', '')) = UPPER(REPLACE(LTRIM(RTRIM(@recipientDept)), '&', ''))
        `);

    for (const sub of effectiveSubscriptions.recordset || []) {
      const endpoint = String(sub.Endpoint || '').trim();
      if (!endpoint) continue;

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
            title: 'Pengembalian Sampel Dikonfirmasi R&D',
            body: `Pengembalian ${payload.count} sampel sudah dikonfirmasi.`,
            url: `/sample-return-notifications/${payload.notificationId}`,
            notificationType: 'pengembalian',
            kind: 'return',
            id: payload.notificationId,
            sampleIds: payload.sampleIds,
            loanIds: payload.loanIds,
            count: payload.count,
            senderDepartemen: payload.senderDepartemen,
            pickupStatus: 'Dikonfirmasi',
            createdAt: payload.createdAt,
          })
        );
        attempts.push({ target: endpoint, ok: true });
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || 0);
        attempts.push({ target: endpoint, ok: false, reason: error?.message || 'Gagal kirim push' });

        if (statusCode === 404 || statusCode === 410) {
          await pool.request()
            .input('endpoint', sql.NVarChar(sql.MAX), endpoint)
            .query('DELETE FROM Push_Subscriptions WHERE Endpoint = @endpoint');
        }
      }
    }

    return {
      delivered: attempts.some((item) => item.ok),
      attempts,
    };
  } catch (error: any) {
    return {
      delivered: false,
      attempts,
      reason: error?.message || 'Gagal kirim push notifikasi konfirmasi pengembalian',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || !canAccessRnd(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await request.json()) as ConfirmBody;
    const notificationId = Number(body.notificationId);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return NextResponse.json({ error: 'notificationId tidak valid' }, { status: 400 });
    }

    const pool = await ensureSampleReturnTable();

    const result = await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .query(`
        SELECT ID_Notification, Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Pickup_Status, Requester_User_Key, Requester_Dept,
               CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
        FROM Sample_Return_Notifications
        WHERE ID_Notification = @notificationId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Notifikasi pengembalian tidak ditemukan' }, { status: 404 });
    }

    const row = result.recordset[0];

    if (String(row.Pickup_Status || '').toLowerCase() === 'dikonfirmasi') {
      return NextResponse.json({
        success: true,
        notificationId,
        sourceDepartemen: String(row.Sender_Departemen || 'Unknown'),
        notifyResult: { delivered: true, skipped: true, reason: 'Notifikasi sudah pernah dikonfirmasi' },
    });
    }

    const sampleIds: number[] = JSON.parse(row.Sample_Ids || '[]');
    const loanIds: number[] = JSON.parse(row.Loan_Ids || '[]')
      .map((value: unknown) => Number(value))
      .filter((value: number) => Number.isInteger(value) && value > 0);

    await ensureStockColumns(pool);
    const tx = new sql.Transaction(pool);
    await tx.begin();
    let confirmedAt = '';
    try {
      const lockResult = await new sql.Request(tx)
        .input('notificationId', sql.Int, notificationId)
        .query(`
          SELECT Pickup_Status
          FROM Sample_Return_Notifications WITH (UPDLOCK, ROWLOCK)
          WHERE ID_Notification = @notificationId
        `);

      const currentPickupStatus = String(lockResult.recordset?.[0]?.Pickup_Status || '').toLowerCase();
      if (currentPickupStatus === 'dikonfirmasi' || currentPickupStatus === 'dikembalikan') {
        await tx.rollback();
        return NextResponse.json({
          success: true,
          notificationId,
          sourceDepartemen: String(row.Sender_Departemen || 'Unknown'),
          notifyResult: { delivered: true, skipped: true, reason: 'Notifikasi sudah pernah dikonfirmasi' },
        });
      }

      const updateResult = await new sql.Request(tx)
        .input('notificationId', sql.Int, notificationId)
        .query(`
          UPDATE Sample_Return_Notifications
          SET Pickup_Status = 'Dikonfirmasi', Pickup_Confirmed_At = GETDATE(), Is_Read = 0
          OUTPUT CONVERT(VARCHAR(19), INSERTED.Pickup_Confirmed_At, 120) AS Pickup_Confirmed_At
          WHERE ID_Notification = @notificationId
        `);

      confirmedAt = String(updateResult.recordset?.[0]?.Pickup_Confirmed_At || '').trim();
      await applyStockOnReturnConfirm(tx, notificationId, loanIds);
      await tx.commit();
    } catch (txError) {
      await tx.rollback();
      throw txError;
    }

    const senderDepartemen = String(row.Sender_Departemen || 'Unknown');
    const recipientUserKey = String(row.Requester_User_Key || '').trim() || null;
    const recipientDept = String(row.Requester_Dept || row.Sender_Departemen || '').trim() || null;
    const count = Number(row.Count_Items || sampleIds.length || 0);
    const createdAt = confirmedAt || String(row.Created_At || '').trim() || '';

    const notifyResult = await sendPushNotificationToRequester({
      notificationId,
      count,
      senderDepartemen,
      sampleIds,
      loanIds,
      createdAt,
      recipientUserKey,
      recipientDept,
    });

    return NextResponse.json({
      success: true,
      notificationId,
      sourceDepartemen: senderDepartemen,
      notifyResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal konfirmasi pengambilan sampel' }, { status: 500 });
  }
}
