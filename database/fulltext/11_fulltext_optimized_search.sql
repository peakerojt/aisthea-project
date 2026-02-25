/* =============================================================
   COMPLETE SEARCH OPTIMIZATION SETUP
   Proper SET options throughout
   ============================================================= */

USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ⚠️  SAFE DROP+RECREATE: Only drop fn_RemoveDiacritics if computed columns do NOT exist yet.
--     If 01_schema.sql ran first, computed columns exist and we cannot drop the function.
--     In that case, the function is already correct and we skip the recreate.
IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NULL
    AND COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NULL
BEGIN
    -- Safe to drop and recreate the function (no computed columns depend on it yet)
    IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NOT NULL
        DROP FUNCTION dbo.fn_RemoveDiacritics;

    PRINT 'Dropped fn_RemoveDiacritics (safe - no computed columns exist yet)';
END
ELSE
BEGIN
    PRINT 'Skipping DROP fn_RemoveDiacritics — computed columns already exist (01_schema.sql ran first). Function is already up-to-date.';
END
GO

-- Create function only if it does not exist (either fresh install or was just dropped above)
IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NULL
BEGIN
    EXEC sp_executesql N'
    CREATE FUNCTION dbo.fn_RemoveDiacritics(@input NVARCHAR(MAX))
    RETURNS NVARCHAR(850)
    WITH SCHEMABINDING
    AS
    BEGIN
        DECLARE @result NVARCHAR(850) = CAST(@input AS NVARCHAR(850));
        SET @result = REPLACE(@result, N''à'', ''a''); SET @result = REPLACE(@result, N''á'', ''a'');
        SET @result = REPLACE(@result, N''ả'', ''a''); SET @result = REPLACE(@result, N''ã'', ''a'');
        SET @result = REPLACE(@result, N''ạ'', ''a''); SET @result = REPLACE(@result, N''â'', ''a'');
        SET @result = REPLACE(@result, N''ầ'', ''a''); SET @result = REPLACE(@result, N''ấ'', ''a'');
        SET @result = REPLACE(@result, N''ẩ'', ''a''); SET @result = REPLACE(@result, N''ẫ'', ''a'');
        SET @result = REPLACE(@result, N''ậ'', ''a''); SET @result = REPLACE(@result, N''ă'', ''a'');
        SET @result = REPLACE(@result, N''ằ'', ''a''); SET @result = REPLACE(@result, N''ắ'', ''a'');
        SET @result = REPLACE(@result, N''ẳ'', ''a''); SET @result = REPLACE(@result, N''ẵ'', ''a'');
        SET @result = REPLACE(@result, N''ặ'', ''a'');
        SET @result = REPLACE(@result, N''è'', ''e''); SET @result = REPLACE(@result, N''é'', ''e'');
        SET @result = REPLACE(@result, N''ẻ'', ''e''); SET @result = REPLACE(@result, N''ẽ'', ''e'');
        SET @result = REPLACE(@result, N''ẹ'', ''e''); SET @result = REPLACE(@result, N''ê'', ''e'');
        SET @result = REPLACE(@result, N''ề'', ''e''); SET @result = REPLACE(@result, N''ế'', ''e'');
        SET @result = REPLACE(@result, N''ể'', ''e''); SET @result = REPLACE(@result, N''ễ'', ''e'');
        SET @result = REPLACE(@result, N''ệ'', ''e'');
        SET @result = REPLACE(@result, N''ì'', ''i''); SET @result = REPLACE(@result, N''í'', ''i'');
        SET @result = REPLACE(@result, N''ỉ'', ''i''); SET @result = REPLACE(@result, N''ĩ'', ''i'');
        SET @result = REPLACE(@result, N''ị'', ''i'');
        SET @result = REPLACE(@result, N''ò'', ''o''); SET @result = REPLACE(@result, N''ó'', ''o'');
        SET @result = REPLACE(@result, N''ỏ'', ''o''); SET @result = REPLACE(@result, N''õ'', ''o'');
        SET @result = REPLACE(@result, N''ọ'', ''o''); SET @result = REPLACE(@result, N''ô'', ''o'');
        SET @result = REPLACE(@result, N''ồ'', ''o''); SET @result = REPLACE(@result, N''ố'', ''o'');
        SET @result = REPLACE(@result, N''ổ'', ''o''); SET @result = REPLACE(@result, N''ỗ'', ''o'');
        SET @result = REPLACE(@result, N''ộ'', ''o''); SET @result = REPLACE(@result, N''ơ'', ''o'');
        SET @result = REPLACE(@result, N''ờ'', ''o''); SET @result = REPLACE(@result, N''ớ'', ''o'');
        SET @result = REPLACE(@result, N''ở'', ''o''); SET @result = REPLACE(@result, N''ỡ'', ''o'');
        SET @result = REPLACE(@result, N''ợ'', ''o'');
        SET @result = REPLACE(@result, N''ù'', ''u''); SET @result = REPLACE(@result, N''ú'', ''u'');
        SET @result = REPLACE(@result, N''ủ'', ''u''); SET @result = REPLACE(@result, N''ũ'', ''u'');
        SET @result = REPLACE(@result, N''ụ'', ''u''); SET @result = REPLACE(@result, N''ư'', ''u'');
        SET @result = REPLACE(@result, N''ừ'', ''u''); SET @result = REPLACE(@result, N''ứ'',  ''u'');
        SET @result = REPLACE(@result, N''ử'', ''u''); SET @result = REPLACE(@result, N''ữ'', ''u'');
        SET @result = REPLACE(@result, N''ự'', ''u'');
        SET @result = REPLACE(@result, N''ỳ'', ''y''); SET @result = REPLACE(@result, N''ý'', ''y'');
        SET @result = REPLACE(@result, N''ỷ'', ''y''); SET @result = REPLACE(@result, N''ỹ'', ''y'');
        SET @result = REPLACE(@result, N''ỵ'', ''y'');
        SET @result = REPLACE(@result, N''đ'', ''d'');
        SET @result = REPLACE(@result, N''À'', ''A''); SET @result = REPLACE(@result, N''Á'', ''A'');
        SET @result = REPLACE(@result, N''Ả'', ''A''); SET @result = REPLACE(@result, N''Ã'', ''A'');
        SET @result = REPLACE(@result, N''Ạ'', ''A''); SET @result = REPLACE(@result, N''Â'', ''A'');
        SET @result = REPLACE(@result, N''Ầ'', ''A''); SET @result = REPLACE(@result, N''Ấ'', ''A'');
        SET @result = REPLACE(@result, N''Ẩ'', ''A''); SET @result = REPLACE(@result, N''Ẫ'', ''A'');
        SET @result = REPLACE(@result, N''Ậ'', ''A''); SET @result = REPLACE(@result, N''Ă'', ''A'');
        SET @result = REPLACE(@result, N''Ằ'', ''A''); SET @result = REPLACE(@result, N''Ắ'', ''A'');
        SET @result = REPLACE(@result, N''Ẳ'', ''A''); SET @result = REPLACE(@result, N''Ẵ'', ''A'');
        SET @result = REPLACE(@result, N''Ặ'', ''A'');
        SET @result = REPLACE(@result, N''È'', ''E''); SET @result = REPLACE(@result, N''É'', ''E'');
        SET @result = REPLACE(@result, N''Ẻ'', ''E''); SET @result = REPLACE(@result, N''Ẽ'', ''E'');
        SET @result = REPLACE(@result, N''Ẹ'', ''E''); SET @result = REPLACE(@result, N''Ê'', ''E'');
        SET @result = REPLACE(@result, N''Ề'', ''E''); SET @result = REPLACE(@result, N''Ế'', ''E'');
        SET @result = REPLACE(@result, N''Ể'', ''E''); SET @result = REPLACE(@result, N''Ễ'', ''E'');
        SET @result = REPLACE(@result, N''Ệ'', ''E'');
        SET @result = REPLACE(@result, N''Ì'', ''I''); SET @result = REPLACE(@result, N''Í'', ''I'');
        SET @result = REPLACE(@result, N''Ỉ'', ''I''); SET @result = REPLACE(@result, N''Ĩ'', ''I'');
        SET @result = REPLACE(@result, N''Ị'', ''I'');
        SET @result = REPLACE(@result, N''Ò'', ''O''); SET @result = REPLACE(@result, N''Ó'', ''O'');
        SET @result = REPLACE(@result, N''Ỏ'', ''O''); SET @result = REPLACE(@result, N''Õ'', ''O'');
        SET @result = REPLACE(@result, N''Ọ'', ''O''); SET @result = REPLACE(@result, N''Ô'', ''O'');
        SET @result = REPLACE(@result, N''Ồ'', ''O''); SET @result = REPLACE(@result, N''Ố'', ''O'');
        SET @result = REPLACE(@result, N''Ổ'', ''O''); SET @result = REPLACE(@result, N''Ỗ'', ''O'');
        SET @result = REPLACE(@result, N''Ộ'', ''O''); SET @result = REPLACE(@result, N''Ơ'', ''O'');
        SET @result = REPLACE(@result, N''Ờ'', ''O''); SET @result = REPLACE(@result, N''Ớ'', ''O'');
        SET @result = REPLACE(@result, N''Ở'', ''O''); SET @result = REPLACE(@result, N''Ỡ'', ''O'');
        SET @result = REPLACE(@result, N''Ợ'', ''O'');
        SET @result = REPLACE(@result, N''Ù'', ''U''); SET @result = REPLACE(@result, N''Ú'', ''U'');
        SET @result = REPLACE(@result, N''Ủ'', ''U''); SET @result = REPLACE(@result, N''Ũ'', ''U'');
        SET @result = REPLACE(@result, N''Ụ'', ''U''); SET @result = REPLACE(@result, N''Ư'', ''U'');
        SET @result = REPLACE(@result, N''Ừ'', ''U''); SET @result = REPLACE(@result, N''Ứ'', ''U'');
        SET @result = REPLACE(@result, N''Ử'', ''U''); SET @result = REPLACE(@result, N''Ữ'', ''U'');
        SET @result = REPLACE(@result, N''Ự'', ''U'');
        SET @result = REPLACE(@result, N''Ỳ'', ''Y''); SET @result = REPLACE(@result, N''Ý'', ''Y'');
        SET @result = REPLACE(@result, N''Ỷ'', ''Y''); SET @result = REPLACE(@result, N''Ỹ'', ''Y'');
        SET @result = REPLACE(@result, N''Ỵ'', ''Y'');
        SET @result = REPLACE(@result, N''Đ'', ''D'');
        RETURN CAST(LOWER(@result) AS NVARCHAR(850));
    END';
    PRINT 'Created function fn_RemoveDiacritics';
END
ELSE
BEGIN
    PRINT 'fn_RemoveDiacritics already exists — skipping create.';
END
GO

-- Add computed columns if missing
IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED;
    PRINT 'Added computed column NameNormalized';
END
ELSE
BEGIN
    PRINT 'NameNormalized already exists';
END

IF COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED;
    PRINT 'Added computed column DescriptionNormalized';
END
ELSE
BEGIN
    PRINT 'DescriptionNormalized already exists';
END
GO

-- Create indexes if missing
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_NameNormalized ON dbo.Products(NameNormalized)
    WHERE IsDeleted = 0;
    PRINT 'Created index IX_Products_NameNormalized';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_DescriptionNormalized ON dbo.Products(DescriptionNormalized)
    WHERE IsDeleted = 0;
    PRINT 'Created index IX_Products_DescriptionNormalized';
END
GO

PRINT '';
PRINT 'Search optimization complete!';
GO
