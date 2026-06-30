import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import webpush from 'web-push';

type IngestBody = {
  requestId: string;
  customerName: string;
  departemen: string;
  requesterUserKey?: string;
  requesterDept?: string;
  status: string;
  notificationType?: 'pengambilan' | 'pengembalian';
  notes?: string;
  urgency?: 'Rendah' | 'Sedang' | 'Tinggi';
  samples: Array<{
    idSampel: number;
    design: string;
    lemari?: string | null;
    rakHanger?: string | null;
  }>;
};

function normalizeLoanStatus(value: unknown): 'Dipinjam' | 'Keluar' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'keluar') return 'Keluar';
  if (raw === 'dipinjam' || raw === 'siap dikirim') return 'Dipinjam';
  return null;
}

async function sendPushNotification(
  message: string,
  notificationType: 'pengambilan' | 'pengembalian' = 'pengambilan',
  requestId?: string,
  customerName?: string,
  departemen?: string,
  sampleCount?: number,
  urgency: string = 'Sedang',
  createdAt?: string
) {
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
    const subscriptions = await pool.request()
      .input('recipientDept', sql.NVarChar(100), 'RnD')
      .query(`
      SELECT Endpoint, P256DH, Auth FROM Push_Subscriptions
      WHERE Is_Active = 1
        AND Dept = @recipientDept
    `);

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
        const detailUrl = requestId
          ? `/loan-notifications/${encodeURIComponent(requestId)}`
          : '/loan-notifications';

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'Permintaan Sampel Baru',
            body: message,
            url: detailUrl,
            notificationType,
            Request_ID: requestId,
            Customer_Name: customerName,
            Departemen: departemen,
            Sample_Count: sampleCount,
            Urgency: urgency,
            Created_At: createdAt,
            createdAt,
            kind: 'loan',
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
  try {
    const body = (await request.json()) as IngestBody;
    const requestedStatus = normalizeLoanStatus(body.status);

    if (!body.requestId || !body.customerName || !body.departemen || !Array.isArray(body.samples) || body.samples.length === 0) {
      return NextResponse.json({ error: 'Payload notifikasi tidak valid' }, { status: 400 });
    }

    if (!requestedStatus) {
      return NextResponse.json({ error: 'Status permintaan tidak valid. Gunakan Dipinjam atau Keluar.' }, { status: 400 });
    }

    const pool = await getConnection();

    const upsertResult = await pool.request()
      .input('requestId', sql.NVarChar(64), body.requestId)
      .input('customerName', sql.NVarChar(255), body.customerName)
      .input('departemen', sql.NVarChar(255), body.departemen)
      .input('requesterUserKey', sql.NVarChar(120), body.requesterUserKey || null)
      .input('requesterDept', sql.NVarChar(255), body.requesterDept || body.departemen)
      .input('requestedStatus', sql.NVarChar(50), requestedStatus)
      .input('notes', sql.NVarChar(sql.MAX), body.notes || null)
      .input('urgency', sql.NVarChar(20), body.urgency || 'Sedang')
      .output('isDuplicate', sql.Bit)
      .execute('sp_LoanRequest_Upsert');

    const isDuplicate = upsertResult.output.isDuplicate;
    const createdAt = String(upsertResult.recordset?.[0]?.Created_At || '').trim();

    if (isDuplicate) {
      const existingItemsResult = await pool.request()
        .input('requestId', sql.NVarChar(64), body.requestId)
        .query(`
          SELECT ID_Sampel
          FROM Loan_Request_Items
          WHERE Request_ID = @requestId
        `);

      const existingSampleIds = new Set(
        (existingItemsResult.recordset || [])
          .map((row: any) => Number(row.ID_Sampel || 0))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      );

      for (const sample of body.samples) {
        if (existingSampleIds.has(sample.idSampel)) continue;

        await pool.request()
          .input('requestId', sql.NVarChar(64), body.requestId)
          .input('idSampel', sql.Int, sample.idSampel)
          .input('design', sql.NVarChar(255), sample.design)
          .input('lemari', sql.NVarChar(50), sample.lemari || null)
          .input('rak', sql.NVarChar(50), sample.rakHanger || null)
          .execute('sp_LoanRequest_InsertItem');
      }

      return NextResponse.json({ success: true, duplicate: true, requestId: body.requestId, synced: true });
    }

    for (const sample of body.samples) {
      await pool.request()
        .input('requestId', sql.NVarChar(64), body.requestId)
        .input('idSampel', sql.Int, sample.idSampel)
        .input('design', sql.NVarChar(255), sample.design)
        .input('lemari', sql.NVarChar(50), sample.lemari || null)
        .input('rak', sql.NVarChar(50), sample.rakHanger || null)
        .execute('sp_LoanRequest_InsertItem');
    }

    const pushMessage = `Permintaan pengambilan sampel baru dari ${body.departemen}: ${body.samples.length} sampel (${requestedStatus})`;
    const notificationType = body.notificationType || 'pengambilan';
    const pushResult = await sendPushNotification(
      pushMessage,
      notificationType,
      body.requestId,
      body.customerName,
      body.departemen,
      body.samples.length,
      body.urgency || 'Sedang',
      createdAt
    );

    return NextResponse.json({ 
      success: true, 
      requestId: body.requestId,
      pushNotification: pushResult 
    });
  } catch (error: any) {
    console.error('Loan notification ingest error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menerima notifikasi' }, { status: 500 });
  }
}
