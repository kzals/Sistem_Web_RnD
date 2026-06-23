import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { COOKIE_NAME, canManageUsers, normalizeAppRole, type AppRole, verifySessionToken } from '@/lib/auth';

function mapUserRow(row: any) {
  return {
    userId: Number(row.user_id || 0),
    dept: String(row.user_dept || ''),
    role: normalizeAppRole(row.roles) || 'requester',
    isActive: Boolean(row.is_active ?? 1),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    hasSession: Boolean(String(row.login_sessions || '').trim()),
  };
}

async function requireRootSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!canManageUsers(session?.role)) return null;
  return session;
}

async function ensureUsersColumns(pool: sql.ConnectionPool) {
  await pool.request().query(`
    IF COL_LENGTH('users', 'is_active') IS NULL
      ALTER TABLE users ADD is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT(1);
  `);

  await pool.request().query(`
    IF COL_LENGTH('users', 'created_at') IS NULL
      ALTER TABLE users ADD created_at DATETIME2 NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSDATETIME();
  `);

  await pool.request().query(`
    IF COL_LENGTH('users', 'updated_at') IS NULL
      ALTER TABLE users ADD updated_at DATETIME2 NULL;
  `);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRootSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const idSegment = parts[parts.length - 1];
    const userId = Number(idSegment || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'userId tidak valid' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureUsersColumns(pool);

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT TOP 1 user_id, user_dept, roles, password_hash, login_sessions, is_active, created_at, updated_at FROM users WHERE user_id = @userId`);

    if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: mapUserRow(result.recordset[0]) });
  } catch (error: any) {
    console.error('Admin users [id] GET error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil user' }, { status: 500 });
  }
}
