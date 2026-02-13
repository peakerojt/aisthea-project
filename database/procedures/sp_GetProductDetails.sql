/* =============================================================
   STORED PROCEDURE: sp_GetProductDetails
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Fetch full product details (Info, Variants, Images, Attributes)
                in a single round-trip for maximum performance.
   USAGE: EXEC sp_GetProductDetails @ProductId = 123;
          EXEC sp_GetProductDetails @Slug = 'ao-thun-nam';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_GetProductDetails', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetProductDetails;
GO

CREATE PROCEDURE sp_GetProductDetails
    @ProductId INT = NULL,
    @Slug NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id INT;

    -- Resolve ID
    IF @ProductId IS NOT NULL
        SET @Id = @ProductId;
    ELSE IF @Slug IS NOT NULL
        SELECT @Id = ProductId FROM Products WHERE Slug = @Slug AND IsDeleted = 0;

    IF @Id IS NULL
    BEGIN
        -- Don't raise error, just return empty sets to indicate not found gracefully
        -- Or raise error if application expects it. Let's return empty result.
        RETURN;
    END

    -- Return everything as a SINGLE JSON string
    SELECT 
        p.ProductId AS productId, p.Name AS name, p.Slug AS slug, p.Description AS description, 
        p.BasePrice AS basePrice, p.Status AS status, p.CreatedAt AS createdAt,
        c.Name AS categoryName, c.Slug AS categorySlug,
        b.Name AS brandName,

        -- Variants
        (
            SELECT 
                pv.VariantId AS variantId, pv.SKU AS sku, pv.Price AS price, 
                pv.StockQuantity AS stockQuantity, pv.IsDefault AS isDefault,
                -- Attributes for this variant
                (
                    SELECT 
                        a.Name AS attributeName, 
                        av.Value AS attributeValue
                    FROM VariantAttributes va
                    JOIN AttributeValues av ON va.ValueId = av.ValueId
                    JOIN Attributes a ON av.AttributeId = a.AttributeId
                    WHERE va.VariantId = pv.VariantId
                    FOR JSON PATH
                ) AS attributes
            FROM ProductVariants pv
            WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0
            ORDER BY pv.IsDefault DESC, pv.Price ASC
            FOR JSON PATH
        ) AS variants,

        -- Images
        (
            SELECT 
                pi.ImageId AS imageId, pi.ImageUrl AS imageUrl, pi.ThumbnailUrl AS thumbnailUrl, 
                pi.IsPrimary AS isPrimary, pi.VariantId AS variantId
            FROM ProductImages pi
            WHERE pi.ProductId = p.ProductId
            ORDER BY pi.IsPrimary DESC, pi.ImageId ASC
            FOR JSON PATH
        ) AS images,

        -- Reviews
        (
            SELECT 
                r.ReviewId AS reviewId, r.Rating AS rating, r.Comment AS comment, r.CreatedAt AS createdAt,
                u.FullName AS 'user.fullName'
            FROM Reviews r
            JOIN Users u ON r.UserId = u.UserId
            WHERE r.ProductId = p.ProductId
            ORDER BY r.CreatedAt DESC
            FOR JSON PATH
        ) AS reviews

    FROM Products p
    LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
    LEFT JOIN Brands b ON p.BrandId = b.BrandId
    WHERE p.ProductId = @Id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;

    -- Optional: Similar Products? (Future enhancement)
END
GO

PRINT 'Created procedure sp_GetProductDetails';
GO
