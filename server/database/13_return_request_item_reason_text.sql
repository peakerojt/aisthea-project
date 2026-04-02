SET NOCOUNT ON;

IF COL_LENGTH('dbo.ReturnRequestItems', 'ReasonText') IS NULL
BEGIN
    ALTER TABLE dbo.ReturnRequestItems
        ADD ReasonText NVARCHAR(200) NULL;
    PRINT 'OK: Added ReturnRequestItems.ReasonText';
END
ELSE
BEGIN
    PRINT 'OK: ReturnRequestItems.ReasonText already exists';
END
