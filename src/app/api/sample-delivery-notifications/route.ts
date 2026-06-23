import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import webpush from 'web-push';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export interface SampleDeliveryNotification {
  id?: number;
  requestId: string;
  status: string;
  message: string;
  createdAt: string;
  senderDepartemen: string;
  recipientUserKey?: string | null;
  recipientDept?: string | null;
  notificationType: 'pengambilan' | 'pengembalian';
  loanIds?: number[];
}

function normalizeLoanStatus(value: unknown): 'Dipinjam' | 'Keluar' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'keluar') return 'Keluar';
  if (raw === 'dipinjam' || raw === 'siap dikirim') return 'Dipinjam';
  return null;
}

let deliveryNotifications: SampleDeliveryNotification[] = [];

async function ensureNotificationTables() {
  const pool = await getConnection();

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notification_Headers')
    CREATE TABLE Notification_Headers (
      ID_Notification INT PRIMARY KEY IDENTITY(1,1),
      Notification_Type NVARCHAR(30) NOT NULL,
      Request_ID NVARCHAR(64) NULL,
      Sender_Departemen NVARCHAR(100) NOT NULL,
      Status NVARCHAR(50) NOT NULL,
      Message NVARCHAR(MAX) NOT NULL,
      Is_Read BIT NOT NULL DEFAULT 0,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE(),
      Updated_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notification_Items')
    CREATE TABLE Notification_Items (
      ID_Item INT PRIMARY KEY IDENTITY(1,1),
      ID_Notification INT NOT NULL,
      Loan_ID INT NULL,
      Sample_ID INT NULL,
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE(),
      FOREIGN KEY (ID_Notification) REFERENCES Notification_Headers(ID_Notification)
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Notification_Headers', 'Recipient_User_Key') IS NULL
      ALTER TABLE Notification_Headers ADD Recipient_User_Key NVARCHAR(120) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Notification_Headers', 'Recipient_Dept') IS NULL
      ALTER TABLE Notification_Headers ADD Recipient_Dept NVARCHAR(255) NULL;
  `);

  return pool;
}

async function insertNotificationToDb(notification: SampleDeliveryNotification) {
  const pool = await ensureNotificationTables();

  const inserted = await pool.request()
    .input('notificationType', sql.NVarChar(30), notification.notificationType)
    .input('requestId', sql.NVarChar(64), notification.requestId || null)
    .input('senderDepartemen', sql.NVarChar(100), notification.senderDepartemen)
    .input('status', sql.NVarChar(50), notification.status)
    .input('message', sql.NVarChar(sql.MAX), notification.message)
    .input('recipientUserKey', sql.NVarChar(120), notification.recipientUserKey || null)
    .input('recipientDept', sql.NVarChar(255), notification.recipientDept || null)
    .query(`
      INSERT INTO Notification_Headers
      (Notification_Type, Request_ID, Sender_Departemen, Recipient_User_Key, Recipient_Dept, Status, Message, Is_Read, Created_At, Updated_At)
      OUTPUT INSERTED.ID_Notification as ID_Notification, CONVERT(VARCHAR(19), INSERTED.Created_At, 120) AS Created_At
      VALUES (@notificationType, @requestId, @senderDepartemen, @recipientUserKey, @recipientDept, @status, @message, 0, GETDATE(), GETDATE())
    `);

  const notificationId = Number(inserted.recordset[0]?.ID_Notification || 0);
  const createdAt = String(inserted.recordset[0]?.Created_At || '').trim();
  if (!notificationId) return { id: 0, createdAt: '' };

  const cleanedLoanIds = Array.from(new Set((notification.loanIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)));

  for (const loanId of cleanedLoanIds) {
    await pool.request()
      .input('notificationId', sql.Int, notificationId)
      .input('loanId', sql.Int, loanId)
      .query(`
        INSERT INTO Notification_Items (ID_Notification, Loan_ID, Sample_ID)
        VALUES (@notificationId, @loanId, NULL)
      `);
  }

  return { id: notificationId, createdAt };
}

async function findRecentDuplicateNotificationId(notification: SampleDeliveryNotification): Promise<number> {
  const pool = await ensureNotificationTables();
  const result = await pool.request()
    .input('requestId', sql.NVarChar(64), notification.requestId)
    .input('notificationType', sql.NVarChar(30), notification.notificationType)
    .input('recipientUserKey', sql.NVarChar(120), notification.recipientUserKey || null)
    .input('recipientDept', sql.NVarChar(255), notification.recipientDept || null)
    .query(`
      SELECT TOP 1 ID_Notification
      FROM Notification_Headers
      WHERE Request_ID = @requestId
        AND Notification_Type = @notificationType
        AND ISNULL(Recipient_User_Key, '') = ISNULL(@recipientUserKey, '')
        AND ISNULL(Recipient_Dept, '') = ISNULL(@recipientDept, '')
        AND Created_At >= DATEADD(MINUTE, -30, GETDATE())
      ORDER BY Created_At DESC
    `);

  return Number(result.recordset?.[0]?.ID_Notification || 0);
}

async function getNotificationsFromDb(recipientUserKey: string, recipientDept: string) {
  const pool = await ensureNotificationTables();

  const headerResult = await pool.request()
    .input('recipientUserKey', sql.NVarChar(120), recipientUserKey)
    .input('recipientDept', sql.NVarChar(255), recipientDept)
    .query(`
    SELECT TOP 20
      ID_Notification,
      Notification_Type,
      Request_ID,
      Sender_Departemen,
      Recipient_User_Key,
      Recipient_Dept,
      Status,
      Message,
      CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
    FROM Notification_Headers
    WHERE Is_Read = 0
      AND (
        Recipient_User_Key = @recipientUserKey
        OR (Recipient_User_Key IS NULL AND Recipient_Dept = @recipientDept)
      )
    ORDER BY Created_At DESC
  `);

  const headers = headerResult.recordset || [];
  if (headers.length === 0) {
    return [] as SampleDeliveryNotification[];
  }

  const ids = headers.map((row: any) => Number(row.ID_Notification)).filter((id: number) => Number.isInteger(id) && id > 0);
  const placeholders = ids.map((_, index) => `@id${index}`).join(', ');
  let itemReq = pool.request();
  ids.forEach((id, index) => {
    itemReq = itemReq.input(`id${index}`, sql.Int, id);
  });

  const itemResult = await itemReq.query(`
    SELECT ID_Notification, Loan_ID
    FROM Notification_Items
    WHERE ID_Notification IN (${placeholders})
  `);

  const loanIdsByNotification = new Map<number, number[]>();
  for (const row of itemResult.recordset || []) {
    const notificationId = Number(row.ID_Notification || 0);
    const loanId = Number(row.Loan_ID || 0);
    if (!notificationId || !loanId) continue;
    const prev = loanIdsByNotification.get(notificationId) || [];
    prev.push(loanId);
    loanIdsByNotification.set(notificationId, prev);
  }

  return headers.map((row: any) => {
    const notificationId = Number(row.ID_Notification || 0);
    const notificationType = row.Notification_Type === 'pengembalian' ? 'pengembalian' : 'pengambilan';
    return {
      id: notificationId,
      requestId: String(row.Request_ID || ''),
      status: String(row.Status || ''),
      message: String(row.Message || ''),
      createdAt: String(row.Created_At || '').trim() || new Date().toISOString(),
      senderDepartemen: String(row.Sender_Departemen || 'RnD'),
      recipientUserKey: String(row.Recipient_User_Key || '') || null,
      recipientDept: String(row.Recipient_Dept || '') || null,
      notificationType,
      loanIds: loanIdsByNotification.get(notificationId) || [],
    } as SampleDeliveryNotification;
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || !body.requestId) {
    return NextResponse.json(
      { error: 'Invalid request body. Require requestId.' },
      { status: 400 }
    );
  }

  const notificationType = body.notificationType === 'pengembalian' ? 'pengembalian' : 'pengambilan';
  const normalizedStatus = normalizeLoanStatus(body.status) || 'Dipinjam';
  const rawMessage = String(body.message || '').trim();
  let message = rawMessage || 'Sampel akan dikirimkan oleh departemen RnD';

  const senderDept = body.senderDepartemen || 'RnD';
  const loanCount = Array.isArray(body.loanIds) ? body.loanIds.length : 1;

  if (notificationType === 'pengambilan') {
    if (!rawMessage || rawMessage === 'Sampel akan dikirimkan oleh departemen RnD') {
      message = `Permintaan ${loanCount} Sampel telah diKonfirmasi oleh ${senderDept}`;
    }
    if (normalizedStatus === 'Keluar' && /dipinjam/i.test(message)) {
      message = 'Sampel keluar permanen sesuai pengajuan departemen peminjam.';
    }
    if (normalizedStatus === 'Dipinjam' && /keluar permanen/i.test(message)) {
      message = 'Peminjaman telah dikonfirmasi dan sampel akan segera diantar.';
    }
  }

  const notification: SampleDeliveryNotification = {
    requestId: body.requestId,
    status: normalizedStatus,
    message,
    createdAt: '',
    senderDepartemen: body.senderDepartemen || 'RnD',
    recipientUserKey: String(body.recipientUserKey || '').trim() || null,
    recipientDept: String(body.recipientDept || '').trim() || null,
    notificationType,
    loanIds: Array.isArray(body.loanIds) ? body.loanIds : [],
  };

  const duplicateNotificationId = await findRecentDuplicateNotificationId(notification).catch(() => 0);
  if (duplicateNotificationId > 0) {
    return NextResponse.json({
      ok: true,
      duplicateSkipped: true,
      message: `Notifikasi duplikat diabaikan untuk request ${notification.requestId}`,
      notification: {
        ...notification,
        id: duplicateNotificationId,
      },
      pushSummary: {
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: 'Duplikat request dalam rentang waktu 30 menit',
      },
    });
  }

  if (notification.notificationType === 'pengembalian' && Array.isArray(notification.loanIds) && notification.loanIds.length > 0) {
    const cleanedLoanIds = Array.from(new Set(notification.loanIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)));

    if (cleanedLoanIds.length > 0) {
      const pool = await getConnection();
      const placeholders = cleanedLoanIds.map((_, index) => `@loanId${index}`).join(', ');
      let req = pool.request()
        .input('status', sql.NVarChar(50), 'Dikembalikan');

      cleanedLoanIds.forEach((loanId, index) => {
        req = req.input(`loanId${index}`, sql.Int, loanId);
      });

      await req.query(`
        UPDATE Sample_Loan
        SET Status = @status,
            Return_Date = GETDATE()
        WHERE ID_Loan IN (${placeholders})
      `);
    }
  }

  try {
    const inserted = await insertNotificationToDb(notification);
    notification.id = inserted.id;
    notification.createdAt = inserted.createdAt || new Date().toISOString();
  } catch {
    notification.createdAt = new Date().toISOString();
    deliveryNotifications.push(notification);
  }

  const pushSummary = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: false,
    reason: '' as string,
  };

  try {
    const vapidEmail = process.env.VAPID_EMAIL;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (vapidEmail && vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

      const pool = await getConnection();
      const subscriptions = await pool.request()
        .input('recipientUserKey', sql.NVarChar(120), notification.recipientUserKey || null)
        .input('recipientDept', sql.NVarChar(100), notification.recipientDept || null)
        .query(`
        SELECT Endpoint, P256DH, Auth FROM Push_Subscriptions
        WHERE Is_Active = 1
          AND (
            (@recipientUserKey IS NOT NULL AND User_Key = @recipientUserKey)
            OR (@recipientUserKey IS NULL AND @recipientDept IS NOT NULL AND Dept = @recipientDept)
          )
      `);

      pushSummary.attempted = (subscriptions.recordset || []).length;

      for (const sub of subscriptions.recordset) {
        const pushSubscription = {
          endpoint: sub.Endpoint,
          keys: {
            p256dh: sub.P256DH,
            auth: sub.Auth,
          },
        };

        try {
          const targetUrl = notification.notificationType === 'pengambilan'
            ? `/loan-notifications/${encodeURIComponent(notification.requestId)}`
            : '/sample-returns';

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: 'Notifikasi Pengambilan Sampel',
              body: notification.message,
              url: targetUrl,
              id: notification.id,
              requestId: notification.requestId,
              status: notification.status,
              message: notification.message,
              notificationType: notification.notificationType,
              senderDepartemen: notification.senderDepartemen,
              createdAt: notification.createdAt,
              loanIds: notification.loanIds,
            })
          );
          pushSummary.sent += 1;
        } catch (pushErr: any) {
          pushSummary.failed += 1;
          const statusCode = Number(pushErr?.statusCode || 0);

          if (statusCode === 404 || statusCode === 410) {
            await pool.request()
              .input('endpoint', sql.NVarChar(sql.MAX), sub.Endpoint)
              .query('DELETE FROM Push_Subscriptions WHERE Endpoint = @endpoint');
          }
        }
      }
    } else {
      pushSummary.skipped = true;
      pushSummary.reason = 'VAPID config belum lengkap';
    }
  } catch (pushErr: any) {
    pushSummary.skipped = true;
    pushSummary.reason = pushErr?.message || 'Gagal proses web push';
  }

  return NextResponse.json({
    ok: true,
    message: `Menerima notifikasi pengiriman sampel dari RnD untuk request ${notification.requestId}`,
    notification,
    pushSummary,
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session?.dept) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isRndDept = String(session.dept || '').trim().toLowerCase() === 'rnd';

  let dbNotifications: SampleDeliveryNotification[] = [];
  try {
    dbNotifications = await getNotificationsFromDb(session.userKey || session.dept, session.dept);
  } catch {}

  const visibleDbNotifications = isRndDept
    ? dbNotifications
    : dbNotifications.filter((n) => String(n.senderDepartemen || '').trim().toLowerCase() === 'rnd');

  const dbRequestIds = new Set(visibleDbNotifications.map((n) => n.requestId));
  const memoryOnly = deliveryNotifications.filter((n) => {
    if (dbRequestIds.has(n.requestId)) return false;
    if (!isRndDept && String(n.senderDepartemen || '').trim().toLowerCase() !== 'rnd') return false;
    if (n.recipientUserKey) return n.recipientUserKey === (session.userKey || session.dept);
    return n.recipientDept === session.dept;
  });
  const merged = [...visibleDbNotifications, ...memoryOnly];

  return NextResponse.json({
    ok: true,
    count: merged.length,
    notifications: merged,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const notificationId = Number(body?.notificationId || 0);

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId wajib diisi' }, { status: 400 });
    }

    const pool = await ensureNotificationTables();

    const result = await pool.request()
      .input('id', sql.Int, notificationId)
      .query('UPDATE Notification_Headers SET Is_Read = 1 WHERE ID_Notification = @id; SELECT @@ROWCOUNT AS updated');

    const updated = Number(result.recordset?.[0]?.updated || 0);

    if (updated === 0) {
      return NextResponse.json({ error: 'Notifikasi tidak ditemukan' }, { status: 404 });
    }

    const requestId = String(body?.requestId || '');
    if (requestId) {
      deliveryNotifications = deliveryNotifications.filter((n) => n.requestId !== requestId);
    }

    return NextResponse.json({ ok: true, notificationId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
