import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { COOKIE_NAME, verifySessionToken, canAccessRnd } from '@/lib/auth';
import webpush from 'web-push';

type ConfirmBody = {
  notificationId: number;
};

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

    const pool = await getConnection();

    const detailResult = await pool.request()
      .input('id', sql.Int, notificationId)
      .execute('sp_SampleReturnNotif_GetById');

    if (detailResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Notifikasi pengembalian tidak ditemukan' }, { status: 404 });
    }

    const row = detailResult.recordset[0];

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

    const tx = new sql.Transaction(pool);
    await tx.begin();
    let confirmedAt = '';
    try {
      const confirmResult = await new sql.Request(tx)
        .input('notificationId', sql.Int, notificationId)
        .output('confirmedAt', sql.VarChar(19))
        .execute('sp_SampleReturnNotif_Confirm');
      confirmedAt = String(confirmResult.output?.confirmedAt || '').trim();

      if (!confirmedAt) {
        await tx.rollback();
        return NextResponse.json({
          success: true,
          notificationId,
          sourceDepartemen: String(row.Sender_Departemen || 'Unknown'),
          notifyResult: { delivered: true, skipped: true, reason: 'Notifikasi sudah pernah dikonfirmasi' },
        });
      }

      await tx.request()
        .input('notificationId', sql.Int, notificationId)
        .input('loanIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(loanIds))
        .execute('sp_StockMutation_ApplyReturn');
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
