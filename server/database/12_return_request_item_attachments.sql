PRINT 'Applying patch 12: item-level return request attachments...';
GO

IF COL_LENGTH('dbo.ReturnRequestAttachments', 'ReturnRequestItemId') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequestAttachments
        ADD ReturnRequestItemId INT NULL;
    PRINT 'OK: Added ReturnRequestAttachments.ReturnRequestItemId';
END
ELSE
BEGIN
    PRINT 'OK: ReturnRequestAttachments.ReturnRequestItemId already exists';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_ReturnRequestAttachments_ReturnRequestItems'
)
BEGIN
    ALTER TABLE dbo.ReturnRequestAttachments
        ADD CONSTRAINT FK_ReturnRequestAttachments_ReturnRequestItems
            FOREIGN KEY (ReturnRequestItemId)
            REFERENCES dbo.ReturnRequestItems(ReturnRequestItemId);
    PRINT 'OK: Added FK_ReturnRequestAttachments_ReturnRequestItems';
END
ELSE
BEGIN
    PRINT 'OK: FK_ReturnRequestAttachments_ReturnRequestItems already exists';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_ReturnRequestAttachments_ReturnRequestItemId'
      AND object_id = OBJECT_ID('dbo.ReturnRequestAttachments')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ReturnRequestAttachments_ReturnRequestItemId
        ON dbo.ReturnRequestAttachments(ReturnRequestItemId);
    PRINT 'OK: Added IX_ReturnRequestAttachments_ReturnRequestItemId';
END
ELSE
BEGIN
    PRINT 'OK: IX_ReturnRequestAttachments_ReturnRequestItemId already exists';
END
GO
