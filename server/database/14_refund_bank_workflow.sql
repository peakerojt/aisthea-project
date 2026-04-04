/* =============================================================
   Patch refund bank workflow schema
   - ReturnRequests bank-info tracking fields
   - Coupons hidden/source visibility fields
   - Customer bank/refund support tables
   ============================================================= */

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.ReturnRequests', 'BankInfoRequestedAt') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests
        ADD BankInfoRequestedAt DATETIME2 NULL;
    PRINT 'OK: Added ReturnRequests.BankInfoRequestedAt';
END
ELSE
BEGIN
    PRINT 'SKIP: ReturnRequests.BankInfoRequestedAt already exists or table missing';
END
GO

IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.ReturnRequests', 'BankInfoSubmittedAt') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests
        ADD BankInfoSubmittedAt DATETIME2 NULL;
    PRINT 'OK: Added ReturnRequests.BankInfoSubmittedAt';
END
ELSE
BEGIN
    PRINT 'SKIP: ReturnRequests.BankInfoSubmittedAt already exists or table missing';
END
GO

IF OBJECT_ID('dbo.ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.ReturnRequests', 'RefundCompletedAt') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequests
        ADD RefundCompletedAt DATETIME2 NULL;
    PRINT 'OK: Added ReturnRequests.RefundCompletedAt';
END
ELSE
BEGIN
    PRINT 'SKIP: ReturnRequests.RefundCompletedAt already exists or table missing';
END
GO

IF OBJECT_ID('dbo.Coupons', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.Coupons', 'IsHidden') IS NULL
BEGIN
    ALTER TABLE dbo.Coupons
        ADD IsHidden BIT NOT NULL
            CONSTRAINT DF_Coupons_IsHidden DEFAULT 0;
    PRINT 'OK: Added Coupons.IsHidden';
END
ELSE
BEGIN
    PRINT 'SKIP: Coupons.IsHidden already exists or table missing';
END
GO

IF OBJECT_ID('dbo.Coupons', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.Coupons', 'Source') IS NULL
BEGIN
    ALTER TABLE dbo.Coupons
        ADD Source NVARCHAR(30) NULL;
    PRINT 'OK: Added Coupons.Source';
END
ELSE
BEGIN
    PRINT 'SKIP: Coupons.Source already exists or table missing';
END
GO

IF OBJECT_ID('dbo.Coupons', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.Coupons', 'VisibleInPublicList') IS NULL
BEGIN
    ALTER TABLE dbo.Coupons
        ADD VisibleInPublicList BIT NOT NULL
            CONSTRAINT DF_Coupons_VisibleInPublicList DEFAULT 1;
    PRINT 'OK: Added Coupons.VisibleInPublicList';
END
ELSE
BEGIN
    PRINT 'SKIP: Coupons.VisibleInPublicList already exists or table missing';
END
GO

IF OBJECT_ID('dbo.Coupons', 'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.indexes
       WHERE object_id = OBJECT_ID('dbo.Coupons')
         AND name = 'IX_Coupons_Source'
   )
BEGIN
    CREATE NONCLUSTERED INDEX IX_Coupons_Source
        ON dbo.Coupons(Source);
    PRINT 'OK: Added IX_Coupons_Source';
END
ELSE
BEGIN
    PRINT 'SKIP: IX_Coupons_Source already exists or Coupons table missing';
END
GO

IF OBJECT_ID('dbo.CustomerBankAccounts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerBankAccounts (
        BankAccountId   INT            IDENTITY(1,1) PRIMARY KEY,
        UserId          INT            NOT NULL,
        BankName        NVARCHAR(120)  NOT NULL,
        BankCode        NVARCHAR(50)   NULL,
        AccountNumber   NVARCHAR(50)   NOT NULL,
        AccountHolder   NVARCHAR(120)  NOT NULL,
        QrImageUrl      NVARCHAR(1000) NULL,
        InputMethod     NVARCHAR(20)   NOT NULL,
        IsDefault       BIT            NOT NULL CONSTRAINT DF_CustomerBankAccounts_IsDefault DEFAULT 1,
        IsActive        BIT            NOT NULL CONSTRAINT DF_CustomerBankAccounts_IsActive DEFAULT 1,
        CreatedAt       DATETIME2      NOT NULL CONSTRAINT DF_CustomerBankAccounts_CreatedAt DEFAULT GETDATE(),
        UpdatedAt       DATETIME2      NOT NULL CONSTRAINT DF_CustomerBankAccounts_UpdatedAt DEFAULT GETDATE(),
        CONSTRAINT FK_CustomerBankAccounts_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX IX_CustomerBankAccounts_UserId
        ON dbo.CustomerBankAccounts(UserId);
    CREATE NONCLUSTERED INDEX IX_CustomerBankAccounts_UserId_IsDefault
        ON dbo.CustomerBankAccounts(UserId, IsDefault);
    CREATE NONCLUSTERED INDEX IX_CustomerBankAccounts_UserId_IsDefault_IsActive
        ON dbo.CustomerBankAccounts(UserId, IsDefault, IsActive);

    PRINT 'OK: Created CustomerBankAccounts';
END
ELSE
BEGIN
    PRINT 'SKIP: CustomerBankAccounts already exists';
END
GO

IF OBJECT_ID('dbo.RefundBankSnapshots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefundBankSnapshots (
        RefundBankSnapshotId INT            IDENTITY(1,1) PRIMARY KEY,
        ReturnRequestId      INT            NOT NULL,
        BankAccountId        INT            NULL,
        BankName             NVARCHAR(120)  NOT NULL,
        BankCode             NVARCHAR(50)   NULL,
        AccountNumberMasked  NVARCHAR(50)   NOT NULL,
        AccountHolder        NVARCHAR(120)  NOT NULL,
        QrImageUrl           NVARCHAR(1000) NULL,
        InputMethod          NVARCHAR(20)   NOT NULL,
        CapturedAt           DATETIME2      NOT NULL CONSTRAINT DF_RefundBankSnapshots_CapturedAt DEFAULT GETDATE(),
        CONSTRAINT FK_RefundBankSnapshots_ReturnRequests
            FOREIGN KEY (ReturnRequestId) REFERENCES dbo.ReturnRequests(ReturnRequestId) ON DELETE CASCADE,
        CONSTRAINT FK_RefundBankSnapshots_CustomerBankAccounts
            FOREIGN KEY (BankAccountId) REFERENCES dbo.CustomerBankAccounts(BankAccountId) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_RefundBankSnapshots_ReturnRequestId
        ON dbo.RefundBankSnapshots(ReturnRequestId);
    CREATE NONCLUSTERED INDEX IX_RefundBankSnapshots_ReturnRequestId_CapturedAt
        ON dbo.RefundBankSnapshots(ReturnRequestId, CapturedAt);

    PRINT 'OK: Created RefundBankSnapshots';
END
ELSE
BEGIN
    PRINT 'SKIP: RefundBankSnapshots already exists';
END
GO

IF OBJECT_ID('dbo.RefundPayoutProofs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefundPayoutProofs (
        RefundPayoutProofId INT            IDENTITY(1,1) PRIMARY KEY,
        ReturnRequestId     INT            NOT NULL,
        RefundTransactionId INT            NULL,
        UploadedBy          INT            NOT NULL,
        FileUrl             NVARCHAR(1000) NOT NULL,
        FileName            NVARCHAR(255)  NULL,
        MimeType            NVARCHAR(100)  NULL,
        Note                NVARCHAR(1000) NULL,
        CreatedAt           DATETIME2      NOT NULL CONSTRAINT DF_RefundPayoutProofs_CreatedAt DEFAULT GETDATE(),
        CONSTRAINT FK_RefundPayoutProofs_ReturnRequests
            FOREIGN KEY (ReturnRequestId) REFERENCES dbo.ReturnRequests(ReturnRequestId),
        CONSTRAINT FK_RefundPayoutProofs_RefundTransactions
            FOREIGN KEY (RefundTransactionId) REFERENCES dbo.RefundTransactions(RefundTransactionId) ON DELETE SET NULL,
        CONSTRAINT FK_RefundPayoutProofs_Users
            FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserId)
    );

    CREATE NONCLUSTERED INDEX IX_RefundPayoutProofs_ReturnRequestId
        ON dbo.RefundPayoutProofs(ReturnRequestId);
    CREATE NONCLUSTERED INDEX IX_RefundPayoutProofs_ReturnRequestId_CreatedAt
        ON dbo.RefundPayoutProofs(ReturnRequestId, CreatedAt);

    PRINT 'OK: Created RefundPayoutProofs';
END
ELSE
BEGIN
    PRINT 'SKIP: RefundPayoutProofs already exists';
END
GO

IF OBJECT_ID('dbo.RefundBenefits', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefundBenefits (
        RefundBenefitId   INT            IDENTITY(1,1) PRIMARY KEY,
        ReturnRequestId   INT            NOT NULL,
        OrderId           INT            NOT NULL,
        UserId            INT            NOT NULL,
        BenefitType       NVARCHAR(20)   NOT NULL,
        PercentValue      DECIMAL(5,2)   NULL,
        MaxDiscountAmount DECIMAL(18,2)  NULL,
        MinOrderValue     DECIMAL(18,2)  NOT NULL CONSTRAINT DF_RefundBenefits_MinOrderValue DEFAULT 0,
        CouponId          INT            NULL,
        Status            NVARCHAR(20)   NOT NULL,
        ValidFrom         DATETIME2      NOT NULL,
        ValidUntil        DATETIME2      NOT NULL,
        IssuedAt          DATETIME2      NULL,
        UsedAt            DATETIME2      NULL,
        RuleVersion       NVARCHAR(30)   NOT NULL,
        Source            NVARCHAR(30)   NOT NULL CONSTRAINT DF_RefundBenefits_Source DEFAULT 'REFUND',
        MetadataJson      NVARCHAR(MAX)  NULL,
        CONSTRAINT UQ_RefundBenefits_ReturnRequestId UNIQUE (ReturnRequestId),
        CONSTRAINT FK_RefundBenefits_ReturnRequests
            FOREIGN KEY (ReturnRequestId) REFERENCES dbo.ReturnRequests(ReturnRequestId),
        CONSTRAINT FK_RefundBenefits_Orders
            FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId),
        CONSTRAINT FK_RefundBenefits_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_RefundBenefits_Coupons
            FOREIGN KEY (CouponId) REFERENCES dbo.Coupons(CouponId) ON DELETE SET NULL
    );

    CREATE NONCLUSTERED INDEX IX_RefundBenefits_UserId_Status_ValidUntil
        ON dbo.RefundBenefits(UserId, Status, ValidUntil);

    PRINT 'OK: Created RefundBenefits';
END
ELSE
BEGIN
    PRINT 'SKIP: RefundBenefits already exists';
END
GO
