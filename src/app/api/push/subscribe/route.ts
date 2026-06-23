import { NextRequest, NextResponse } from "next/server";
import { getConnection, sql } from "@/lib/db";
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const body = await req.json();

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ success: false, error: 'Invalid subscription payload' }, { status: 400 });
  }

  console.log('[push-subscribe] incoming subscription:', endpoint?.slice(0, 60));

  const pool = await getConnection();

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Push_Subscriptions')
    CREATE TABLE Push_Subscriptions (
      ID_Subscription INT PRIMARY KEY IDENTITY(1,1),
      Endpoint NVARCHAR(MAX) NOT NULL,
      P256DH NVARCHAR(MAX) NOT NULL,
      Auth NVARCHAR(MAX) NOT NULL,
      Dept NVARCHAR(255) NULL,
      User_Key NVARCHAR(120) NULL,
      Is_Active BIT NOT NULL DEFAULT 1,
      TargetApp NVARCHAR(50) NOT NULL DEFAULT 'unknown',
      Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'Dept') IS NULL
      ALTER TABLE Push_Subscriptions ADD Dept NVARCHAR(255) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'User_Key') IS NULL
      ALTER TABLE Push_Subscriptions ADD User_Key NVARCHAR(120) NULL;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Push_Subscriptions', 'Is_Active') IS NULL
      ALTER TABLE Push_Subscriptions ADD Is_Active BIT NOT NULL DEFAULT 1;
  `);

  const dept = String(session?.dept || '').trim() || null;
  const userKey = String(session?.userKey || session?.dept || '').trim() || null;

  const existing = await pool.request()
    .input('endpoint', sql.NVarChar(sql.MAX), endpoint)
    .query('SELECT TOP 1 Endpoint FROM Push_Subscriptions WHERE Endpoint = @endpoint');

  if ((existing.recordset || []).length > 0) {
    await pool.request()
      .input('endpoint', sql.NVarChar(sql.MAX), endpoint)
      .input('p256dh', sql.NVarChar(sql.MAX), p256dh)
      .input('auth', sql.NVarChar(sql.MAX), auth)
      .input('dept', sql.NVarChar(255), dept)
      .input('userKey', sql.NVarChar(120), userKey)
      .input('targetApp', sql.NVarChar(50), 'ui_web_rnd')
      .query(`
        UPDATE Push_Subscriptions
        SET P256DH = @p256dh,
            Auth = @auth,
            Dept = COALESCE(@dept, Dept),
            User_Key = COALESCE(@userKey, User_Key),
            Is_Active = 1,
            TargetApp = @targetApp
        WHERE Endpoint = @endpoint
      `);

    return NextResponse.json({ success: true, updated: true });
  }

  await pool.request()
    .input("endpoint", sql.NVarChar(sql.MAX), endpoint)
    .input("p256dh", sql.NVarChar(sql.MAX), p256dh)
    .input("auth", sql.NVarChar(sql.MAX), auth)
    .input('dept', sql.NVarChar(255), dept)
    .input('userKey', sql.NVarChar(120), userKey)
    .input('isActive', sql.Bit, 1)
    .input("targetApp", sql.NVarChar(50), "ui_web_rnd")
    .query(`
      INSERT INTO Push_Subscriptions (Endpoint, P256DH, Auth, Dept, User_Key, Is_Active, TargetApp)
      VALUES (@endpoint, @p256dh, @auth, @dept, @userKey, @isActive, @targetApp)
    `);

  return NextResponse.json({ success: true });

}