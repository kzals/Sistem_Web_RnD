import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME, AUTH_DISABLED, AUTH_BYPASS_SESSION } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (AUTH_DISABLED) {
    return NextResponse.json({
      userId: AUTH_BYPASS_SESSION.userId,
      dept: AUTH_BYPASS_SESSION.dept,
      role: AUTH_BYPASS_SESSION.role,
      userKey: AUTH_BYPASS_SESSION.userKey,
    });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ dept: null }, { status: 401 });
  }
  return NextResponse.json({
    userId: session.userId,
    dept: session.dept,
    role: session.role,
    userKey: session.userKey || session.dept,
  });
}
