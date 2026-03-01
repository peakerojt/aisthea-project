-- ═══════════════════════════════════════════════════════
-- AISTHEA Coupon & Discount System — Schema Migration
-- Run this script in SQL Server Management Studio (SSMS) 
-- targeting the AISTHEA database.
-- ═══════════════════════════════════════════════════════

USE AISTHEA;
GO

-- ── 1. Create Coupons table ──────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Coupons' AND xtype='U')
BEGIN
  CREATE TABLE Coupons (
    CouponId          INT           IDENTITY(1,1) PRIMARY KEY,
    Code              NVARCHAR(50)  NOT NULL UNIQUE,
    Type              NVARCHAR(20)  NOT NULL,     -- 'FIXED_AMOUNT' or 'PERCENTAGE'
    Value             DECIMAL(18,2) NOT NULL,
    MaxDiscountAmount DECIMAL(18,2) NULL,         -- Cap for PERCENTAGE type
    MinOrderValue     DECIMAL(18,2) NOT NULL CONSTRAINT DF_Coupons_MinOrderValue DEFAULT 0,
    StartDate         DATETIME2     NOT NULL,
    EndDate           DATETIME2     NOT NULL,
    UsageLimit        INT           NOT NULL,
    UsedCount         INT           NOT NULL CONSTRAINT DF_Coupons_UsedCount DEFAULT 0,
    UsagePerUser      INT           NOT NULL CONSTRAINT DF_Coupons_UsagePerUser DEFAULT 1,
    IsActive          BIT           NOT NULL CONSTRAINT DF_Coupons_IsActive DEFAULT 1,
    CreatedAt         DATETIME2     NOT NULL CONSTRAINT DF_Coupons_CreatedAt DEFAULT GETDATE(),
    UpdatedAt         DATETIME2     NOT NULL CONSTRAINT DF_Coupons_UpdatedAt DEFAULT GETDATE()
  );
  PRINT '✅ Created Coupons table';
END
ELSE
BEGIN
  PRINT 'ℹ️ Coupons table already exists — skipping';
END
GO

-- ── 2. Add DiscountAmount to Orders ─────────────────────
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'DiscountAmount'
)
BEGIN
  ALTER TABLE Orders ADD DiscountAmount DECIMAL(18,2) NULL CONSTRAINT DF_Orders_DiscountAmount DEFAULT 0;
  PRINT '✅ Added DiscountAmount to Orders';
END
ELSE
BEGIN
  PRINT 'ℹ️ DiscountAmount already exists in Orders — skipping';
END
GO

-- ── 3. Add CouponId to Orders ───────────────────────────
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'CouponId'
)
BEGIN
  ALTER TABLE Orders ADD CouponId INT NULL;
  PRINT '✅ Added CouponId to Orders';
END
ELSE
BEGIN
  PRINT 'ℹ️ CouponId already exists in Orders — skipping';
END
GO

-- ── 4. Add FK: Orders.CouponId → Coupons.CouponId ───────
IF NOT EXISTS (
  SELECT * FROM sys.foreign_keys WHERE name = 'FK_Orders_Coupons'
)
BEGIN
  ALTER TABLE Orders ADD CONSTRAINT FK_Orders_Coupons
    FOREIGN KEY (CouponId) REFERENCES Coupons(CouponId);
  PRINT '✅ Added FK_Orders_Coupons';
END
ELSE
BEGIN
  PRINT 'ℹ️ FK_Orders_Coupons already exists — skipping';
END
GO

-- ── 5. Indexes ───────────────────────────────────────────
IF NOT EXISTS (
  SELECT * FROM sys.indexes WHERE name = 'IX_Coupons_Code' AND object_id = OBJECT_ID('Coupons')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Coupons_Code ON Coupons (Code);
  PRINT '✅ Created IX_Coupons_Code';
END
GO

IF NOT EXISTS (
  SELECT * FROM sys.indexes WHERE name = 'IX_Coupons_IsActive' AND object_id = OBJECT_ID('Coupons')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Coupons_IsActive ON Coupons (IsActive);
  PRINT '✅ Created IX_Coupons_IsActive';
END
GO

PRINT '🎉 Coupon schema migration complete!';
GO
