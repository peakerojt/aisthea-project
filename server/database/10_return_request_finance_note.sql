/* =============================================================
   Patch ReturnRequests.FinanceNote for Phase 5 finance workflow
   ============================================================= */

IF OBJECT_ID('ReturnRequests', 'U') IS NOT NULL
   AND COL_LENGTH('ReturnRequests', 'FinanceNote') IS NULL
BEGIN
    ALTER TABLE ReturnRequests
        ADD FinanceNote NVARCHAR(1000) NULL;

    PRINT 'OK: ReturnRequests.FinanceNote column added';
END
ELSE
BEGIN
    PRINT 'SKIP: ReturnRequests.FinanceNote column already exists or ReturnRequests table missing';
END
GO
