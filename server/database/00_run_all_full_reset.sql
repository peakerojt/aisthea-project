/* =============================================================
   MASTER DATABASE SETUP SCRIPT (FULL RESET) - AISTHEA

   WARNING:
   - This script runs the destructive seed step.
   - Existing product/procurement data will be deleted and re-seeded.

   ─── HƯỚNG DẪN CHẠY TRONG SSMS ────────────────────────────

   BƯỚC 1: Đảm bảo database AISTHEA đã tồn tại.
           Nếu chưa, chạy: CREATE DATABASE AISTHEA;

   BƯỚC 2: Bật SQLCMD Mode trong SSMS:
           Menu Query → SQLCMD Mode (hoặc Ctrl+Shift+Q)

   BƯỚC 3: Sửa biến BasePath bên dưới thành đường dẫn
           thư mục "database" trên máy của bạn.

   BƯỚC 4: Nhấn F5 để chạy.
   ============================================================= */

/* ⚠️  CHỈ SỬA DÒNG NÀY — đặt đường dẫn thư mục database trên máy bạn */
:setvar BasePath "C:\Users\Administrator\Downloads\OJT\Week3_GIT\AISTHEA-Project\server\database"
/* ─────────────────────────────────────────────────────────────────── */
:ON ERROR EXIT

USE AISTHEA;
GO

PRINT '==============================================';
PRINT '  AISTHEA DATABASE FULL RESET STARTING...';
PRINT '==============================================';
GO

PRINT '> STEP 1/3 - Schema (Tables, Indexes, Functions)';
GO
:r $(BasePath)\01_schema_all.sql
GO

PRINT '> STEP 2/3 - Schema Patch (PurchaseOrder extended fields)';
GO
:r $(BasePath)\04_purchase_order_fields.sql
GO

PRINT '> STEP 3/3 - Seed Data (DESTRUCTIVE RESET)';
GO
:r $(BasePath)\03_seed_data_standard_fixed.sql
GO

PRINT '==============================================';
PRINT '  AISTHEA DATABASE FULL RESET COMPLETE!';
PRINT '==============================================';
GO
