ALTER TABLE Orders ADD
  OrderCode NVARCHAR(50) NULL,
  CustomerEmail NVARCHAR(100) NULL;

CREATE UNIQUE INDEX UQ_Orders_OrderCode ON Orders(OrderCode) WHERE OrderCode IS NOT NULL;
CREATE INDEX IX_Orders_OrderCode ON Orders(OrderCode);

IF OBJECT_ID('Shipments', 'U') IS NULL
BEGIN
  CREATE TABLE Shipments (
    ShipmentId INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL UNIQUE,
    Carrier NVARCHAR(100) NULL,
    TrackingNumber NVARCHAR(100) NULL,
    Eta DATETIME2 NULL,
    LastKnownLocation NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Shipments_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
  );
END;

CREATE INDEX IX_Shipments_TrackingNumber ON Shipments(TrackingNumber);
CREATE INDEX IX_OrderStatusHistory_OrderId_ChangedAt ON OrderStatusHistory(OrderId, ChangedAt);
