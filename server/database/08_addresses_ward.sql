/* =============================================================
   PATCH: Addresses.Ward metadata

   Purpose:
   - Keep the Addresses table aligned with the application schema
   - Add Ward column for profile address book + checkout parity
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
