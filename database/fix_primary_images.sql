/* Fix missing primary images */
USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Set the first image of each product as primary
UPDATE pi
SET IsPrimary = 1
FROM ProductImages pi
INNER JOIN (
    SELECT ProductId, MIN(ImageId) AS FirstImageId
    FROM ProductImages
    GROUP BY ProductId
) AS first ON pi.ImageId = first.FirstImageId;

PRINT 'Updated primary images for all products';

-- Verify
SELECT COUNT(DISTINCT ProductId) AS ProductsWithPrimaryImage
FROM ProductImages
WHERE IsPrimary = 1;
GO
