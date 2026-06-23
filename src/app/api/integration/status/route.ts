import { NextResponse } from 'next/server';

export async function GET() {
  const rndBaseUrl = (process.env.RND_SYSTEM_BASE_URL || '').trim();

  if (!rndBaseUrl) {
    return NextResponse.json({
      connected: false,
      configured: false,
      message: 'RND_SYSTEM_BASE_URL belum diatur di .env.local'
    });
  }

  try {
    const response = await fetch(`${rndBaseUrl}/api/setup`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        configured: true,
        message: `Sistem R&D merespons status ${response.status}`
      });
    }

    const data = await response.json();
    return NextResponse.json({
      connected: true,
      configured: true,
      message: 'Terhubung ke sistem R&D',
      rnd: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      configured: true,
      message: `Gagal menghubungi sistem R&D: ${error.message}`
    });
  }
}
