/* =============================================================
   FULL-TEXT SEARCH SETUP
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Enable Full-Text Search on Products table for
                intelligent product search with ranking.
   ============================================================= */

USE AISTHEA;
GO

-- Check if Full-Text Search is installed
IF FULLTEXTSERVICEPROPERTY('IsFulltextInstalled') = 1
BEGIN
    PRINT 'Full-Text Search service is installed. Proceeding with setup...';
    
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

    -- Step 2: Create Full-Text Index on Products table
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Products'))
    BEGIN
        -- Dynamically resolve the actual PK name
        DECLARE @ProductsPKName NVARCHAR(255);
        SELECT @ProductsPKName = name 
        FROM sys.key_constraints 
        WHERE type = 'PK' AND parent_object_id = OBJECT_ID('dbo.Products');

        IF @ProductsPKName IS NOT NULL
        BEGIN
            DECLARE @Sql NVARCHAR(MAX) = '
            CREATE FULLTEXT INDEX ON Products
            (
                Name LANGUAGE 1033,
                Description LANGUAGE 1033
            )
            KEY INDEX ' + QUOTENAME(@ProductsPKName) + '
            ON ftCatalog_AISTHEA
            WITH CHANGE_TRACKING AUTO;';
            
            EXEC sp_executesql @Sql;
            PRINT 'Created Full-Text Index on Products table using PK: ' + @ProductsPKName;
        END
        ELSE
        BEGIN
            PRINT 'WARNING: Could not find PK on Products table. Full-text index skipped.';
        END
    END
    ELSE
    BEGIN
        PRINT 'Full-Text Index on Products already exists.';
    END

    -- Step 3: (Optional) Create Full-Text Index on Reviews
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Reviews'))
    BEGIN
        DECLARE @ReviewPKName NVARCHAR(128);
        SELECT @ReviewPKName = name FROM sys.indexes WHERE object_id = OBJECT_ID('Reviews') AND is_primary_key = 1;
        
        IF @ReviewPKName IS NOT NULL
        BEGIN
            DECLARE @SqlReview NVARCHAR(MAX) = 'CREATE FULLTEXT INDEX ON Reviews (Comment LANGUAGE 1033) KEY INDEX ' + QUOTENAME(@ReviewPKName) + ' ON ftCatalog_AISTHEA WITH CHANGE_TRACKING AUTO';
            EXEC sp_executesql @SqlReview;
            PRINT 'Created Full-Text Index on Reviews(Comment)';
        END
    END
END
ELSE
BEGIN
    PRINT '-------------------------------------------------------------------------';
    PRINT 'WARNING: Full-Text Search service is NOT installed on this SQL instance.';
    PRINT 'The full-text index on Products will not be created.';
    PRINT 'Search functionality will fall back to using LIKE in sp_SearchProducts.';
    PRINT '-------------------------------------------------------------------------';
END
GO

PRINT '';
PRINT 'Full-Text Search setup complete!';
GO
