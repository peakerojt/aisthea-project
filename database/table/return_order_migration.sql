-- ============================================================
-- Return Order Feature - SQL Server Migration
-- Tables: ReturnRequests, ReturnRequestItems,
--         ReturnRequestAttachments, ReturnRequestStatusLogs,
--         RefundTransactions
-- ============================================================

-- 1. ReturnRequests
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReturnRequests')
BEGIN
  CREATE TABLE [dbo].[ReturnRequests] (
    [ReturnRequestId]   INT             NOT NULL IDENTITY(1,1),
    [OrderId]           INT             NOT NULL,
    [UserId]            INT             NOT NULL,
    [Status]            NVARCHAR(20)    NOT NULL DEFAULT 'REQUESTED',
    [Reason]            NVARCHAR(50)    NOT NULL,
    [Note]              NVARCHAR(500)   NULL,
    [TotalRefundAmount] DECIMAL(18,2)   NOT NULL DEFAULT 0,
    [DeliveredAt]       DATETIME2       NOT NULL,
    [CreatedAt]         DATETIME2       NOT NULL DEFAULT GETDATE(),
    [UpdatedAt]         DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_ReturnRequests] PRIMARY KEY CLUSTERED ([ReturnRequestId] ASC),
    CONSTRAINT [FK_ReturnRequests_Orders]
      FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([OrderId]),
    CONSTRAINT [FK_ReturnRequests_Users]
      FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]),
    CONSTRAINT [CK_ReturnRequests_Status]
      CHECK ([Status] IN ('REQUESTED','APPROVED','REJECTED','RECEIVED','REFUNDED')),
    CONSTRAINT [CK_ReturnRequests_Reason]
      CHECK ([Reason] IN ('DEFECTIVE','WRONG_ITEM','SIZE_ISSUE','CHANGED_MIND','OTHER'))
  );

  CREATE INDEX [IX_ReturnRequests_OrderId]  ON [dbo].[ReturnRequests]([OrderId]);
  CREATE INDEX [IX_ReturnRequests_UserId]   ON [dbo].[ReturnRequests]([UserId]);
  CREATE INDEX [IX_ReturnRequests_Status]   ON [dbo].[ReturnRequests]([Status]);
  CREATE INDEX [IX_ReturnRequests_CreatedAt] ON [dbo].[ReturnRequests]([CreatedAt]);

  PRINT 'Created table ReturnRequests';
END
GO

-- 2. ReturnRequestItems
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReturnRequestItems')
BEGIN
  CREATE TABLE [dbo].[ReturnRequestItems] (
    [ReturnRequestItemId] INT           NOT NULL IDENTITY(1,1),
    [ReturnRequestId]     INT           NOT NULL,
    [OrderItemId]         INT           NOT NULL,
    [Quantity]            INT           NOT NULL,
    [UnitPrice]           DECIMAL(18,2) NOT NULL,
    [Reason]              NVARCHAR(50)  NULL,
    CONSTRAINT [PK_ReturnRequestItems] PRIMARY KEY CLUSTERED ([ReturnRequestItemId] ASC),
    CONSTRAINT [FK_ReturnRequestItems_ReturnRequests]
      FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReturnRequestItems_OrderItems]
      FOREIGN KEY ([OrderItemId]) REFERENCES [dbo].[OrderItems]([OrderItemId]),
    -- Prevent duplicate item in same return request
    CONSTRAINT [UQ_ReturnRequestItems_RequestItem]
      UNIQUE ([ReturnRequestId], [OrderItemId])
  );

  CREATE INDEX [IX_ReturnRequestItems_ReturnRequestId] ON [dbo].[ReturnRequestItems]([ReturnRequestId]);
  CREATE INDEX [IX_ReturnRequestItems_OrderItemId]     ON [dbo].[ReturnRequestItems]([OrderItemId]);

  PRINT 'Created table ReturnRequestItems';
END
GO

-- 3. ReturnRequestAttachments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReturnRequestAttachments')
BEGIN
  CREATE TABLE [dbo].[ReturnRequestAttachments] (
    [AttachmentId]    INT            NOT NULL IDENTITY(1,1),
    [ReturnRequestId] INT            NOT NULL,
    [FileUrl]         NVARCHAR(1000) NOT NULL,
    [CreatedAt]       DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_ReturnRequestAttachments] PRIMARY KEY CLUSTERED ([AttachmentId] ASC),
    CONSTRAINT [FK_ReturnRequestAttachments_ReturnRequests]
      FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE
  );

  CREATE INDEX [IX_ReturnRequestAttachments_ReturnRequestId]
    ON [dbo].[ReturnRequestAttachments]([ReturnRequestId]);

  PRINT 'Created table ReturnRequestAttachments';
END
GO

-- 4. ReturnRequestStatusLogs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReturnRequestStatusLogs')
BEGIN
  CREATE TABLE [dbo].[ReturnRequestStatusLogs] (
    [LogId]           INT          NOT NULL IDENTITY(1,1),
    [ReturnRequestId] INT          NOT NULL,
    [FromStatus]      NVARCHAR(20) NULL,
    [ToStatus]        NVARCHAR(20) NOT NULL,
    [ChangedBy]       INT          NULL,
    [Comment]         NVARCHAR(500) NULL,
    [CreatedAt]       DATETIME2    NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_ReturnRequestStatusLogs] PRIMARY KEY CLUSTERED ([LogId] ASC),
    CONSTRAINT [FK_ReturnRequestStatusLogs_ReturnRequests]
      FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ReturnRequestStatusLogs_Users]
      FOREIGN KEY ([ChangedBy]) REFERENCES [dbo].[Users]([UserId])
  );

  CREATE INDEX [IX_ReturnRequestStatusLogs_ReturnRequestId]
    ON [dbo].[ReturnRequestStatusLogs]([ReturnRequestId]);

  PRINT 'Created table ReturnRequestStatusLogs';
END
GO

-- 5. RefundTransactions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RefundTransactions')
BEGIN
  CREATE TABLE [dbo].[RefundTransactions] (
    [TransactionId]   INT           NOT NULL IDENTITY(1,1),
    [ReturnRequestId] INT           NOT NULL,
    [Amount]          DECIMAL(18,2) NOT NULL,
    [Method]          NVARCHAR(30)  NOT NULL,
    [Status]          NVARCHAR(20)  NOT NULL DEFAULT 'COMPLETED',
    [IdempotencyKey]  NVARCHAR(100) NOT NULL,
    [TransactionRef]  NVARCHAR(100) NULL,
    [ProcessedBy]     INT           NULL,
    [CreatedAt]       DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [PK_RefundTransactions] PRIMARY KEY CLUSTERED ([TransactionId] ASC),
    CONSTRAINT [UQ_RefundTransactions_IdempotencyKey]
      UNIQUE ([IdempotencyKey]),
    CONSTRAINT [FK_RefundTransactions_ReturnRequests]
      FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]),
    CONSTRAINT [CK_RefundTransactions_Method]
      CHECK ([Method] IN ('ORIGINAL_PAYMENT','WALLET_CREDIT')),
    CONSTRAINT [CK_RefundTransactions_Status]
      CHECK ([Status] IN ('PENDING','COMPLETED','FAILED'))
  );

  CREATE INDEX [IX_RefundTransactions_ReturnRequestId]
    ON [dbo].[RefundTransactions]([ReturnRequestId]);

  PRINT 'Created table RefundTransactions';
END
GO

PRINT 'Return Order migration complete.';
GO
