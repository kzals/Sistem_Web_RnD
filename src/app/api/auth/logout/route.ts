import { NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME, AUTH_DISABLED } from '@/lib/auth';
import { getConnection, sql } from '@/lib/db';

export async function POST(request: Request) {
  if (AUTH_DISABLED) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  const token = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];

  if (token) {
    const session = await verifySessionToken(token);
    if (session?.userId) {
      const pool = await getConnection();
      await pool.request()
        .input('userId', sql.Int, session.userId)
        .query('UPDATE users SET login_sessions = NULL WHERE user_id = @userId');
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
