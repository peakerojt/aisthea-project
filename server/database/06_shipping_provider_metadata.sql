/* Patch: Shipments provider fields
   Safe to re-run on older databases. Adds columns and supporting index if missing. */
IF COL_LENGTH('Shipments', 'ShippingMode') IS NULL
BEGIN
    ALTER TABLE Shipments ADD ShippingMode NVARCHAR(20) NOT NULL CONSTRAINT DF_Shipments_ShippingMode DEFAULT 'manual';
END;

IF COL_LENGTH('Shipments', 'Provider') IS NULL
BEGIN
    ALTER TABLE Shipments ADD Provider NVARCHAR(50) NULL;
END;

IF COL_LENGTH('Shipments', 'ProviderOrderCode') IS NULL
BEGIN
    ALTER TABLE Shipments ADD ProviderOrderCode NVARCHAR(100) NULL;
END;

IF COL_LENGTH('Shipments', 'ProviderStatus') IS NULL
BEGIN
    ALTER TABLE Shipments ADD ProviderStatus NVARCHAR(50) NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Shipments_ProviderOrderCode'
      AND object_id = OBJECT_ID('dbo.Shipments')
)
BEGIN
    EXEC('CREATE NONCLUSTERED INDEX IX_Shipments_ProviderOrderCode
        ON Shipments(ProviderOrderCode)
        WHERE ProviderOrderCode IS NOT NULL;');
END;