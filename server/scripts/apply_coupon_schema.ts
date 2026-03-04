/**
 * apply_coupon_schema.ts
 * Run: npx ts-node scripts/apply_coupon_schema.ts
 * Applies the Coupons table and Order column changes to SQL Server.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Applying coupon schema changes...');

    // 1. Create Coupons table if it doesn't exist
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Coupons' AND xtype='U')
    BEGIN
      CREATE TABLE Coupons (
        CouponId          INT           IDENTITY(1,1) PRIMARY KEY,
        Code              NVARCHAR(50)  NOT NULL UNIQUE,
        Type              NVARCHAR(20)  NOT NULL,
        Value             DECIMAL(18,2) NOT NULL,
        MaxDiscountAmount DECIMAL(18,2) NULL,
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
      PRINT 'Created Coupons table';
    END
    ELSE
    BEGIN
      PRINT 'Coupons table already exists';
    END
  `);

    // 2. Add DiscountAmount column to Orders if not exists
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'DiscountAmount'
    )
    BEGIN
      ALTER TABLE Orders ADD DiscountAmount DECIMAL(18,2) NULL CONSTRAINT DF_Orders_DiscountAmount DEFAULT 0;
      PRINT 'Added DiscountAmount to Orders';
    END
    ELSE
    BEGIN
      PRINT 'DiscountAmount already exists in Orders';
    END
  `);

    // 3. Add CouponId column to Orders if not exists
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'CouponId'
    )
    BEGIN
      ALTER TABLE Orders ADD CouponId INT NULL;
      PRINT 'Added CouponId to Orders';
    END
    ELSE
    BEGIN
      PRINT 'CouponId already exists in Orders';
    END
  `);

    // 4. Add FK from Orders.CouponId -> Coupons.CouponId if not exists
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM sys.foreign_keys WHERE name = 'FK_Orders_Coupons'
    )
    BEGIN
      ALTER TABLE Orders ADD CONSTRAINT FK_Orders_Coupons
        FOREIGN KEY (CouponId) REFERENCES Coupons(CouponId);
      PRINT 'Added FK_Orders_Coupons';
    END
    ELSE
    BEGIN
      PRINT 'FK_Orders_Coupons already exists';
    END
  `);

    // 5. Create index on Coupons.Code if not exists
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes WHERE name = 'IX_Coupons_Code' AND object_id = OBJECT_ID('Coupons')
    )
    BEGIN
      CREATE NONCLUSTERED INDEX IX_Coupons_Code ON Coupons (Code);
      PRINT 'Created IX_Coupons_Code';
    END
  `);

    // 6. Create index on Coupons.IsActive if not exists
    await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes WHERE name = 'IX_Coupons_IsActive' AND object_id = OBJECT_ID('Coupons')
    )
    BEGIN
      CREATE NONCLUSTERED INDEX IX_Coupons_IsActive ON Coupons (IsActive);
      PRINT 'Created IX_Coupons_IsActive';
    END
  `);

    console.log('✅ Coupon schema changes applied successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error applying schema:', e.message ?? e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
