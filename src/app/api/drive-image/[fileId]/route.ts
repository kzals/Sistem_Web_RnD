import { NextRequest, NextResponse } from 'next/server';

async function getGoogleDriveToken() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Konfigurasi Google Drive OAuth belum lengkap');
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson?.access_token) {
    throw new Error(tokenJson?.error_description || tokenJson?.error || `Gagal ambil access token (${tokenRes.status})`);
  }

  return tokenJson.access_token as string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = String(params?.fileId || '').trim();
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return NextResponse.json({ error: 'fileId tidak valid' }, { status: 400 });
    }

    const token = await getGoogleDriveToken();

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return NextResponse.json(
        { error: `Gagal ambil gambar dari Drive (${driveRes.status})`, detail: errText.slice(0, 300) },
        { status: driveRes.status }
      );
    }

    const contentType = driveRes.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = driveRes.headers.get('cache-control') || 'public, max-age=300';
    const bytes = await driveRes.arrayBuffer();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
