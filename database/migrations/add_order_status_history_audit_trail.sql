-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add audit trail columns to OrderStatusHistory
-- Branch: feature/enhance-order-status-KYTT
-- Date: 2026-02-27
-- ─────────────────────────────────────────────────────────────────────────────

-- Add OldStatus column (nullable — null for first history entries)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'OrderStatusHistory' AND COLUMN_NAME = 'OldStatus'
)
BEGIN
  ALTER TABLE [dbo].[OrderStatusHistory]
  ADD [OldStatus] NVARCHAR(20) NULL;
  PRINT 'Added OldStatus column to OrderStatusHistory';
END
ELSE
  PRINT 'OldStatus already exists — skipping';
GO

-- Add ChangedBy column (nullable — references Users.UserId)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'OrderStatusHistory' AND COLUMN_NAME = 'ChangedBy'
)
BEGIN
  ALTER TABLE [dbo].[OrderStatusHistory]
  ADD [ChangedBy] INT NULL;
  PRINT 'Added ChangedBy column to OrderStatusHistory';
END
ELSE
  PRINT 'ChangedBy already exists — skipping';
GO

-- Add Note column (nullable — stores reason for cancellation / change)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'OrderStatusHistory' AND COLUMN_NAME = 'Note'
)
BEGIN
  ALTER TABLE [dbo].[OrderStatusHistory]
  ADD [Note] NVARCHAR(500) NULL;
  PRINT 'Added Note column to OrderStatusHistory';
END
ELSE
  PRINT 'Note already exists — skipping';
GO

PRINT 'Migration complete.';
