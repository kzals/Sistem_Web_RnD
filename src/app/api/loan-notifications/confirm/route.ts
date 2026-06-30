import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
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

    const result = await pool.request()
      .input('requestId', sql.NVarChar(64), requestId)
      .input('sessionRole', sql.NVarChar(50), session?.role || null)
      .output('finalStatus', sql.NVarChar(50))
      .output('customerName', sql.NVarChar(255))
      .output('requesterUserKey', sql.NVarChar(120))
      .output('requesterDept', sql.NVarChar(255))
      .output('departemen', sql.NVarChar(255))
      .output('urgency', sql.NVarChar(20))
      .output('createdAt', sql.NVarChar(19))
      .output('sampleCount', sql.Int)
      .output('stockApplied', sql.Bit)
      .execute('sp_LoanRequest_Confirm');

    if (!result.output.customerName) {
      return NextResponse.json({ error: 'Request tidak ditemukan' }, { status: 404 });
    }

    const finalStatus = result.output.finalStatus;
    const customerName = String(result.output.customerName || '').trim();
    const recipientUserKey = String(result.output.requesterUserKey || '').trim() || null;
    const recipientDept = String(result.output.requesterDept || '').trim() || null;
    const departemen = String(result.output.departemen || '').trim() || null;
    const urgency = String(result.output.urgency || '').trim() || null;
    const createdAt = String(result.output.createdAt || '').trim() || null;
    const sampleCount = Number(result.output.sampleCount || 0);

    const pushResult = await sendPushNotificationToRequester({
      requestId,
      status: finalStatus,
      recipientUserKey,
      recipientDept,
      customerName,
      requestedStatus: finalStatus,
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
