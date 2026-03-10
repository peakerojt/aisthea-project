-- ============================================================
-- fix_before_db_push.sql
-- Run this BEFORE `prisma db push` to drop the computed columns
-- and their indexes that conflict with Prisma's schema sync.
-- After db push, run fix_after_db_push.sql to restore them.
-- ============================================================

USE AISTHEA;  -- adjust database name if needed

-- 1. Drop indexes that depend on computed columns
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    DROP INDEX IX_Products_DescriptionNormalized ON dbo.Products;
    PRINT 'Dropped index IX_Products_DescriptionNormalized';
END

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    DROP INDEX IX_Products_NameNormalized ON dbo.Products;
    PRINT 'Dropped index IX_Products_NameNormalized';
END

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Carts_UserId' AND object_id = OBJECT_ID('Carts'))
BEGIN
    ALTER TABLE dbo.Carts DROP CONSTRAINT UQ_Carts_UserId;
    PRINT 'Dropped unique constraint UQ_Carts_UserId';
END

-- 2. Drop computed columns
IF COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Products DROP COLUMN DescriptionNormalized;
    PRINT 'Dropped computed column DescriptionNormalized';
END

IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NOT NULL
BEGIN
    ALTER TABLE dbo.Products DROP COLUMN NameNormalized;
    PRINT 'Dropped computed column NameNormalized';
END
