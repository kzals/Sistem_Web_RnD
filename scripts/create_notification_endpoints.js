// Script to create /api/notifications endpoints
const fs = require('fs');
const path = require('path');

const projects = [
  { name: 'ui_web_rnd', port: 3000 },
  { name: 'ui_ambil_sampel', port: 3001 }
];

projects.forEach(project => {
  const notifFolder = path.join(__dirname, '..', project.name, 'src', 'app', 'api', 'notifications');
  const routePath = path.join(notifFolder, 'route.ts');
  const notifIdFolder = path.join(notifFolder, '[id]');
  const notifIdReadPath = path.join(notifIdFolder, 'read', 'route.ts');

  const routeContent = `import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const pool = await getConnection();

    // Ensure table exists
    await pool.request().query(\`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Loan_Request_Notifications')
      CREATE TABLE Loan_Request_Notifications (
        Request_ID NVARCHAR(64) PRIMARY KEY,
        Customer_Name NVARCHAR(255) NOT NULL,
        Departemen NVARCHAR(255) NOT NULL,
        Requested_Status NVARCHAR(50) NOT NULL DEFAULT 'Dipinjam',
        Status_Request NVARCHAR(50) NOT NULL DEFAULT 'Baru',
        Notes NVARCHAR(MAX) NULL,
        Requested_By_App NVARCHAR(100) NOT NULL DEFAULT 'ui_crud_generic',
        Is_Read BIT NOT NULL DEFAULT 0,
        Created_At DATETIME NOT NULL DEFAULT GETDATE()
      )
    \`);

    // Fetch latest notifications
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(\`
        SELECT TOP (\@limit)
          n.Request_ID as Request_ID,
          'pengambilan' as Notification_Type,
          n.Request_ID,
          n.Departemen as Sender_Departemen,
          n.Requested_Status as Status,
          CONCAT(n.Customer_Name, ' - ', COUNT(i.ID_Item), ' sampel') as Message,
          n.Is_Read,
          DATEADD(HOUR, -7, n.Created_At) as Created_At,
          ROW_NUMBER() OVER (ORDER BY n.Created_At DESC) as RowNum
        FROM Loan_Request_Notifications n
        LEFT JOIN Loan_Request_Items i ON i.Request_ID = n.Request_ID
        GROUP BY
          n.Request_ID,
          n.Departemen,
          n.Customer_Name,
          n.Requested_Status,
          n.Is_Read,
          n.Created_At
        ORDER BY n.Created_At DESC
      \`);

    // Map to HistoryNotification format
    const notifications = result.recordset.map((row: any) => ({
      ID_Notification: row.RowNum,
      Notification_Type: row.Notification_Type,
      Request_ID: row.Request_ID,
      Sender_Departemen: row.Sender_Departemen,
      Status: row.Status,
      Message: row.Message,
      Is_Read: row.Is_Read === 1 || row.Is_Read === true,
      Created_At: row.Created_At,
    }));

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

  const readContent = `import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const pool = await getConnection();

    // Mark as read
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(\`
        UPDATE Loan_Request_Notifications
        SET Is_Read = 1
        WHERE Request_ID IN (
          SELECT Request_ID FROM Loan_Request_Notifications
          ORDER BY Created_At DESC
          OFFSET @id ROWS FETCH NEXT 1 ROW ONLY
        )
      \`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

  try {
    // Create folders
    fs.mkdirSync(notifFolder, { recursive: true });
    fs.mkdirSync(notifIdFolder, { recursive: true });
    fs.mkdirSync(path.join(notifIdFolder, 'read'), { recursive: true });

    // Write route.ts
    fs.writeFileSync(routePath, routeContent, 'utf8');
    console.log(`✅ Created ${project.name} /api/notifications/route.ts`);

    // Write [id]/read/route.ts
    fs.writeFileSync(notifIdReadPath, readContent, 'utf8');
    console.log(`✅ Created ${project.name} /api/notifications/[id]/read/route.ts`);
  } catch (error) {
    console.error(`❌ Error creating ${project.name} endpoints:`, error.message);
  }
});

console.log('\\n✅ Notification endpoints created for both projects!');
