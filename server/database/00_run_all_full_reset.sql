/* =============================================================
   AISTHEA DATABASE FULL RESET

   Purpose:
   - Build the current schema
   - Apply idempotent schema patches
   - Re-run the destructive seed script

   Warning:
   - Existing seeded business data can be overwritten
   - Use only when you intentionally want a reset

   Run in SSMS:
   1. Create database AISTHEA if it does not exist yet
   2. Enable SQLCMD Mode
   3. Update BasePath below to your local server/database folder
   4. Press F5
   ============================================================= */

/* Only edit BasePath below. Point it to your local server/database folder. */
:setvar BasePath "C:\Users\Administrator\Downloads\OJT\Week3_GIT\AISTHEA-Project\server\database"
:ON ERROR EXIT

USE AISTHEA;
GO

PRINT '=============================================='
PRINT '  AISTHEA DATABASE FULL RESET STARTING...'
PRINT '=============================================='
GO

PRINT '> STEP 1/7 - Base schema';
GO
:r $(BasePath)\01_schema_all.sql
GO

PRINT '> STEP 2/7 - Patch PurchaseOrder receiving fields';
GO
:r $(BasePath)\04_purchase_order_fields.sql
GO

PRINT '> STEP 3/7 - Patch order pricing fields';
GO
:r $(BasePath)\05_order_pricing_fields.sql
GO

PRINT '> STEP 4/7 - Patch shipment provider fields';
GO
:r $(BasePath)\06_shipping_provider_metadata.sql
GO

PRINT '> STEP 5/7 - Patch delivery proof fields';
GO
:r $(BasePath)\07_delivery_proof_metadata.sql
GO

PRINT '> STEP 6/7 - Patch address ward field';
GO
:r $(BasePath)\08_addresses_ward.sql
GO

PRINT '> STEP 7/7 - Destructive seed reset';
GO
:r $(BasePath)\03_seed_data_standard_fixed.sql
GO

PRINT '=============================================='
PRINT '  AISTHEA DATABASE FULL RESET COMPLETE!'
PRINT '=============================================='
GO