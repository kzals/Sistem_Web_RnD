import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8001';

  try {
    const response = await fetch(`${baseUrl}/api/esp-status`, {
      method: 'GET',
      cache: 'no-store',
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Gagal mengambil status ESP',
      },
      { status: 502 }
    );
  }
}