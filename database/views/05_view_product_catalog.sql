/* =============================================================
   DATABASE VIEW: vw_ProductCatalog
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Optimized view for product listing pages.
                Pre-joins Categories, Brands, Images and calculates
                min/max prices, stock totals from variants.
   USAGE: SELECT * FROM vw_ProductCatalog WHERE categorySlug = 'men';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('vw_ProductCatalog', 'V') IS NOT NULL
    DROP VIEW vw_ProductCatalog;
GO

CREATE VIEW vw_ProductCatalog
AS
SELECT 
    -- Product Info
    p.ProductId AS productId,
    p.Name AS name,
    p.Slug AS slug,
    p.Description AS description,
    p.BasePrice AS basePrice,
    p.Status AS status,
    p.CreatedAt AS createdAt,
    
    -- Category
    c.Name AS categoryName,
    c.Slug AS categorySlug,
    
    -- Brand
    b.Name AS brandName,
    
    -- Variant Aggregations
    (SELECT MIN(pv.Price) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS minPrice,
    (SELECT MAX(pv.Price) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS maxPrice,
    (SELECT SUM(pv.StockQuantity) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS totalStock,
    (SELECT COUNT(*) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS variantCount,
    
    -- Primary Image (fallback to ImageUrl if ThumbnailUrl is NULL)
    (SELECT TOP 1 pi.ImageUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryImageUrl,
    (SELECT TOP 1 COALESCE(pi.ThumbnailUrl, pi.ImageUrl) FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryThumbnailUrl


FROM Products p
LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
LEFT JOIN Brands b ON p.BrandId = b.BrandId
WHERE p.IsDeleted = 0 AND p.Status = 'Active';

GO

PRINT 'Created view vw_ProductCatalog';
GO
