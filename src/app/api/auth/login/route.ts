import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME, AUTH_DISABLED, AUTH_BYPASS_SESSION, type AppRole } from '@/lib/auth';
import { getConnection, sql } from '@/lib/db';
import { verifyPassword } from '@/lib/password';

function normalizeDeptKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRoleKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapLegacyRoleToAppRole(value: string): AppRole | null {
  const key = normalizeRoleKey(value);
  if (key === 'root') return 'root';
  if (key === 'rnd' || key === 'rd') return 'rnd';
  if (key === 'requester' || key === 'design' || key === 'tic' || key === 'marketing') return 'requester';
  return null;
}

export async function POST(request: NextRequest) {
  if (AUTH_DISABLED) {
    const token = await createSessionToken(AUTH_BYPASS_SESSION);
    const response = NextResponse.json({ ok: true, ...AUTH_BYPASS_SESSION });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.dept !== 'string' ||
    typeof body.password !== 'string'
  ) {
    return NextResponse.json({ error: 'Input tidak valid.' }, { status: 400 });
  }

  const { dept, password } = body as {
    dept: string;
    password: string;
  };
  const requestedDept = String(dept || '').trim();
  const requestedDeptKey = normalizeDeptKey(requestedDept);
  if (!requestedDeptKey) {
    return NextResponse.json({ error: 'Nama departemen wajib diisi.' }, { status: 400 });
  }

  const pool = await getConnection();
  const result = await pool.request()
    .query(`
      SELECT user_id, user_dept, roles, password_hash
      FROM users
      WHERE user_dept IS NOT NULL
        AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(roles)), '&', ''), ' ', '')) IN ('rnd', 'rd', 'requester', 'design', 'tic', 'marketing', 'root')
      ORDER BY user_id ASC
    `);

  const matchingUsers = (result.recordset || []).filter((row: any) => {
    const deptValue = String(row?.user_dept || '').trim();
    return normalizeDeptKey(deptValue) === requestedDeptKey;
  });

  if (matchingUsers.length > 1) {
    return NextResponse.json(
      { error: 'Departemen terdaftar pada lebih dari satu tipe akses. Hubungi admin.' },
      { status: 409 }
    );
  }

  const user = matchingUsers[0];
  const role = mapLegacyRoleToAppRole(String(user?.roles || ''));
  if (!role) {
    return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
  }

  const storedHash = String(user?.password_hash || '');
  const isValid = Boolean(user) && verifyPassword(password, storedHash);

  if (!isValid) {
    return NextResponse.json({ error: 'Nama departemen atau password salah.' }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: Number(user.user_id),
    dept: String(user.user_dept),
    role,
    userKey: String(user.user_dept),
  });

  await pool.request()
    .input('userId', sql.Int, Number(user.user_id))
    .input('token', sql.NVarChar(sql.MAX), token)
    .query('UPDATE users SET login_sessions = @token WHERE user_id = @userId');

  const response = NextResponse.json({ ok: true, dept: String(user.user_dept), role });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
