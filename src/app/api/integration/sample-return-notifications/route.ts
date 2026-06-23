import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

type ReturnNotificationBody = {
  sampleIds: number[];
  loanIds: number[];
  count?: number;
  senderDepartemen?: string;
};

function buildForwardTargets(request: NextRequest): string[] {
  const targets = new Set<string>();

  const directOrigin = String(request.nextUrl.origin || '').trim();
  if (directOrigin) {
    targets.add(`${directOrigin}/api/sample-return-notifications`);
  }

  const forwardedProto = String(request.headers.get('x-forwarded-proto') || '').trim();
  const forwardedHost = String(request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
  if (forwardedProto && forwardedHost) {
    targets.add(`${forwardedProto}://${forwardedHost}/api/sample-return-notifications`);
  }

  const port = String(process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000').trim();
  targets.add(`http://127.0.0.1:${port}/api/sample-return-notifications`);
  targets.add(`http://localhost:${port}/api/sample-return-notifications`);

  return Array.from(targets);
}

async function inferSenderDepartemen(loanIds: number[]) {
  if (!Array.isArray(loanIds) || loanIds.length === 0) return '';

  const cleaned = Array.from(new Set(loanIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (cleaned.length === 0) return '';

  const placeholders = cleaned.map((_, index) => `@loanId${index}`).join(', ');
  const pool = await getConnection();
  let req = pool.request();
  cleaned.forEach((id, index) => {
    req = req.input(`loanId${index}`, sql.Int, id);
  });

  const result = await req.query(`
    SELECT TOP 1 LTRIM(RTRIM(ISNULL(Departemen, ''))) as Departemen
    FROM Sample_Loan
    WHERE ID_Loan IN (${placeholders})
      AND LTRIM(RTRIM(ISNULL(Departemen, ''))) <> ''
  `);

  return String(result.recordset?.[0]?.Departemen || '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session?.dept) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ReturnNotificationBody;

    if (!Array.isArray(body?.sampleIds) || body.sampleIds.length === 0 || !Array.isArray(body?.loanIds)) {
      return NextResponse.json(
        { error: 'sampleIds dan loanIds wajib berupa array, dan sampleIds tidak boleh kosong' },
        { status: 400 }
      );
    }

    let senderDepartemen = String(body.senderDepartemen || '').trim();
    if (!senderDepartemen || senderDepartemen.toLowerCase() === 'unknown') {
      senderDepartemen = await inferSenderDepartemen(body.loanIds).catch(() => '');
    }
    if (!senderDepartemen) {
      senderDepartemen = 'Unknown';
    }

    const payload = {
      sampleIds: body.sampleIds,
      loanIds: body.loanIds,
      count: body.count || body.sampleIds.length,
      senderDepartemen,
      requesterUserKey: session.userKey || session.dept,
      requesterDept: session.dept,
    };

    const targets = buildForwardTargets(request);
    let lastError = '';
    let forwardedTo = '';
    let result: any = {};
    let success = false;

    for (const target of targets) {
      try {
        const response = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });

        const parsed = await response.json().catch(() => ({}));
        if (response.ok) {
          result = parsed;
          forwardedTo = target;
          success = true;
          break;
        }

        lastError = parsed?.error || `HTTP ${response.status}`;
      } catch (err: any) {
        lastError = err?.message || 'Unknown fetch error';
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: `Gagal mengirim notifikasi pengembalian: ${lastError || 'semua target internal gagal'}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      forwardedTo,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat mengirim notifikasi pengembalian' },
      { status: 500 }
    );
  }
}
