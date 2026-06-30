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

  const pool = await getConnection();
  const result = await pool.request()
    .input('sampleIds', sql.NVarChar(sql.MAX), JSON.stringify(notification.sampleIds))
    .input('loanIds', sql.NVarChar(sql.MAX), JSON.stringify(notification.loanIds))
    .input('countItems', sql.Int, notification.count)
    .input('senderDepartemen', sql.NVarChar(255), notification.senderDepartemen)
    .input('requesterUserKey', sql.NVarChar(120), notification.requesterUserKey || null)
    .input('requesterDept', sql.NVarChar(255), notification.requesterDept || null)
    .execute('sp_SampleReturnNotif_Insert');

  notification.id = Number(result.recordset[0]?.ID_Notification || 0);
  notification.createdAt = String(result.recordset[0]?.Created_At || '').trim() || new Date().toISOString();

  console.log('📬 Sample return notification received:', notification);

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

    const pool = await getConnection();
    const req = pool.request()
      .input('onlyUnread', sql.Bit, onlyUnread ? 1 : 0);

    if (session?.role === 'requester') {
      req.input('sessionRole', sql.NVarChar(20), 'requester');
      req.input('requesterDept', sql.NVarChar(255), session.dept);
      req.input('requesterUserKey', sql.NVarChar(120), session.userKey);
    } else {
      req.input('sessionRole', sql.NVarChar(20), session?.role || 'root');
    }

    const result = await req.execute('sp_SampleReturnNotif_GetList');

    const dbNotifications = result.recordset.map((row: any) => ({
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

    return NextResponse.json({
      ok: true,
      count: dbNotifications.length,
      notifications: dbNotifications,
    });
  } catch (error: any) {
    console.error('❌ GET sample-return-notifications failed:', error?.message || error);
    return NextResponse.json({ ok: true, count: 0, notifications: [] });
  }
}
