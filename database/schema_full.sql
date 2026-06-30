USE [db_SampelKain]
GO
/****** Object:  Table [dbo].[Konstruksi_Tenun]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Konstruksi_Tenun](
	[ID_Konstruksi] [int] IDENTITY(1,1) NOT NULL,
	[ID_Sampel] [int] NULL,
	[Weave_Constr] [varchar](100) NULL,
	[Density_Warp] [int] NULL,
	[Density_Weft] [int] NULL,
	[Nomor_Sisir] [decimal](5, 2) NULL,
	[Lebar_Sisir] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Konstruksi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Loan_Request_Items]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Loan_Request_Items](
	[ID_Item] [int] IDENTITY(1,1) NOT NULL,
	[Request_ID] [nvarchar](64) NOT NULL,
	[ID_Sampel] [int] NOT NULL,
	[Design] [nvarchar](255) NOT NULL,
	[Lemari] [nvarchar](50) NULL,
	[Rak_Hanger] [nvarchar](50) NULL,
	[Created_At] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Item] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Loan_Request_Notifications]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Loan_Request_Notifications](
	[Request_ID] [nvarchar](64) NOT NULL,
	[Customer_Name] [nvarchar](255) NOT NULL,
	[Departemen] [nvarchar](255) NOT NULL,
	[Status_Request] [nvarchar](50) NOT NULL,
	[Notes] [nvarchar](max) NULL,
	[Requested_By_App] [nvarchar](100) NOT NULL,
	[Is_Read] [bit] NOT NULL,
	[Created_At] [datetime] NOT NULL,
	[Requested_Status] [nvarchar](50) NOT NULL,
	[TargetApp] [varchar](100) NULL,
	[Urgency] [nvarchar](20) NULL,
	[Requester_User_Key] [nvarchar](120) NULL,
	[Requester_Dept] [nvarchar](255) NULL,
	[Recipient_Mode] [nvarchar](30) NOT NULL,
	[Stock_Applied] [bit] NOT NULL,
	[Stock_Applied_At] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Request_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Master_Produk]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Master_Produk](
	[ID_Sampel] [int] IDENTITY(1,1) NOT NULL,
	[Design] [varchar](50) NULL,
	[Rak_Hanger] [varchar](20) NULL,
	[Brand_Name_NOTE] [varchar](255) NULL,
	[Lemari] [varchar](20) NULL,
	[Stok_Sampel] [int] NOT NULL,
	[Tanggal_Produksi] [date] NULL,
	[Keterangan] [nvarchar](500) NULL,
	[Gambar] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Sampel] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notification_Headers]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notification_Headers](
	[ID_Notification] [int] IDENTITY(1,1) NOT NULL,
	[Notification_Type] [nvarchar](30) NOT NULL,
	[Request_ID] [nvarchar](64) NULL,
	[Sender_Departemen] [nvarchar](100) NOT NULL,
	[Status] [nvarchar](50) NOT NULL,
	[Message] [nvarchar](max) NOT NULL,
	[Is_Read] [bit] NOT NULL,
	[Created_At] [datetime2](7) NOT NULL,
	[Updated_At] [datetime2](7) NOT NULL,
	[Recipient_User_Key] [nvarchar](120) NULL,
	[Recipient_Dept] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Notification] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notification_Items]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notification_Items](
	[ID_Item] [int] IDENTITY(1,1) NOT NULL,
	[ID_Notification] [int] NOT NULL,
	[Loan_ID] [int] NULL,
	[Sample_ID] [int] NULL,
	[Created_At] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Item] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Parameter_Fisik]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Parameter_Fisik](
	[ID_Fisik] [int] IDENTITY(1,1) NOT NULL,
	[ID_Sampel] [int] NULL,
	[Width_Cm] [varchar](50) NULL,
	[Lebar_Act] [decimal](10, 2) NULL,
	[Berat_Bulatan] [decimal](10, 2) NULL,
	[Gr_L_Yd] [decimal](10, 2) NULL,
	[Gr_Sqm] [decimal](10, 2) NULL,
	[Gr_L_Mtr] [decimal](10, 2) NULL,
	[Gr_SqYd] [decimal](10, 2) NULL,
	[Oz_LYd] [decimal](10, 2) NULL,
	[Oz_SqYd] [decimal](10, 2) NULL,
	[LYd_58_inch] [decimal](10, 2) NULL,
	[Corak_6Angka] [varchar](50) NULL,
	[Warna] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Fisik] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Push_Subscriptions]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Push_Subscriptions](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[Endpoint] [nvarchar](max) NULL,
	[P256DH] [nvarchar](max) NULL,
	[Auth] [nvarchar](max) NULL,
	[User_Departemen] [nvarchar](50) NULL,
	[Created_At] [datetime] NULL,
	[TargetApp] [varchar](100) NULL,
	[User_Key] [nvarchar](120) NULL,
	[Dept] [nvarchar](100) NULL,
	[Is_Active] [bit] NOT NULL,
	[Last_Seen_At] [datetime2](7) NULL,
	[Updated_At] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Sample_Loan]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sample_Loan](
	[ID_Loan] [int] IDENTITY(1,1) NOT NULL,
	[ID_Sampel] [int] NOT NULL,
	[Customer_Name] [nvarchar](255) NOT NULL,
	[Loan_Date] [datetime] NULL,
	[Return_Date] [datetime] NULL,
	[Status] [nvarchar](50) NULL,
	[Notes] [nvarchar](max) NULL,
	[Created_At] [datetime] NULL,
	[Departemen] [nvarchar](255) NULL,
	[Request_Group_ID] [nvarchar](64) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Loan] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Sample_Return_Notifications]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sample_Return_Notifications](
	[ID_Notification] [int] IDENTITY(1,1) NOT NULL,
	[Sample_Ids] [nvarchar](max) NOT NULL,
	[Loan_Ids] [nvarchar](max) NOT NULL,
	[Count_Items] [int] NOT NULL,
	[Created_At] [datetime2](7) NOT NULL,
	[Sender_Departemen] [nvarchar](255) NOT NULL,
	[Pickup_Status] [nvarchar](50) NOT NULL,
	[Pickup_Confirmed_At] [datetime2](7) NULL,
	[Is_Read] [bit] NOT NULL,
	[Requester_User_Key] [nvarchar](120) NULL,
	[Requester_Dept] [nvarchar](255) NULL,
	[Recipient_Mode] [nvarchar](30) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Notification] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Sample_Stock_Mutations]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Sample_Stock_Mutations](
	[ID_Mutation] [int] IDENTITY(1,1) NOT NULL,
	[Event_Key] [nvarchar](150) NOT NULL,
	[Event_Type] [nvarchar](50) NOT NULL,
	[Request_ID] [nvarchar](64) NULL,
	[Return_Notification_ID] [int] NULL,
	[ID_Sampel] [int] NOT NULL,
	[Qty_Change] [int] NOT NULL,
	[Notes] [nvarchar](255) NULL,
	[Created_At] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Mutation] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Spesifikasi]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Spesifikasi](
	[ID_Benang] [int] IDENTITY(1,1) NOT NULL,
	[ID_Sampel] [int] NULL,
	[Benang_Lusi] [varchar](100) NULL,
	[Benang_Pakan] [varchar](100) NULL,
	[Poly] [decimal](5, 2) NULL,
	[CD] [decimal](5, 2) NULL,
	[Ray] [decimal](5, 2) NULL,
	[Nyl] [decimal](5, 2) NULL,
	[PU] [decimal](5, 2) NULL,
	[Ros] [decimal](5, 2) NULL,
	[Tac] [decimal](5, 2) NULL,
	[Dope] [decimal](5, 2) NULL,
	[RW] [varchar](100) NULL,
	[RF] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[ID_Benang] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[users]    Script Date: 6/30/2026 11:39:07 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[users](
	[user_id] [int] IDENTITY(1,1) NOT NULL,
	[user_dept] [nvarchar](100) NOT NULL,
	[roles] [nvarchar](20) NOT NULL,
	[password_hash] [nvarchar](max) NOT NULL,
	[login_sessions] [nvarchar](max) NULL,
	[is_active] [bit] NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[user_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[user_dept] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[Loan_Request_Items] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ('Baru') FOR [Status_Request]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ('ui_crud_generic') FOR [Requested_By_App]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ((0)) FOR [Is_Read]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ('Dipinjam') FOR [Requested_Status]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ('Sedang') FOR [Urgency]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ('RND_ALL') FOR [Recipient_Mode]
GO
ALTER TABLE [dbo].[Loan_Request_Notifications] ADD  DEFAULT ((0)) FOR [Stock_Applied]
GO
ALTER TABLE [dbo].[Master_Produk] ADD  CONSTRAINT [DF_Master_Produk_Stok_Sampel]  DEFAULT ((0)) FOR [Stok_Sampel]
GO
ALTER TABLE [dbo].[Notification_Headers] ADD  DEFAULT ((0)) FOR [Is_Read]
GO
ALTER TABLE [dbo].[Notification_Headers] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Notification_Headers] ADD  DEFAULT (getdate()) FOR [Updated_At]
GO
ALTER TABLE [dbo].[Notification_Items] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Push_Subscriptions] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Push_Subscriptions] ADD  DEFAULT ((1)) FOR [Is_Active]
GO
ALTER TABLE [dbo].[Push_Subscriptions] ADD  DEFAULT (getdate()) FOR [Updated_At]
GO
ALTER TABLE [dbo].[Sample_Loan] ADD  DEFAULT (getdate()) FOR [Loan_Date]
GO
ALTER TABLE [dbo].[Sample_Loan] ADD  DEFAULT ('Dipinjam') FOR [Status]
GO
ALTER TABLE [dbo].[Sample_Loan] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Sample_Return_Notifications] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[Sample_Return_Notifications] ADD  DEFAULT ('Unknown') FOR [Sender_Departemen]
GO
ALTER TABLE [dbo].[Sample_Return_Notifications] ADD  DEFAULT ('Baru') FOR [Pickup_Status]
GO
ALTER TABLE [dbo].[Sample_Return_Notifications] ADD  DEFAULT ((0)) FOR [Is_Read]
GO
ALTER TABLE [dbo].[Sample_Return_Notifications] ADD  DEFAULT ('RND_ALL') FOR [Recipient_Mode]
GO
ALTER TABLE [dbo].[Sample_Stock_Mutations] ADD  DEFAULT (getdate()) FOR [Created_At]
GO
ALTER TABLE [dbo].[users] ADD  DEFAULT (NULL) FOR [login_sessions]
GO
ALTER TABLE [dbo].[users] ADD  CONSTRAINT [DF_users_is_active]  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[users] ADD  CONSTRAINT [DF_users_created_at]  DEFAULT (sysdatetime()) FOR [created_at]
GO
ALTER TABLE [dbo].[Konstruksi_Tenun]  WITH NOCHECK ADD FOREIGN KEY([ID_Sampel])
REFERENCES [dbo].[Master_Produk] ([ID_Sampel])
GO
ALTER TABLE [dbo].[Loan_Request_Items]  WITH NOCHECK ADD FOREIGN KEY([Request_ID])
REFERENCES [dbo].[Loan_Request_Notifications] ([Request_ID])
GO
ALTER TABLE [dbo].[Notification_Items]  WITH NOCHECK ADD FOREIGN KEY([ID_Notification])
REFERENCES [dbo].[Notification_Headers] ([ID_Notification])
GO
ALTER TABLE [dbo].[Parameter_Fisik]  WITH NOCHECK ADD FOREIGN KEY([ID_Sampel])
REFERENCES [dbo].[Master_Produk] ([ID_Sampel])
GO
ALTER TABLE [dbo].[Sample_Loan]  WITH NOCHECK ADD FOREIGN KEY([ID_Sampel])
REFERENCES [dbo].[Master_Produk] ([ID_Sampel])
GO
ALTER TABLE [dbo].[Spesifikasi]  WITH NOCHECK ADD FOREIGN KEY([ID_Sampel])
REFERENCES [dbo].[Master_Produk] ([ID_Sampel])
GO
