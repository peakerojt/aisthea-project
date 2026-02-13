/* =============================================================
   FULL-TEXT SEARCH SETUP
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Enable Full-Text Search on Products table for
                intelligent product search with ranking.
   ============================================================= */

USE AISTHEA;
GO

-- Step 1: Create Full-Text Catalog
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftCatalog_AISTHEA')
BEGIN
    CREATE FULLTEXT CATALOG ftCatalog_AISTHEA AS DEFAULT;
    PRINT 'Created Full-Text Catalog: ftCatalog_AISTHEA';
END
ELSE
BEGIN
    PRINT 'Full-Text Catalog already exists.';
END
GO

-- Step 2: Create Full-Text Index on Products table
-- First, ensure Products has a unique index (it should have PK already)
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Products'))
BEGIN
    CREATE FULLTEXT INDEX ON Products
    (
        Name LANGUAGE 1033,         -- English (Vietnamese uses same indexing)
        Description LANGUAGE 1033
    )
    KEY INDEX PK__Products__2D172D32C7B7F85A  -- Replace with actual PK name if different
    ON ftCatalog_AISTHEA
    WITH CHANGE_TRACKING AUTO;
    
    PRINT 'Created Full-Text Index on Products(Name, Description)';
END
ELSE
BEGIN
    PRINT 'Full-Text Index on Products already exists.';
END
GO

-- Step 3: (Optional) Create Full-Text Index on Reviews
IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Reviews'))
BEGIN
    -- Check if Reviews has unique index/PK
    IF EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('Reviews') AND is_primary_key = 1)
    BEGIN
        DECLARE @ReviewPKName NVARCHAR(128);
        SELECT @ReviewPKName = name FROM sys.indexes WHERE object_id = OBJECT_ID('Reviews') AND is_primary_key = 1;
        
        EXEC('CREATE FULLTEXT INDEX ON Reviews (Comment LANGUAGE 1033) KEY INDEX ' + @ReviewPKName + ' ON ftCatalog_AISTHEA WITH CHANGE_TRACKING AUTO');
        
        PRINT 'Created Full-Text Index on Reviews(Comment)';
    END
END
ELSE
BEGIN
    PRINT 'Full-Text Index on Reviews already exists or skipped.';
END
GO

PRINT '';
PRINT 'Full-Text Search setup complete!';
PRINT 'You can now use CONTAINS() queries for fast search.';
GO
