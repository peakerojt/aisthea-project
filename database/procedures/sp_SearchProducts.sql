/* =============================================================
   STORED PROCEDURE: sp_SearchProducts
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Full-Text Search for products using CONTAINS.
                Returns ranked results by relevance.
   USAGE: EXEC sp_SearchProducts @SearchTerm = 'áo thun';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_SearchProducts', 'P') IS NOT NULL
    DROP PROCEDURE sp_SearchProducts;
GO

CREATE PROCEDURE sp_SearchProducts
    @SearchTerm NVARCHAR(255),
    @MaxResults INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate input
    IF @SearchTerm IS NULL OR LTRIM(RTRIM(@SearchTerm)) = ''
    BEGIN
        RAISERROR('Search term cannot be empty', 16, 1);
        RETURN;
    END

    -- Format search term by removing diacritics
    DECLARE @NormalizedTerm NVARCHAR(255);
    SET @NormalizedTerm = dbo.fn_RemoveDiacritics(@SearchTerm);

    -- Use optimized LIKE on indexed normalized columns
    SELECT TOP (@MaxResults)
        p.ProductId AS productId,
        p.Name AS name,
        p.Slug AS slug,
        p.Description AS description,
        p.BasePrice AS basePrice,
        p.Status AS status,
        c.Name AS categoryName,
        c.Slug AS categorySlug,
        b.Name AS brandName,
        
        -- Get primary image
        (SELECT TOP 1 pi.ImageUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryImageUrl,
        (SELECT TOP 1 pi.ThumbnailUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryThumbnailUrl,
        
        -- Simple relevance: Name match = 2, Description match = 1
        CASE 
            WHEN p.NameNormalized LIKE '%' + @NormalizedTerm + '%' THEN 2
            ELSE 1
        END AS relevance
        
    FROM Products p
    LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
    LEFT JOIN Brands b ON p.BrandId = b.BrandId
    
    WHERE p.IsDeleted = 0 
      AND p.Status = 'Active'
      AND (p.NameNormalized LIKE '%' + @NormalizedTerm + '%' 
           OR p.DescriptionNormalized LIKE '%' + @NormalizedTerm + '%')
    
    ORDER BY relevance DESC, p.CreatedAt DESC;

END
GO

PRINT 'Created procedure sp_SearchProducts';
GO
