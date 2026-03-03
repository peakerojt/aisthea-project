/* =============================================================
   MIGRATION: Return & Refund Module
   Adds: OrderReturns table + Orders.UpdatedAt column
   Safe to re-run: uses IF NOT EXISTS guards
   Run in SSMS against AISTHEA database.
   ============================================================= */

USE AISTHEA;
GO

-- ─── 1. Add UpdatedAt column to Orders (if it does not already exist) ─────────
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Orders') AND name = N'UpdatedAt'
)
BEGIN
    ALTER TABLE dbo.Orders
        ADD UpdatedAt DATETIME2 NULL DEFAULT GETDATE();

    PRINT '✔ Orders.UpdatedAt column added.';
END
ELSE
BEGIN
    PRINT '– Orders.UpdatedAt already exists, skipping.';
END
GO

-- Set UpdatedAt = CreatedAt for existing rows (so 7-day window works correctly)
UPDATE dbo.Orders
SET UpdatedAt = CreatedAt
WHERE UpdatedAt IS NULL AND CreatedAt IS NOT NULL;
GO

-- ─── 2. Create OrderReturns table (if it does not already exist) ──────────────
IF NOT EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.OrderReturns') AND type = N'U'
)
BEGIN
    CREATE TABLE dbo.OrderReturns (
        ReturnId    INT              NOT NULL IDENTITY(1,1),
        OrderId     INT              NOT NULL,             -- FK → Orders (unique: 1 return per order)
        UserId      INT              NULL,                 -- FK → Users (nullable: guest orders)
        Reason      NVARCHAR(500)    NOT NULL,
        ProofImages NVARCHAR(MAX)    NOT NULL DEFAULT N'[]', -- JSON array of Cloudinary URLs
        [Status]    NVARCHAR(30)     NOT NULL DEFAULT N'PENDING_APPROVAL',
        AdminNote   NVARCHAR(500)    NULL,
        CreatedAt   DATETIME2        NOT NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME2        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_OrderReturns PRIMARY KEY (ReturnId),
        CONSTRAINT UQ_OrderReturns_OrderId UNIQUE (OrderId),
        CONSTRAINT FK_OrderReturns_Orders
            FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
            ON DELETE CASCADE,
        CONSTRAINT FK_OrderReturns_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId)
            ON DELETE SET NULL
    );

    -- Indexes
    CREATE INDEX IX_OrderReturns_OrderId ON dbo.OrderReturns (OrderId);
    CREATE INDEX IX_OrderReturns_Status  ON dbo.OrderReturns ([Status]);
    CREATE INDEX IX_OrderReturns_UserId  ON dbo.OrderReturns (UserId);

    PRINT '✔ OrderReturns table created.';
END
ELSE
BEGIN
    PRINT '– OrderReturns table already exists, skipping.';
END
GO

-- ─── 3. Create Refunds table — Financial Refund Ledger (if not already exists) ─
-- type:   FULL | PARTIAL
-- method: ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
-- status: PENDING | PROCESSING | SUCCESS | FAILED
IF NOT EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.Refunds') AND type = N'U'
)
BEGIN
    CREATE TABLE dbo.Refunds (
        RefundId             INT              NOT NULL IDENTITY(1,1),
        OrderId              INT              NOT NULL,           -- FK → Orders (CASCADE)
        PaymentId            INT              NULL,               -- FK → Payments (NO ACTION)
        Amount               DECIMAL(18,2)    NOT NULL,
        [Type]               NVARCHAR(10)     NOT NULL,           -- FULL | PARTIAL
        Method               NVARCHAR(25)     NOT NULL,           -- ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
        [Status]             NVARCHAR(15)     NOT NULL DEFAULT N'PENDING',
        GatewayTransactionId NVARCHAR(100)    NULL,
        Reason               NVARCHAR(500)    NOT NULL,
        GatewayError         NVARCHAR(500)    NULL,
        CreatedBy            INT              NULL,
        CreatedAt            DATETIME2        NOT NULL DEFAULT GETDATE(),
        UpdatedAt            DATETIME2        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_Refunds PRIMARY KEY (RefundId),
        CONSTRAINT FK_Refunds_Orders
            FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
            ON DELETE CASCADE
            ON UPDATE NO ACTION,
        CONSTRAINT FK_Refunds_Payments
            FOREIGN KEY (PaymentId) REFERENCES dbo.Payments (PaymentId)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
    );

    -- Indexes
    CREATE INDEX IX_Refunds_OrderId  ON dbo.Refunds (OrderId);
    CREATE INDEX IX_Refunds_Status   ON dbo.Refunds ([Status]);

    PRINT '✔ Refunds table created.';
END
ELSE
BEGIN
    PRINT '– Refunds table already exists, skipping.';
END
GO

PRINT '=============================================='
PRINT '  Return & Refund migration complete!'
PRINT '  (includes Refunds financial ledger table)'
PRINT '=============================================='
GO
