/* =============================================================
   MASTER DATABASE SETUP SCRIPT - AISTHEA
   
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

USE AISTHEA;
GO

PRINT '==============================================';
PRINT '  AISTHEA DATABASE SETUP STARTING...';
PRINT '==============================================';
GO

PRINT '> STEP 1/2 - Schema (Tables, Indexes, Views, SPs, FullText)';
GO
:r $(BasePath)\01_schema_all.sql
GO

PRINT '> STEP 2/2 - Seed Data (Products, Categories, Users)';
GO
:r $(BasePath)\02_seed_data.sql
GO

PRINT '==============================================';
PRINT '  AISTHEA DATABASE SETUP COMPLETE!';
PRINT '==============================================';
GO
