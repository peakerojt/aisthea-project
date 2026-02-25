/* Fix missing primary images */
USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Step 1: Reset all IsPrimary flags to 0 first to avoid UX_ProductImages_Primary violation
-- (the unique filtered index only allows one IsPrimary=1 per ProductId)
UPDATE ProductImages SET IsPrimary = 0;

PRINT 'Reset all IsPrimary flags to 0';

-- Step 2: Set the first image (lowest ImageId) of each product as primary
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
