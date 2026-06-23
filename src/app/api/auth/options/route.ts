import { NextResponse } from 'next/server';
import { AUTH_DISABLED, AUTH_BYPASS_SESSION } from '@/lib/auth';
import { getConnection } from '@/lib/db';

export async function GET() {
  if (AUTH_DISABLED) {
    return NextResponse.json({ departments: [AUTH_BYPASS_SESSION.dept] });
  }

  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT user_dept
      FROM users
      WHERE LOWER(REPLACE(REPLACE(LTRIM(RTRIM(roles)), '&', ''), ' ', '')) IN ('rnd', 'rd', 'requester', 'design', 'tic', 'marketing')
      ORDER BY user_dept
    `);

    const departments = new Set<string>();
    for (const row of result.recordset || []) {
      const dept = String(row.user_dept || '').trim();
      if (dept) {
        departments.add(dept);
      }
    }

    return NextResponse.json({ departments: Array.from(departments) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal mengambil opsi login.' },
      { status: 500 }
    );
  }
}
