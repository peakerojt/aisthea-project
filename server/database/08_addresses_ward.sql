/* =============================================================
   PATCH: Addresses.Ward

   Purpose:
   - Keep Addresses aligned with the app schema
   - Add Ward for profile address book and checkout
   ============================================================= */

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Addresses')
   AND NOT EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('Addresses')
          AND name = 'Ward'
   )
BEGIN
    ALTER TABLE Addresses ADD Ward NVARCHAR(50) NULL;
    PRINT '✓ Addresses.Ward added';
END
ELSE
BEGIN
    PRINT '- Addresses.Ward already exists';
END
GO