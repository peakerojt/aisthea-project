/* =============================================================
   Patch ReturnRequests.RefundStatus for Phase 5 refund workflow
   ============================================================= */

IF OBJECT_ID('ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('ReturnRequests', 'RefundStatus') IS NULL
BEGIN
    ALTER TABLE ReturnRequests
        ADD RefundStatus NVARCHAR(50) NULL
            CONSTRAINT DF_ReturnRequests_RefundStatus DEFAULT 'NOT_APPLICABLE';

    PRINT 'OK: ReturnRequests.RefundStatus column added';
END
ELSE
BEGIN
    PRINT 'SKIP: ReturnRequests.RefundStatus column already exists or ReturnRequests table missing';
END
GO

IF OBJECT_ID('ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('ReturnRequests', 'RefundStatus') IS NOT NULL
BEGIN
    UPDATE ReturnRequests
    SET RefundStatus = CASE
        WHEN Status = 'PENDING_PAYMENT_CONFIRMATION' THEN 'LOCKED_UNTIL_PAYMENT_CONFIRMED'
        WHEN Status = 'ACCEPTED_FOR_REFUND' THEN 'PENDING'
        WHEN Status = 'CLOSED' THEN 'REFUNDED'
        ELSE 'NOT_APPLICABLE'
    END
    WHERE RefundStatus IS NULL
       OR LTRIM(RTRIM(RefundStatus)) = '';

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ReturnRequests_RefundStatus'
          AND object_id = OBJECT_ID('ReturnRequests')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ReturnRequests_RefundStatus
            ON ReturnRequests(RefundStatus);
    END

    PRINT 'OK: ReturnRequests.RefundStatus backfill/index applied';
END
GO
