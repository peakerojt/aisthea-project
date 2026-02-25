-- Add Note column to Orders
IF COL_LENGTH('dbo.Orders', 'Note') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD Note NVARCHAR(500) NULL;
END

-- Create OrderStatusHistory table
IF OBJECT_ID('dbo.OrderStatusHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatusHistory (
        OrderStatusHistoryId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        OrderId INT NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        ChangedAt DATETIME2 NOT NULL CONSTRAINT DF_OrderStatusHistory_ChangedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderStatusHistory_Orders FOREIGN KEY (OrderId)
            REFERENCES dbo.Orders(OrderId)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_OrderStatusHistory_OrderId ON dbo.OrderStatusHistory(OrderId);
END

