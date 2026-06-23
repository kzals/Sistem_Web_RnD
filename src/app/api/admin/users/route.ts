import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { COOKIE_NAME, canManageUsers, normalizeAppRole, type AppRole, verifySessionToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeRoleForStorage(value: unknown): AppRole | null {
  return normalizeAppRole(value);
}

async function requireRootSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!canManageUsers(session?.role)) {
    return null;
  }
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

async function getActiveRootCount(pool: sql.ConnectionPool) {
  const result = await pool.request().query(`
    SELECT COUNT(*) AS total
    FROM users
    WHERE LOWER(LTRIM(RTRIM(ISNULL(roles, '')))) = 'root'
      AND ISNULL(is_active, 1) = 1
  `);
  return Number(result.recordset[0]?.total || 0);
}

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

export async function GET(request: NextRequest) {
  try {
    const session = await requireRootSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const pool = await getConnection();
    await ensureUsersColumns(pool);

    const result = await pool.request().query(`
      SELECT user_id, user_dept, roles, password_hash, login_sessions, is_active, created_at, updated_at
      FROM users
      ORDER BY user_id ASC
    `);

    return NextResponse.json({
      users: (result.recordset || []).map(mapUserRow),
      totalRootUsers: await getActiveRootCount(pool),
    });
  } catch (error: any) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: error.message || 'Gagal mengambil daftar user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRootSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const dept = normalizeText(body?.dept);
    const password = normalizeText(body?.password);
    const role = normalizeRoleForStorage(body?.role);
    const isActive = body?.isActive === false ? 0 : 1;

    if (!dept) {
      return NextResponse.json({ error: 'Departemen wajib diisi' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password wajib diisi' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureUsersColumns(pool);

    const existing = await pool.request()
      .input('dept', sql.NVarChar(255), dept)
      .query(`SELECT TOP 1 user_id FROM users WHERE UPPER(LTRIM(RTRIM(user_dept))) = UPPER(LTRIM(RTRIM(@dept)))`);

    if (existing.recordset.length > 0) {
      return NextResponse.json({ error: 'Departemen sudah terdaftar' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const result = await pool.request()
      .input('dept', sql.NVarChar(255), dept)
      .input('role', sql.NVarChar(50), role.toUpperCase())
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .input('isActive', sql.Bit, isActive)
      .input('createdAt', sql.DateTime2, new Date())
      .query(`
        INSERT INTO users (user_dept, roles, password_hash, login_sessions, is_active, created_at, updated_at)
        OUTPUT INSERTED.user_id, INSERTED.user_dept, INSERTED.roles, INSERTED.password_hash, INSERTED.login_sessions, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
        VALUES (@dept, @role, @passwordHash, NULL, @isActive, @createdAt, @createdAt)
      `);

    return NextResponse.json({ user: mapUserRow(result.recordset[0]) }, { status: 201 });
  } catch (error: any) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRootSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const userId = Number(body?.userId || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'userId tidak valid' }, { status: 400 });
    }

    const dept = body?.dept !== undefined ? normalizeText(body?.dept) : undefined;
    const role = body?.role !== undefined ? normalizeRoleForStorage(body?.role) : undefined;
    if (body?.role !== undefined && !role) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 });
    }
    const password = body?.password !== undefined ? normalizeText(body?.password) : undefined;
    const isActive = body?.isActive !== undefined ? Boolean(body?.isActive) : undefined;

    const pool = await getConnection();
    await ensureUsersColumns(pool);

    const currentResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT TOP 1 user_id, user_dept, roles, is_active FROM users WHERE user_id = @userId`);

    const current = currentResult.recordset[0];
    if (!current) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const currentRole = normalizeAppRole(current.roles);
    if (session.userId === userId && (role !== undefined || isActive === false)) {
      return NextResponse.json({ error: 'Tidak bisa menurunkan atau menonaktifkan akun ROOT sendiri' }, { status: 400 });
    }

    const activeRootCount = await getActiveRootCount(pool);
    if (currentRole === 'root' && role && role !== 'root' && activeRootCount <= 1) {
      return NextResponse.json({ error: 'Tidak bisa menurunkan ROOT terakhir' }, { status: 400 });
    }

    if (currentRole === 'root' && isActive === false && activeRootCount <= 1) {
      return NextResponse.json({ error: 'Tidak bisa menonaktifkan ROOT terakhir' }, { status: 400 });
    }

    if (dept !== undefined) {
      const duplicateDept = await pool.request()
        .input('dept', sql.NVarChar(255), dept)
        .input('userId', sql.Int, userId)
        .query(`
          SELECT TOP 1 user_id
          FROM users
          WHERE UPPER(LTRIM(RTRIM(user_dept))) = UPPER(LTRIM(RTRIM(@dept)))
            AND user_id <> @userId
        `);
      if (duplicateDept.recordset.length > 0) {
        return NextResponse.json({ error: 'Departemen sudah digunakan user lain' }, { status: 409 });
      }
    }

    const updateParts: string[] = [];
    const req = pool.request().input('userId', sql.Int, userId);

    if (dept !== undefined) {
      req.input('dept', sql.NVarChar(255), dept);
      updateParts.push('user_dept = @dept');
    }

    if (role !== undefined) {
      // role is validated above; ensure not null before using
      req.input('role', sql.NVarChar(50), (role as string).toUpperCase());
      updateParts.push('roles = @role');
    }

    if (password !== undefined && password) {
      req.input('passwordHash', sql.NVarChar(255), hashPassword(password));
      updateParts.push('password_hash = @passwordHash');
      updateParts.push('login_sessions = NULL');
    }

    if (isActive !== undefined) {
      req.input('isActive', sql.Bit, isActive ? 1 : 0);
      updateParts.push('is_active = @isActive');
      if (!isActive) {
        updateParts.push('login_sessions = NULL');
      }
    }

    if (updateParts.length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan yang dikirim' }, { status: 400 });
    }

    updateParts.push('updated_at = SYSDATETIME()');

    const result = await req.query(`
      UPDATE users
      SET ${updateParts.join(', ')}
      OUTPUT INSERTED.user_id, INSERTED.user_dept, INSERTED.roles, INSERTED.password_hash, INSERTED.login_sessions, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
      WHERE user_id = @userId
    `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: mapUserRow(result.recordset[0]) });
  } catch (error: any) {
    console.error('Admin users PUT error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRootSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === '1';

    const body = await request.json().catch(() => null);
    const userId = Number(body?.userId || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'userId tidak valid' }, { status: 400 });
    }

    if (session.userId === userId) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 });
    }

    const pool = await getConnection();
    await ensureUsersColumns(pool);

    const currentResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT TOP 1 user_id, roles FROM users WHERE user_id = @userId`);

    const current = currentResult.recordset[0];
    if (!current) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const currentRole = normalizeAppRole(current.roles);
    const activeRootCount = await getActiveRootCount(pool);
    if (currentRole === 'root' && activeRootCount <= 1) {
      return NextResponse.json({ error: 'Tidak bisa menghapus ROOT terakhir' }, { status: 400 });
    }

    if (hard) {
      await pool.request()
        .input('userId', sql.Int, userId)
        .query(`DELETE FROM users WHERE user_id = @userId`);

      return NextResponse.json({ success: true, deleted: true });
    }

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE users
        SET is_active = 0,
            login_sessions = NULL,
            updated_at = SYSDATETIME()
        OUTPUT INSERTED.user_id, INSERTED.user_dept, INSERTED.roles, INSERTED.password_hash, INSERTED.login_sessions, INSERTED.is_active, INSERTED.created_at, INSERTED.updated_at
        WHERE user_id = @userId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: mapUserRow(result.recordset[0]) });
  } catch (error: any) {
    console.error('Admin users DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus user' }, { status: 500 });
  }
}
