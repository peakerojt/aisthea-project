/* =============================================================
   MASTER DATABASE SETUP SCRIPT - AISTHEA
   
   ─── HƯỚNG DẪN CHẠY TRONG SSMS ────────────────────────────
   
   BƯỚC 1: Đảm bảo database AISTHEA đã tồn tại.
           Nếu chưa, chạy: CREATE DATABASE AISTHEA;
   
   BƯỚC 2: Bật SQLCMD Mode trong SSMS:
           Menu Query → SQLCMD Mode (hoặc Ctrl+Shift+Q)
   
   BƯỚC 3: Sửa biến BasePath bên dưới thành đường dẫn
           thư mục "database" trên máy của bạn.
           Ví dụ: "C:\Users\YourName\Projects\AISTHEA-Project\database"
   
   BƯỚC 4: Nhấn F5 để chạy.
   
   ─── HOẶC CHẠY BẰNG POWERSHELL (không cần sửa gì) ────────
   Mở PowerShell tại thư mục database/ rồi chạy:
       .\run_all.ps1
   ============================================================= */

/* ⚠️  CHỈ SỬA DÒNG NÀY — đặt đường dẫn thư mục database trên máy bạn */
:setvar BasePath "C:\Users\Administrator\Downloads\OJT\Week3_GIT\AISTHEA-Project\database"
/* ─────────────────────────────────────────────────────────────────── */

USE AISTHEA;
GO

PRINT '';
PRINT '==============================================';
PRINT '  AISTHEA DATABASE SETUP STARTING...';
PRINT '==============================================';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 1: Schema (Tables, Function, Computed Columns)
   ───────────────────────────────────────────────── */
PRINT '> STEP 1/13 - Schema (01_schema.sql)';
GO
:r $(BasePath)\table\01_schema.sql
GO
PRINT '> STEP 1 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 2: Indexes + Constraints + Data Quality
   ───────────────────────────────────────────────── */
PRINT '> STEP 2/13 - Indexes (04_indexes.sql)';
GO
:r $(BasePath)\indexes\04_indexes.sql
GO
PRINT '> STEP 2 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 3: View - vw_ProductCatalog
   ───────────────────────────────────────────────── */
PRINT '> STEP 3/13 - View: vw_ProductCatalog';
GO
:r $(BasePath)\views\05_view_product_catalog.sql
GO
PRINT '> STEP 3 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 4: View - vw_OrderSummary
   ───────────────────────────────────────────────── */
PRINT '> STEP 4/13 - View: vw_OrderSummary';
GO
:r $(BasePath)\views\06_view_order_summary.sql
GO
PRINT '> STEP 4 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 5: SP - sp_GetProductDetails
   ───────────────────────────────────────────────── */
PRINT '> STEP 5/13 - SP: sp_GetProductDetails';
GO
:r $(BasePath)\procedures\07_sp_get_product_details.sql
GO
PRINT '> STEP 5 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 6: SP - sp_SearchProducts
   ───────────────────────────────────────────────── */
PRINT '> STEP 6/13 - SP: sp_SearchProducts';
GO
:r $(BasePath)\procedures\08_sp_search_products.sql
GO
PRINT '> STEP 6 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 7: SP - sp_Checkout
   ───────────────────────────────────────────────── */
PRINT '> STEP 7/13 - SP: sp_Checkout';
GO
:r $(BasePath)\procedures\09_sp_checkout.sql
GO
PRINT '> STEP 7 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 8: Full-Text Search Catalog + Index
   ───────────────────────────────────────────────── */
PRINT '> STEP 8/13 - Full-text catalog';
GO
:r $(BasePath)\fulltext\10_fulltext_setup.sql
GO
PRINT '> STEP 8 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 9: Full-Text Optimization (safe)
   ───────────────────────────────────────────────── */
PRINT '> STEP 9/13 - Full-text optimization';
GO
:r $(BasePath)\fulltext\11_fulltext_optimized_search.sql
GO
PRINT '> STEP 9 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 10: Computed Columns Fallback
   ───────────────────────────────────────────────── */
PRINT '> STEP 10/13 - Computed columns fallback';
GO
:r $(BasePath)\fulltext\12_add_computed_columns.sql
GO
PRINT '> STEP 10 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 11: Seed Data
   WARNING: Clears existing product/category data first!
   ───────────────────────────────────────────────── */
PRINT '> STEP 11/13 - Seed data (WARNING: deletes existing data)';
GO
:r $(BasePath)\data\02_data.sql
GO
PRINT '> STEP 11 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 12: Variant Attributes (color + size)
   ───────────────────────────────────────────────── */
PRINT '> STEP 12/13 - Variant attributes';
GO
:r $(BasePath)\data\13_variant_attributes.sql
GO
PRINT '> STEP 12 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   STEP 13: Fix Primary Images
   ───────────────────────────────────────────────── */
PRINT '> STEP 13/13 - Fix primary images';
GO
:r $(BasePath)\03_fix_primary_images.sql
GO
PRINT '> STEP 13 complete';
PRINT '';
GO

/* ─────────────────────────────────────────────────
   VERIFICATION
   ───────────────────────────────────────────────── */
PRINT '==============================================';
PRINT '  VERIFICATION';
PRINT '==============================================';
GO

SELECT TableName, TotalRows FROM (
    SELECT 'Products' AS TableName, COUNT(*) AS TotalRows FROM Products
    UNION ALL SELECT 'ProductVariants', COUNT(*) FROM ProductVariants
    UNION ALL SELECT 'ProductImages', COUNT(*) FROM ProductImages
    UNION ALL SELECT 'VariantAttributes', COUNT(*) FROM VariantAttributes
    UNION ALL SELECT 'Categories', COUNT(*) FROM Categories
    UNION ALL SELECT 'Attributes', COUNT(*) FROM Attributes
    UNION ALL SELECT 'AttributeValues', COUNT(*) FROM AttributeValues
) t;

SELECT 
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(DISTINCT ProductId) FROM ProductImages)
        THEN 'OK: All products have exactly 1 primary image'
        ELSE 'ERROR: Primary image count mismatch!'
    END AS PrimaryImageCheck
FROM ProductImages WHERE IsPrimary = 1;

EXEC sp_SearchProducts @SearchTerm = N'ao';
GO

PRINT '';
PRINT '==============================================';
PRINT '  AISTHEA DATABASE SETUP COMPLETE!';
PRINT '==============================================';
GO
