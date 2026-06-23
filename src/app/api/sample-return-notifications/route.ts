import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import webpush from 'web-push';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export interface SampleReturnNotification {
  id?: number;
  sampleIds: number[];
  loanIds: number[];
  count: number;
  createdAt: string;
  senderDepartemen: string;
  requesterUserKey?: string | null;
  requesterDept?: string | null;
  pickupStatus: 'Baru' | 'Dikonfirmasi' | 'Dikembalikan';
  pickupConfirmedAt?: string | null;
  isRead?: boolean;
}

let notifications: SampleReturnNotification[] = [];

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
      Is_Read BIT NOT NULL DEFAULT 0,
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
    IF COL_LENGTH('Sample_Return_Notifications', 'Is_Read') IS NULL
      ALTER TABLE Sample_Return_Notifications ADD Is_Read BIT NOT NULL DEFAULT 0;
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

async function insertNotificationToDb(notification: SampleReturnNotification) {
  const pool = await ensureSampleReturnTable();
  const result = await pool.request()
    .input('sampleIds', sql.NVarChar(sql.MAX), JSON.stringify(notification.sampleIds))
    .input('loanIds', sql.NVarChar(sql.MAX), JSON.stringify(notification.loanIds))
    .input('count', sql.Int, notification.count)
    .input('senderDepartemen', sql.NVarChar(255), notification.senderDepartemen)
    .input('requesterUserKey', sql.NVarChar(120), notification.requesterUserKey || null)
    .input('requesterDept', sql.NVarChar(255), notification.requesterDept || null)
    .input('isRead', sql.Bit, 0)
    .input('pickupStatus', sql.NVarChar(50), notification.pickupStatus)
    .query(`
      INSERT INTO Sample_Return_Notifications (Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Requester_User_Key, Requester_Dept, Is_Read, Pickup_Status, Created_At)
      OUTPUT INSERTED.ID_Notification as ID_Notification, CONVERT(VARCHAR(19), INSERTED.Created_At, 120) as Created_At
      VALUES (@sampleIds, @loanIds, @count, @senderDepartemen, @requesterUserKey, @requesterDept, @isRead, @pickupStatus, GETDATE())
    `);

  return {
    id: Number(result.recordset[0]?.ID_Notification || 0),
    createdAt: String(result.recordset[0]?.Created_At || '').trim(),
  };
}

async function getNotificationsFromDb(
  onlyUnread: boolean,
  session: { role: 'rnd' | 'requester' | 'root'; dept?: string; userKey?: string } | null
) {
  const pool = await ensureSampleReturnTable();

  // Try primary query with Is_Read filter
  let result;
  try {
    const req = pool.request()
      .input('onlyUnread', sql.Bit, onlyUnread ? 1 : 0);

    if (session?.role === 'requester') {
      req.input('sessionDept', sql.NVarChar(255), session.dept);
      req.input('sessionUserKey', sql.NVarChar(120), session.userKey || session.dept);
    }

    const requesterFilter = session?.role === 'requester'
      ? "AND ISNULL(Pickup_Status, 'Baru') <> 'Baru' AND (Requester_Dept = @sessionDept OR Requester_User_Key = @sessionUserKey)"
      : '';
    result = await req.query(`
      SELECT TOP 25 ID_Notification, Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Is_Read, Pickup_Status,
             CONVERT(VARCHAR(19), Pickup_Confirmed_At, 120) AS Pickup_Confirmed_At,
             CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
      FROM Sample_Return_Notifications
      WHERE (@onlyUnread = 0 OR Is_Read = 0)
      AND (Created_At >= DATEADD(DAY, -14, GETDATE()) OR Pickup_Confirmed_At >= DATEADD(DAY, -14, GETDATE()))
      ${requesterFilter}
      ORDER BY Created_At DESC
    `);
  } catch (queryErr: any) {
    // Fallback: query tanpa Is_Read filter jika column bermasalah
    console.warn('⚠ Sample_Return_Notifications primary query failed, trying fallback:', queryErr?.message);
    const fallbackReq = pool.request();
    if (session?.role === 'requester') {
      fallbackReq.input('sessionDept', sql.NVarChar(255), session.dept);
      fallbackReq.input('sessionUserKey', sql.NVarChar(120), session.userKey || session.dept);
    }
    const requesterFilter = session?.role === 'requester'
      ? "AND ISNULL(Pickup_Status, 'Baru') <> 'Baru' AND (Requester_Dept = @sessionDept OR Requester_User_Key = @sessionUserKey)"
      : '';
    result = await fallbackReq.query(`
      SELECT TOP 25 ID_Notification, Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Pickup_Status,
             CONVERT(VARCHAR(19), Pickup_Confirmed_At, 120) AS Pickup_Confirmed_At,
             CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
      FROM Sample_Return_Notifications
      WHERE ISNULL(Pickup_Status, 'Baru') != 'Dikembalikan'
      AND Created_At >= DATEADD(DAY, -14, GETDATE())
      ${requesterFilter}
      ORDER BY Created_At DESC
    `);
  }

  return result.recordset.map((row: any) => ({
    id: Number(row.ID_Notification || 0),
    sampleIds: JSON.parse(row.Sample_Ids || '[]'),
    loanIds: JSON.parse(row.Loan_Ids || '[]'),
    count: Number(row.Count_Items || 0),
    senderDepartemen: String(row.Sender_Departemen || 'Unknown'),
    isRead: Boolean(row.Is_Read),
    pickupStatus: row.Pickup_Status === 'Dikembalikan'
      ? 'Dikembalikan'
      : row.Pickup_Status === 'Dikonfirmasi'
        ? 'Dikonfirmasi'
        : 'Baru',
    pickupConfirmedAt: row.Pickup_Confirmed_At ? String(row.Pickup_Confirmed_At) : null,
    createdAt:
      row.Pickup_Status === 'Dikonfirmasi' && row.Pickup_Confirmed_At
        ? String(row.Pickup_Confirmed_At)
        : row.Created_At
          ? String(row.Created_At)
          : '',
  })) as SampleReturnNotification[];
}

async function sendPushNotification(notification: SampleReturnNotification) {
  try {
    const vapidEmail = process.env.VAPID_EMAIL;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
      console.warn('⚠️ VAPID config belum lengkap, skip web push');
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
      const pushSubscription = {
        endpoint: sub.Endpoint,
        keys: {
          p256dh: sub.P256DH,
          auth: sub.Auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'Notifikasi Pengembalian Sampel',
            body: `Ada ${notification.count} sampel yang akan dikembalikan oleh ${notification.senderDepartemen}`,
            url: notification.id ? `/sample-return-notifications/${notification.id}` : '/loan-notifications',
            notificationType: 'pengembalian',
            id: notification.id,
            sampleIds: notification.sampleIds,
            loanIds: notification.loanIds,
            count: notification.count,
            senderDepartemen: notification.senderDepartemen,
            pickupStatus: notification.pickupStatus,
            createdAt: notification.createdAt,
          })
        );
        sent += 1;
      } catch (pushErr: any) {
        failed += 1;
        const statusCode = Number(pushErr?.statusCode || 0);
        console.error('⚠️ Gagal kirim web push:', statusCode || '-', pushErr?.message || pushErr);

        // Remove expired/stale subscriptions
        if (statusCode === 404 || statusCode === 410) {
          await pool.request()
            .input('endpoint', sql.NVarChar(sql.MAX), sub.Endpoint)
            .query('DELETE FROM Push_Subscriptions WHERE Endpoint = @endpoint');
        }
      }
    }

    return { sent, failed, attempted: (subscriptions.recordset || []).length };
  } catch (error: any) {
    console.error('❌ Gagal kirim push notification:', error?.message || error);
    return { error: error?.message || 'Gagal kirim push notification' };
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    !Array.isArray(body.sampleIds) ||
    !Array.isArray(body.loanIds) ||
    body.sampleIds.length === 0
  ) {
    return NextResponse.json(
      { error: 'Invalid request body. Require sampleIds, loanIds, count.' },
      { status: 400 }
    );
  }

  const notification: SampleReturnNotification = {
    sampleIds: body.sampleIds,
    loanIds: body.loanIds,
    count: body.count || body.sampleIds.length,
    createdAt: '',
    senderDepartemen: String(body.senderDepartemen || '').trim() || 'Unknown',
    requesterUserKey: String(body.requesterUserKey || '').trim() || null,
    requesterDept: String(body.requesterDept || '').trim() || null,
    pickupStatus: 'Baru',
    pickupConfirmedAt: null,
  };

  try {
    const inserted = await insertNotificationToDb(notification);
    notification.id = inserted.id;
    notification.createdAt = inserted.createdAt || new Date().toISOString();
  } catch (error) {
    notification.createdAt = new Date().toISOString();
    notifications.push(notification);
  }

  console.log('📬 Sample return notification received:', notification);

  // ✅ Send push notification to R&D staff
  const pushResult = await sendPushNotification(notification);

  return NextResponse.json({
    ok: true,
    message: `Menerima notifikasi pengembalian ${notification.count} sampel dari ${notification.senderDepartemen}`,
    notification,
    pushNotification: pushResult,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get('onlyUnread') === '1';
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const rawSession = token ? await verifySessionToken(token) : null;
    const session = rawSession
      ? {
          role: rawSession.role,
          dept: rawSession.dept,
          userKey: rawSession.userKey || rawSession.dept,
        }
      : null;
    const dbNotifications = await getNotificationsFromDb(onlyUnread, session);
    return NextResponse.json({
      ok: true,
      count: dbNotifications.length,
      notifications: dbNotifications,
    });
  } catch (error: any) {
    console.error('❌ GET sample-return-notifications failed:', error?.message || error);
    return NextResponse.json({
      ok: true,
      count: notifications.length,
      notifications: notifications.slice(-10),
      source: 'memory-fallback',
    });
  }
}
