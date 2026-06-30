USE [db_SampelKain]
GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_Confirm]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- SP 6: Confirm Loan (transaksi lengkap)
-- =============================================
CREATE PROCEDURE [dbo].[sp_LoanRequest_Confirm]
    @requestId        NVARCHAR(64),
    @sessionRole      NVARCHAR(50),
    @finalStatus      NVARCHAR(50) = NULL OUTPUT,
    @customerName     NVARCHAR(255) = NULL OUTPUT,
    @requesterUserKey NVARCHAR(120) = NULL OUTPUT,
    @requesterDept    NVARCHAR(255) = NULL OUTPUT,
    @departemen       NVARCHAR(255) = NULL OUTPUT,
    @urgency          NVARCHAR(20) = NULL OUTPUT,
    @createdAt        NVARCHAR(19) = NULL OUTPUT,
    @sampleCount      INT = 0 OUTPUT,
    @stockApplied     BIT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @requestedStatus NVARCHAR(50);
    DECLARE @currentStatus NVARCHAR(50);
    DECLARE @localStockApplied BIT;

    SELECT
        @requestedStatus = Requested_Status,
        @currentStatus = Status_Request,
        @customerName = Customer_Name,
        @requesterUserKey = Requester_User_Key,
        @requesterDept = Requester_Dept,
        @departemen = Departemen,
        @urgency = Urgency,
        @createdAt = CONVERT(VARCHAR(19), Created_At, 120),
        @localStockApplied = ISNULL(Stock_Applied, 0)
    FROM Loan_Request_Notifications
    WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));

    IF @customerName IS NULL
    BEGIN
        RAISERROR('Request tidak ditemukan', 16, 1);
        RETURN;
    END;

    DECLARE @parsedRequested NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@requestedStatus, '')));
    DECLARE @parsedCurrent NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@currentStatus, '')));

    IF @finalStatus IS NULL
    BEGIN
        IF @parsedRequested IN ('Dipinjam', 'Keluar')
            SET @finalStatus = @parsedRequested;
        ELSE IF @parsedCurrent IN ('Dipinjam', 'Keluar')
            SET @finalStatus = @parsedCurrent;
        ELSE
            SET @finalStatus = 'Dipinjam';
    END;

    SELECT @sampleCount = COUNT(1)
    FROM Loan_Request_Items
    WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));

    IF @localStockApplied = 0
    BEGIN
        BEGIN TRAN;

        DECLARE @lockResult BIT;
        SELECT @lockResult = ISNULL(Stock_Applied, 0)
        FROM Loan_Request_Notifications WITH (UPDLOCK, ROWLOCK)
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));

        IF @lockResult = 0
        BEGIN
            DECLARE cur CURSOR FOR
                SELECT ID_Sampel, COUNT(1) AS Qty
                FROM Loan_Request_Items
                WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
                GROUP BY ID_Sampel;

            DECLARE @idSampel INT, @qty INT;
            OPEN cur;
            FETCH NEXT FROM cur INTO @idSampel, @qty;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                DECLARE @eventKey NVARCHAR(150) = 'loan-confirm:' + @requestId + ':' + CAST(@idSampel AS NVARCHAR);

                IF NOT EXISTS (SELECT 1 FROM Sample_Stock_Mutations WHERE Event_Key = @eventKey)
                BEGIN
                    UPDATE Master_Produk
                    SET Stok_Sampel = CASE WHEN ISNULL(Stok_Sampel, 0) >= ABS(-@qty)
                        THEN ISNULL(Stok_Sampel, 0) - ABS(-@qty)
                        ELSE 0 END
                    WHERE ID_Sampel = @idSampel;

                    INSERT INTO Sample_Stock_Mutations (Event_Key, Event_Type, Request_ID, ID_Sampel, Qty_Change, Notes)
                    VALUES (@eventKey, 'LOAN_CONFIRM', @requestId, @idSampel, -@qty,
                            'Konfirmasi R&D (' + @finalStatus + ')');
                END;

                FETCH NEXT FROM cur INTO @idSampel, @qty;
            END;

            CLOSE cur;
            DEALLOCATE cur;

            UPDATE Loan_Request_Notifications
            SET Status_Request = @finalStatus,
                Is_Read = 0,
                Stock_Applied = 1,
                Stock_Applied_At = GETDATE()
            WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));

            SET @stockApplied = 1;
        END;

        COMMIT TRAN;
    END
    ELSE
    BEGIN
        UPDATE Loan_Request_Notifications
        SET Status_Request = @finalStatus,
            Is_Read = 0
        WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));
    END;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_GetDetail]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_LoanRequest_GetDetail]
    @requestId NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Request_ID, Customer_Name, Departemen, Requested_Status, Status_Request,
           Notes, Urgency, Requested_By_App, Is_Read,
           CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
    FROM Loan_Request_Notifications
    WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId));

    SELECT ID_Item, Request_ID, ID_Sampel, Design, Lemari, Rak_Hanger, Created_At
    FROM Loan_Request_Items
    WHERE LTRIM(RTRIM(Request_ID)) = LTRIM(RTRIM(@requestId))
    ORDER BY ID_Item ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_GetList]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- SP 1: Get List Notifikasi (dengan filter role)
-- =============================================
CREATE PROCEDURE [dbo].[sp_LoanRequest_GetList]
    @onlyUnread     BIT = 0,
    @sessionRole    NVARCHAR(50) = NULL,
    @sessionDept    NVARCHAR(255) = NULL,
    @sessionUserKey NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @sql NVARCHAR(MAX);

    SET @sql = N'
        SELECT
            n.Request_ID,
            n.Customer_Name,
            n.Departemen,
            n.Requested_Status,
            n.Status_Request,
            n.Notes,
            n.Requested_By_App,
            n.Is_Read,
            n.Urgency,
            CONVERT(VARCHAR(19), n.Created_At, 120) AS Created_At,
            COUNT(i.ID_Item) AS Sample_Count
        FROM Loan_Request_Notifications n
        LEFT JOIN Loan_Request_Items i ON i.Request_ID = n.Request_ID
        WHERE 1=1';

    IF @onlyUnread = 1
    BEGIN
        SET @sql = @sql + N'
            AND n.Is_Read = 0
            AND n.Created_At >= DATEADD(DAY, -14, GETDATE())';

        IF @sessionRole IN ('rnd', 'root')
            SET @sql = @sql + N' AND ISNULL(n.Status_Request, ''Baru'') = ''Baru''';
    END

    IF @sessionRole = 'requester'
    BEGIN
        SET @sql = @sql + N'
            AND ISNULL(n.Status_Request, ''Baru'') <> ''Baru''
            AND (UPPER(LTRIM(RTRIM(ISNULL(n.Requester_Dept, '')))) = UPPER(LTRIM(RTRIM(@sessionDept)))
              OR UPPER(LTRIM(RTRIM(ISNULL(n.Requester_User_Key, '')))) = UPPER(LTRIM(RTRIM(@sessionUserKey))))';
    END

    SET @sql = @sql + N'
        GROUP BY
            n.Request_ID, n.Customer_Name, n.Departemen,
            n.Requested_Status, n.Status_Request, n.Notes,
            n.Requested_By_App, n.Is_Read, n.Urgency, n.Created_At
        ORDER BY n.Created_At DESC';

    EXEC sp_executesql @sql,
        N'@sessionDept NVARCHAR(255), @sessionUserKey NVARCHAR(120)',
        @sessionDept, @sessionUserKey;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_InsertItem]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- SP 5: Insert Item Notifikasi (single)
-- =============================================
CREATE PROCEDURE [dbo].[sp_LoanRequest_InsertItem]
    @requestId NVARCHAR(64),
    @idSampel  INT,
    @design    NVARCHAR(255),
    @lemari    NVARCHAR(50) = NULL,
    @rak       NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Loan_Request_Items (Request_ID, ID_Sampel, Design, Lemari, Rak_Hanger)
    VALUES (@requestId, @idSampel, @design, @lemari, @rak);
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_MarkRead]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- SP 3: Mark Notifikasi sebagai Dibaca
-- =============================================
CREATE PROCEDURE [dbo].[sp_LoanRequest_MarkRead]
    @requestId NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Loan_Request_Notifications
    SET Is_Read = 1
    WHERE Request_ID = @requestId;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_LoanRequest_Upsert]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- SP 4: Upsert Notifikasi + Sync Items
-- =============================================
CREATE PROCEDURE [dbo].[sp_LoanRequest_Upsert]
    @requestId        NVARCHAR(64),
    @customerName     NVARCHAR(255),
    @departemen       NVARCHAR(255),
    @requesterUserKey NVARCHAR(120) = NULL,
    @requesterDept    NVARCHAR(255) = NULL,
    @requestedStatus  NVARCHAR(50),
    @notes            NVARCHAR(MAX) = NULL,
    @urgency          NVARCHAR(20) = 'Sedang',
    @isDuplicate      BIT = 0 OUTPUT,
    @createdAt        NVARCHAR(19) = '' OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @existingRequestId NVARCHAR(64);

    SELECT @existingRequestId = Request_ID
    FROM Loan_Request_Notifications
    WHERE Request_ID = @requestId;

    IF @existingRequestId IS NOT NULL
    BEGIN
        SET @isDuplicate = 1;

        UPDATE Loan_Request_Notifications
        SET Customer_Name = @customerName,
            Departemen = @departemen,
            Requester_User_Key = @requesterUserKey,
            Requester_Dept = @requesterDept,
            Requested_Status = @requestedStatus,
            Notes = @notes,
            Urgency = @urgency
        WHERE Request_ID = @requestId;

        SELECT CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
        FROM Loan_Request_Notifications
        WHERE Request_ID = @requestId;

        RETURN;
    END

    INSERT INTO Loan_Request_Notifications
        (Request_ID, Customer_Name, Departemen, Requester_User_Key, Requester_Dept,
         Recipient_Mode, Requested_Status, Status_Request, Notes, Urgency,
         Requested_By_App, Is_Read, TargetApp)
    VALUES
        (@requestId, @customerName, @departemen, @requesterUserKey, @requesterDept,
         'RND_ALL', @requestedStatus, 'Baru', @notes, @urgency,
         'ui_crud_generic', 0, 'ui_web_rnd');

    SELECT CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
    FROM Loan_Request_Notifications
    WHERE Request_ID = @requestId;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleLoan_Delete]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- 5. DELETE (Query 5)
-- ========================================================
CREATE PROCEDURE [dbo].[sp_SampleLoan_Delete]
    @loanIds      NVARCHAR(MAX),
    @deletedCount INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Sample_Loan
    WHERE ID_Loan IN (SELECT TRIM(value) FROM STRING_SPLIT(@loanIds, ','));

    SET @deletedCount = @@ROWCOUNT;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleLoan_GetList]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- 4. GET LIST (Query 4)
-- ========================================================
CREATE PROCEDURE [dbo].[sp_SampleLoan_GetList]
    @departemen NVARCHAR(255) = NULL,
    @status     NVARCHAR(50)  = NULL,
    @search     NVARCHAR(255) = NULL,
    @dateFrom   DATE          = NULL,
    @dateTo     DATE          = NULL,
    @offset     INT           = 0,
    @limit      INT           = 20,
    @totalCount INT           = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT @totalCount = COUNT(*)
    FROM Sample_Loan sl
    LEFT JOIN Master_Produk m ON sl.ID_Sampel = m.ID_Sampel
    WHERE (@departemen IS NULL OR LTRIM(RTRIM(ISNULL(sl.Departemen, ''))) = LTRIM(RTRIM(@departemen)))
      AND (@status IS NULL
            OR LTRIM(RTRIM(ISNULL(sl.Status, ''))) = LTRIM(RTRIM(@status))
            OR (LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Siap Dikirim' AND LTRIM(RTRIM(@status)) = 'Dipinjam')
          )
      AND (@search IS NULL OR m.Design LIKE '%' + @search + '%' OR sl.Customer_Name LIKE '%' + @search + '%')
      AND (@dateFrom IS NULL OR CONVERT(date, sl.Loan_Date) >= @dateFrom)
      AND (@dateTo IS NULL OR CONVERT(date, sl.Loan_Date) <= @dateTo);

    SELECT 
        sl.ID_Loan,
        sl.ID_Sampel,
        m.Design,
        sl.Customer_Name,
        sl.Departemen,
        sl.Loan_Date,
        sl.Return_Date,
        CASE WHEN LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Siap Dikirim' THEN 'Dipinjam' ELSE sl.Status END as Status,
        sl.Notes,
        DATEDIFF(day, sl.Loan_Date, ISNULL(sl.Return_Date, GETDATE())) as Durasi_Hari
    FROM Sample_Loan sl
    LEFT JOIN Master_Produk m ON sl.ID_Sampel = m.ID_Sampel
    WHERE (@departemen IS NULL OR LTRIM(RTRIM(ISNULL(sl.Departemen, ''))) = LTRIM(RTRIM(@departemen)))
      AND (@status IS NULL
            OR LTRIM(RTRIM(ISNULL(sl.Status, ''))) = LTRIM(RTRIM(@status))
            OR (LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Siap Dikirim' AND LTRIM(RTRIM(@status)) = 'Dipinjam')
          )
      AND (@search IS NULL OR m.Design LIKE '%' + @search + '%' OR sl.Customer_Name LIKE '%' + @search + '%')
      AND (@dateFrom IS NULL OR CONVERT(date, sl.Loan_Date) >= @dateFrom)
      AND (@dateTo IS NULL OR CONVERT(date, sl.Loan_Date) <= @dateTo)
    ORDER BY sl.Loan_Date DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleLoan_GetStock]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- 3. GET STOCK (Query 3) - Diubah ke ALTER karena sudah ada di DB
-- ========================================================
CREATE PROCEDURE [dbo].[sp_SampleLoan_GetStock]
    @idSampel INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        m.ID_Sampel,
        m.Design,
        m.Lemari,
        ISNULL(m.Rak_Hanger, '-') as RakHanger,
        ISNULL((SELECT COUNT(*) FROM Sample_Loan WHERE ID_Sampel = @idSampel AND Status = 'Dipinjam'), 0) as JumlahDipinjam,
        ISNULL((SELECT COUNT(*) FROM Sample_Loan WHERE ID_Sampel = @idSampel AND Status = 'Dikembalikan'), 0) as JumlahDikembalikan
    FROM Master_Produk m
    WHERE m.ID_Sampel = @idSampel;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleLoan_Insert]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- 2. INSERT (Query 2)
-- ========================================================
CREATE PROCEDURE [dbo].[sp_SampleLoan_Insert]
    @idSampel     INT,
    @customerName NVARCHAR(255),
    @departemen   NVARCHAR(255),
    @status       NVARCHAR(50),
    @notes        NVARCHAR(MAX) = NULL,
    @newLoanId    INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Sample_Loan (ID_Sampel, Customer_Name, Departemen, Status, Notes)
    VALUES (@idSampel, @customerName, @departemen, @status, @notes);

    SET @newLoanId = SCOPE_IDENTITY();
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleLoan_UpdateStatus]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- 1. UPDATE STATUS (Query 1)
-- ========================================================
CREATE PROCEDURE [dbo].[sp_SampleLoan_UpdateStatus]
    @loanIds NVARCHAR(MAX),
    @status  NVARCHAR(50),
    @notes   NVARCHAR(MAX) = NULL,
    @updated INT = 0 OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Sample_Loan
    SET Status = @status,
        Return_Date = CASE WHEN @status = 'Dikembalikan' THEN GETDATE() ELSE Return_Date END,
        Notes = ISNULL(@notes, Notes)
    WHERE ID_Loan IN (SELECT TRIM(value) FROM STRING_SPLIT(@loanIds, ','));

    SET @updated = @@ROWCOUNT;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_Confirm]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_Confirm]
  @notificationId INT,
  @confirmedAt VARCHAR(19) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @currentStatus NVARCHAR(50);

  SELECT @currentStatus = Pickup_Status
  FROM Sample_Return_Notifications WITH (UPDLOCK, ROWLOCK)
  WHERE ID_Notification = @notificationId;

  IF @currentStatus IS NULL
  BEGIN
    RAISERROR('Notifikasi tidak ditemukan', 16, 1);
    RETURN;
  END

  IF @currentStatus IN ('Dikonfirmasi', 'Dikembalikan')
  BEGIN
    SET @confirmedAt = '';
    RETURN;
  END

  UPDATE Sample_Return_Notifications
  SET Pickup_Status = 'Dikonfirmasi', Pickup_Confirmed_At = GETDATE(), Is_Read = 0
  WHERE ID_Notification = @notificationId;

  SET @confirmedAt = CONVERT(VARCHAR(19), (SELECT Pickup_Confirmed_At FROM Sample_Return_Notifications WHERE ID_Notification = @notificationId), 120);
END

GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_GetById]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_GetById]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    ID_Notification,
    Sample_Ids,
    Loan_Ids,
    Count_Items,
    Sender_Departemen,
    Is_Read,
    Pickup_Status,
    Pickup_Confirmed_At,
    Created_At,
    Requester_User_Key,
    Requester_Dept
  FROM Sample_Return_Notifications
  WHERE ID_Notification = @id;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_GetList]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_GetList]
  @onlyUnread BIT = 0,
  @sessionRole NVARCHAR(20) = NULL,
  @requesterDept NVARCHAR(255) = NULL,
  @requesterUserKey NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 25
    ID_Notification,
    Sample_Ids,
    Loan_Ids,
    Count_Items,
    Sender_Departemen,
    Is_Read,
    Pickup_Status,
    CONVERT(VARCHAR(19), Pickup_Confirmed_At, 120) AS Pickup_Confirmed_At,
    CONVERT(VARCHAR(19), Created_At, 120) AS Created_At
  FROM Sample_Return_Notifications
  WHERE (@onlyUnread = 0 OR Is_Read = 0)
    AND (Created_At >= DATEADD(DAY, -14, GETDATE()) OR Pickup_Confirmed_At >= DATEADD(DAY, -14, GETDATE()))
    AND (@sessionRole IS NULL OR @sessionRole != 'requester' OR (ISNULL(Pickup_Status, 'Baru') != 'Baru' AND (Requester_Dept = @requesterDept OR Requester_User_Key = @requesterUserKey)))
  ORDER BY Created_At DESC;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_Insert]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_Insert]
  @sampleIds NVARCHAR(MAX),
  @loanIds NVARCHAR(MAX),
  @countItems INT,
  @senderDepartemen NVARCHAR(255),
  @requesterUserKey NVARCHAR(120) = NULL,
  @requesterDept NVARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO Sample_Return_Notifications (Sample_Ids, Loan_Ids, Count_Items, Sender_Departemen, Requester_User_Key, Requester_Dept, Is_Read, Pickup_Status, Created_At)
  OUTPUT INSERTED.ID_Notification, CONVERT(VARCHAR(19), INSERTED.Created_At, 120) AS Created_At
  VALUES (@sampleIds, @loanIds, @countItems, @senderDepartemen, @requesterUserKey, @requesterDept, 0, 'Baru', GETDATE());
END

GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_MarkRead]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_MarkRead]
  @id INT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE Sample_Return_Notifications
  SET Is_Read = 1
  WHERE ID_Notification = @id;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_SampleReturnNotif_SetReturned]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_SampleReturnNotif_SetReturned]
  @notificationId INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM Sample_Return_Notifications WHERE ID_Notification = @notificationId)
  BEGIN
    RAISERROR('Notifikasi tidak ditemukan', 16, 1);
    RETURN;
  END

  UPDATE Sample_Return_Notifications
  SET Pickup_Status = 'Dikembalikan',
      Pickup_Confirmed_At = ISNULL(Pickup_Confirmed_At, GETDATE())
  WHERE ID_Notification = @notificationId;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_StockMutation_ApplyReturn]    Script Date: 6/30/2026 11:41:38 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_StockMutation_ApplyReturn]
    @notificationId INT,
    @loanIdsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Insert mutasi stok (skip Keluar, skip duplikat event key)
    INSERT INTO Sample_Stock_Mutations (Event_Key, Event_Type, Return_Notification_ID, ID_Sampel, Qty_Change, Notes)
    SELECT
        'return-confirm:' + CAST(@notificationId AS VARCHAR) + ':' + CAST(sub.ID_Sampel AS VARCHAR),
        'RETURN_CONFIRM',
        @notificationId,
        sub.ID_Sampel,
        sub.Qty,
        'Konfirmasi pengembalian oleh R&D'
    FROM (
        SELECT sl.ID_Sampel, COUNT(1) AS Qty
        FROM OPENJSON(@loanIdsJson) AS ids
        JOIN Sample_Loan sl ON sl.ID_Loan = CAST(ids.[value] AS INT)
        WHERE LTRIM(RTRIM(ISNULL(sl.Status, ''))) <> 'Keluar'
        GROUP BY sl.ID_Sampel
    ) sub
    WHERE NOT EXISTS (
        SELECT 1 FROM Sample_Stock_Mutations
        WHERE Event_Key = 'return-confirm:' + CAST(@notificationId AS VARCHAR) + ':' + CAST(sub.ID_Sampel AS VARCHAR)
    );

    -- 2. Update stok Master_Produk
    UPDATE mp
    SET mp.Stok_Sampel = ISNULL(mp.Stok_Sampel, 0) + sub.Qty
    FROM Master_Produk mp
    JOIN (
        SELECT sl.ID_Sampel, COUNT(1) AS Qty
        FROM OPENJSON(@loanIdsJson) AS ids
        JOIN Sample_Loan sl ON sl.ID_Loan = CAST(ids.[value] AS INT)
        WHERE LTRIM(RTRIM(ISNULL(sl.Status, ''))) <> 'Keluar'
        GROUP BY sl.ID_Sampel
    ) sub ON mp.ID_Sampel = sub.ID_Sampel;

    -- 3. Update status Sample_Loan
    UPDATE sl
    SET sl.Status = CASE
        WHEN LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Keluar' THEN sl.Status
        ELSE 'Dikembalikan'
    END,
    sl.Return_Date = CASE
        WHEN LTRIM(RTRIM(ISNULL(sl.Status, ''))) = 'Keluar' THEN sl.Return_Date
        ELSE GETDATE()
    END
    FROM Sample_Loan sl
    JOIN OPENJSON(@loanIdsJson) AS ids ON sl.ID_Loan = CAST(ids.[value] AS INT);
END;
GO
