-- Return order feature (SQL Server)
-- Prerequisite: base schema tables [dbo].[Users], [dbo].[Orders], [dbo].[OrderItems] must exist.

IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NULL
BEGIN
  RAISERROR('Missing required table [dbo].[Orders]. Please run base schema first.', 16, 1);
  RETURN;
END;

IF OBJECT_ID(N'[dbo].[OrderItems]', N'U') IS NULL
BEGIN
  RAISERROR('Missing required table [dbo].[OrderItems]. Please run base schema first.', 16, 1);
  RETURN;
END;

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
BEGIN
  RAISERROR('Missing required table [dbo].[Users]. Please run base schema first.', 16, 1);
  RETURN;
END;

CREATE TABLE [dbo].[ReturnRequests] (
  [ReturnRequestId] INT IDENTITY(1,1) NOT NULL,
  [OrderId] INT NOT NULL,
  [UserId] INT NOT NULL,
  [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ReturnRequests_Status] DEFAULT N'REQUESTED',
  [Reason] NVARCHAR(20) NOT NULL,
  [Note] NVARCHAR(500) NULL,
  [TotalRefundAmount] DECIMAL(18,2) NOT NULL,
  [DeliveredAt] DATETIME2 NOT NULL,
  [RequestDate] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequests_RequestDate] DEFAULT GETDATE(),
  [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequests_CreatedAt] DEFAULT GETDATE(),
  [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequests_UpdatedAt] DEFAULT GETDATE(),
  CONSTRAINT [PK_ReturnRequests] PRIMARY KEY ([ReturnRequestId]),
  CONSTRAINT [FK_ReturnRequests_Orders] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([OrderId]) ON DELETE CASCADE,
  CONSTRAINT [FK_ReturnRequests_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]),
  CONSTRAINT [CK_ReturnRequests_Status] CHECK ([Status] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED')),
  CONSTRAINT [CK_ReturnRequests_Reason] CHECK ([Reason] IN (N'DEFECTIVE',N'WRONG_ITEM',N'SIZE_ISSUE',N'CHANGED_MIND',N'OTHER'))
);

CREATE TABLE [dbo].[ReturnRequestItems] (
  [ReturnRequestItemId] INT IDENTITY(1,1) NOT NULL,
  [ReturnRequestId] INT NOT NULL,
  [OrderItemId] INT NOT NULL,
  [Quantity] INT NOT NULL,
  [UnitPrice] DECIMAL(18,2) NOT NULL,
  [Reason] NVARCHAR(20) NULL,
  [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequestItems_CreatedAt] DEFAULT GETDATE(),
  [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequestItems_UpdatedAt] DEFAULT GETDATE(),
  CONSTRAINT [PK_ReturnRequestItems] PRIMARY KEY ([ReturnRequestItemId]),
  CONSTRAINT [FK_ReturnRequestItems_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
  CONSTRAINT [FK_ReturnRequestItems_OrderItems] FOREIGN KEY ([OrderItemId]) REFERENCES [dbo].[OrderItems]([OrderItemId]),
  CONSTRAINT [UQ_ReturnRequestItems_Request_OrderItem] UNIQUE ([ReturnRequestId], [OrderItemId]),
  CONSTRAINT [CK_ReturnRequestItems_Reason] CHECK ([Reason] IS NULL OR [Reason] IN (N'DEFECTIVE',N'WRONG_ITEM',N'SIZE_ISSUE',N'CHANGED_MIND',N'OTHER'))
);

CREATE TABLE [dbo].[ReturnRequestAttachments] (
  [AttachmentId] INT IDENTITY(1,1) NOT NULL,
  [ReturnRequestId] INT NOT NULL,
  [FileUrl] NVARCHAR(1000) NOT NULL,
  [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequestAttachments_CreatedAt] DEFAULT GETDATE(),
  CONSTRAINT [PK_ReturnRequestAttachments] PRIMARY KEY ([AttachmentId]),
  CONSTRAINT [FK_ReturnRequestAttachments_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE
);

CREATE TABLE [dbo].[ReturnRequestStatusLogs] (
  [LogId] INT IDENTITY(1,1) NOT NULL,
  [ReturnRequestId] INT NOT NULL,
  [FromStatus] NVARCHAR(20) NULL,
  [ToStatus] NVARCHAR(20) NOT NULL,
  [ChangedBy] INT NOT NULL,
  [Comment] NVARCHAR(500) NULL,
  [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_ReturnRequestStatusLogs_CreatedAt] DEFAULT GETDATE(),
  CONSTRAINT [PK_ReturnRequestStatusLogs] PRIMARY KEY ([LogId]),
  CONSTRAINT [FK_ReturnRequestStatusLogs_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
  CONSTRAINT [FK_ReturnRequestStatusLogs_Users] FOREIGN KEY ([ChangedBy]) REFERENCES [dbo].[Users]([UserId]),
  CONSTRAINT [CK_ReturnRequestStatusLogs_FromStatus] CHECK ([FromStatus] IS NULL OR [FromStatus] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED')),
  CONSTRAINT [CK_ReturnRequestStatusLogs_ToStatus] CHECK ([ToStatus] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED'))
);

CREATE TABLE [dbo].[RefundTransactions] (
  [TransactionId] INT IDENTITY(1,1) NOT NULL,
  [ReturnRequestId] INT NOT NULL,
  [Amount] DECIMAL(18,2) NOT NULL,
  [Method] NVARCHAR(30) NOT NULL,
  [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_RefundTransactions_Status] DEFAULT N'PENDING',
  [IdempotencyKey] NVARCHAR(100) NOT NULL,
  [TransactionRef] NVARCHAR(100) NULL,
  [ProcessedBy] INT NULL,
  [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_RefundTransactions_CreatedAt] DEFAULT GETDATE(),
  [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_RefundTransactions_UpdatedAt] DEFAULT GETDATE(),
  CONSTRAINT [PK_RefundTransactions] PRIMARY KEY ([TransactionId]),
  CONSTRAINT [FK_RefundTransactions_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
  CONSTRAINT [UQ_RefundTransactions_IdempotencyKey] UNIQUE ([IdempotencyKey]),
  CONSTRAINT [CK_RefundTransactions_Method] CHECK ([Method] IN (N'ORIGINAL_PAYMENT',N'WALLET_CREDIT')),
  CONSTRAINT [CK_RefundTransactions_Status] CHECK ([Status] IN (N'PENDING',N'COMPLETED',N'FAILED'))
);

CREATE INDEX [IX_ReturnRequests_Status_CreatedAt] ON [dbo].[ReturnRequests]([Status], [CreatedAt]);
CREATE INDEX [IX_ReturnRequests_UserId_CreatedAt] ON [dbo].[ReturnRequests]([UserId], [CreatedAt]);
CREATE INDEX [IX_ReturnRequests_OrderId_CreatedAt] ON [dbo].[ReturnRequests]([OrderId], [CreatedAt]);
CREATE INDEX [IX_ReturnRequestItems_OrderItemId] ON [dbo].[ReturnRequestItems]([OrderItemId]);
CREATE INDEX [IX_ReturnRequestAttachments_ReturnRequestId] ON [dbo].[ReturnRequestAttachments]([ReturnRequestId]);
CREATE INDEX [IX_ReturnRequestStatusLogs_RequestId_CreatedAt] ON [dbo].[ReturnRequestStatusLogs]([ReturnRequestId], [CreatedAt]);
CREATE INDEX [IX_ReturnRequestStatusLogs_ChangedBy] ON [dbo].[ReturnRequestStatusLogs]([ChangedBy]);
CREATE INDEX [IX_RefundTransactions_RequestId_Status] ON [dbo].[RefundTransactions]([ReturnRequestId], [Status]);
CREATE INDEX [IX_RefundTransactions_CreatedAt] ON [dbo].[RefundTransactions]([CreatedAt]);
