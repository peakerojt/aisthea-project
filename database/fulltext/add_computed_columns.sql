/* =============================================================
   ADD COMPUTED COLUMNS (MANUAL FIX)
   Run this separately if optimized_search.sql fails
   ============================================================= */

USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Check and add NameNormalized
IF COL_LENGTH('Products', 'NameNormalized') IS NULL
BEGIN
    EXEC sp_executesql N'ALTER TABLE Products ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED';
    PRINT 'Added computed column Products.NameNormalized';
END
ELSE
BEGIN
    PRINT 'NameNormalized column already exists';
END

-- Check and add DescriptionNormalized  
IF COL_LENGTH('Products', 'DescriptionNormalized') IS NULL
BEGIN
    EXEC sp_executesql N'ALTER TABLE Products ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED';
    PRINT 'Added computed column Products.DescriptionNormalized';
END
ELSE
BEGIN
    PRINT 'DescriptionNormalized column already exists';
END
GO

-- Create indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_NameNormalized ON Products(NameNormalized)
    WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Created index IX_Products_NameNormalized';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_DescriptionNormalized ON Products(DescriptionNormalized)
    WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Created index IX_Products_DescriptionNormalized';
END
GO

PRINT 'Computed columns and indexes setup complete!';
GO
