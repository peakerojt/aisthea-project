-- ============================================================
-- fix_after_db_push.sql
-- Run this AFTER `prisma db push` succeeds to restore the
-- computed columns and their full-text-style search indexes.
-- ============================================================

USE AISTHEA;  -- adjust database name if needed

-- 1. Recreate the computed columns (requires fn_RemoveDiacritics to exist)
IF COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products
        ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED;
    PRINT 'Recreated computed column DescriptionNormalized';
END

IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products
        ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED;
    PRINT 'Recreated computed column NameNormalized';
END

-- 2. Recreate the indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_DescriptionNormalized
        ON dbo.Products (DescriptionNormalized)
        WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Recreated index IX_Products_DescriptionNormalized';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_NameNormalized
        ON dbo.Products (NameNormalized)
        WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Recreated index IX_Products_NameNormalized';
END
