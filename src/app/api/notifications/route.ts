import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';
import { ensureNotificationTables } from '../loan-notifications/_shared';

export const dynamic = 'force-dynamic';

function parseSqlDateTimeToMs(value: unknown): number {
  const raw = String(value || '').trim();
  if (!raw) return 0;

  const normalized = raw.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isFinite(parsed)) return parsed;

  // Fallback parser for SQL datetime format: YYYY-MM-DD HH:mm:ss
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return 0;

  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);

  return new Date(year, month, day, hour, minute, second).getTime();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sinceParam = (searchParams.get('since') || '').trim();
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const pool = await getConnection();

    await ensureNotificationTables(pool);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Sample_Return_Notifications')
      CREATE TABLE Sample_Return_Notifications (
        ID_Notification INT PRIMARY KEY IDENTITY(1,1),
        Sample_Ids NVARCHAR(MAX) NOT NULL,
        Loan_Ids NVARCHAR(MAX) NOT NULL,
        Count_Items INT NOT NULL,
        Sender_Departemen NVARCHAR(255) NOT NULL DEFAULT 'Unknown',
        Is_Read BIT NOT NULL DEFAULT 0,
        Pickup_Status NVARCHAR(50) NOT NULL DEFAULT 'Baru',
        Pickup_Confirmed_At DATETIME2 NULL,
        Created_At DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    `);

    await pool.request().query(`
      IF COL_LENGTH('Sample_Return_Notifications', 'Is_Read') IS NULL
        ALTER TABLE Sample_Return_Notifications ADD Is_Read BIT NOT NULL DEFAULT 0;
    `);

    await pool.request().query(`
      IF COL_LENGTH('Sample_Return_Notifications', 'Requester_User_Key') IS NULL
        ALTER TABLE Sample_Return_Notifications ADD Requester_User_Key NVARCHAR(120) NULL;
    `);

    await pool.request().query(`
      IF COL_LENGTH('Sample_Return_Notifications', 'Requester_Dept') IS NULL
        ALTER TABLE Sample_Return_Notifications ADD Requester_Dept NVARCHAR(255) NULL;
    `);

    const loanFilters: string[] = [];
    if (session?.role === 'requester') {
      loanFilters.push("ISNULL(n.Status_Request, 'Baru') <> 'Baru'");
      loanFilters.push('(n.Requester_Dept = @sessionDept OR n.Requester_User_Key = @sessionUserKey)');
    }
    const loanWhereClause = loanFilters.length > 0 ? `AND ${loanFilters.join(' AND ')}` : '';

    const returnFilters: string[] = [];
    if (session?.role === 'requester') {
      returnFilters.push("ISNULL(r.Pickup_Status, 'Baru') <> 'Baru'");
      returnFilters.push('(r.Requester_Dept = @sessionDept OR r.Requester_User_Key = @sessionUserKey)');
    }
    const returnWhereClause = returnFilters.length > 0 ? `AND ${returnFilters.join(' AND ')}` : '';

    // Fetch latest loan notifications
    const loanRequest = pool.request()
      .input('limit', sql.Int, limit)
      .input('targetApp', sql.NVarChar(50), 'ui_web_rnd')
      .input('targetAppAlt', sql.NVarChar(50), 'ui_ambil_sampel')
      .input('since', sql.DateTime, sinceParam || null);

    if (session?.role === 'requester') {
      loanRequest.input('sessionDept', sql.NVarChar(255), session.dept);
      loanRequest.input('sessionUserKey', sql.NVarChar(120), session.userKey || session.dept);
    }

    const loanResult = await loanRequest.query(`
        SELECT TOP (@limit)
          n.Request_ID,
          'pengambilan' as Notification_Type,
          n.Departemen as Sender_Departemen,
          n.Requested_Status as Status,
          CONCAT(n.Customer_Name, ' - ', COUNT(i.ID_Item), ' sampel') as Message,
          n.Is_Read,
          n.Urgency,
          CONVERT(VARCHAR(19), n.Created_At, 120) as Created_At,
          ROW_NUMBER() OVER (ORDER BY n.Created_At DESC) as RowNum
        FROM Loan_Request_Notifications n
        LEFT JOIN Loan_Request_Items i ON i.Request_ID = n.Request_ID
          WHERE (n.TargetApp = @targetApp
            OR n.TargetApp = @targetAppAlt
            OR n.TargetApp IS NULL
            OR LTRIM(RTRIM(n.TargetApp)) = '')
          ${loanWhereClause}
          AND (@since IS NULL OR n.Created_At >= @since)
        GROUP BY
          n.Request_ID,
          n.Departemen,
          n.Customer_Name,
          n.Requested_Status,
          n.Is_Read,
          n.Urgency,
          n.Created_At,
          n.TargetApp
        ORDER BY n.Created_At DESC
      `);

    // Fetch latest return notifications
    const returnRequest = pool.request()
      .input('limit', sql.Int, limit)
      .input('since', sql.DateTime, sinceParam || null)
    if (session?.role === 'requester') {
      returnRequest.input('sessionDept', sql.NVarChar(255), session.dept);
      returnRequest.input('sessionUserKey', sql.NVarChar(120), session.userKey || session.dept);
    }

    const returnResult = await returnRequest.query(`
        SELECT TOP (@limit)
          r.ID_Notification,
          'pengembalian' as Notification_Type,
          r.Sender_Departemen as Sender_Departemen,
          ISNULL(r.Pickup_Status, 'Baru') as Status,
          CONCAT('Pengembalian ', CAST(r.Count_Items as NVARCHAR(20)), ' sampel') as Message,
          ISNULL(r.Is_Read, 0) as Is_Read,
          NULL as Urgency,
          CONVERT(VARCHAR(19), ISNULL(r.Pickup_Confirmed_At, r.Created_At), 120) as Created_At
        FROM Sample_Return_Notifications r
        WHERE 1=1
        ${returnWhereClause}
        AND (@since IS NULL OR ISNULL(r.Pickup_Confirmed_At, r.Created_At) >= @since)
        ORDER BY ISNULL(r.Pickup_Confirmed_At, r.Created_At) DESC
      `);

    // Map to HistoryNotification format
    const loanNotifications = loanResult.recordset.map((row: any) => ({
      ID_Notification: row.RowNum,
      Notification_Type: row.Notification_Type,
      Request_ID: row.Request_ID,
      Sender_Departemen: row.Sender_Departemen,
      Status: row.Status,
      Message: row.Message,
      Is_Read: row.Is_Read === 1 || row.Is_Read === true,
      Created_At: row.Created_At,
      Urgency: row.Urgency,
    }));

    const returnNotifications = returnResult.recordset.map((row: any) => ({
      // Use negative ID to distinguish return notifications for mark-as-read endpoint.
      ID_Notification: -Math.abs(Number(row.ID_Notification || 0)),
      Notification_Type: row.Notification_Type,
      Request_ID: String(row.ID_Notification || ''),
      Sender_Departemen: row.Sender_Departemen,
      Status: row.Status,
      Message: row.Message,
      Is_Read: row.Is_Read === 1 || row.Is_Read === true,
      Created_At: row.Created_At,
      Urgency: row.Urgency,
    }));

    const notifications = [...loanNotifications, ...returnNotifications]
      .sort((a: any, b: any) => {
        const left = parseSqlDateTimeToMs(b.Created_At);
        const right = parseSqlDateTimeToMs(a.Created_At);
        return left - right;
      })
      .slice(0, limit);

    return NextResponse.json(
      { notifications },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
