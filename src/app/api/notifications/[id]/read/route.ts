import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rowNum = parseInt(params.id, 10);
    if (!rowNum || Number.isNaN(rowNum)) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const pool = await getConnection();

    if (rowNum < 0) {
      const returnId = Math.abs(rowNum);
      await pool.request()
        .input('id', sql.Int, returnId)
        .query(`
          IF COL_LENGTH('Sample_Return_Notifications', 'Is_Read') IS NULL
            ALTER TABLE Sample_Return_Notifications ADD Is_Read BIT NOT NULL DEFAULT 0;

          UPDATE Sample_Return_Notifications
          SET Is_Read = 1
          WHERE ID_Notification = @id
        `);
    } else {
      await pool.request()
        .input('rowNum', sql.Int, rowNum)
        .input('targetApp', sql.NVarChar(50), 'ui_web_rnd')
        .input('targetAppAlt', sql.NVarChar(50), 'ui_ambil_sampel')
        .query(`
          ;WITH OrderedNotifications AS (
            SELECT
              Request_ID,
              ROW_NUMBER() OVER (ORDER BY Created_At DESC) AS RowNum
            FROM Loan_Request_Notifications
            WHERE TargetApp = @targetApp
               OR TargetApp = @targetAppAlt
               OR TargetApp IS NULL
               OR LTRIM(RTRIM(TargetApp)) = ''
          )
          UPDATE n
          SET n.Is_Read = 1
          FROM Loan_Request_Notifications n
          INNER JOIN OrderedNotifications o ON o.Request_ID = n.Request_ID
          WHERE o.RowNum = @rowNum
        `);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
