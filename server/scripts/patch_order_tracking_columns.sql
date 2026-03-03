IF COL_LENGTH('Orders','OrderCode') IS NULL
BEGIN
  ALTER TABLE Orders ADD OrderCode NVARCHAR(50) NULL;
END;

IF COL_LENGTH('Orders','CustomerEmail') IS NULL
BEGIN
  ALTER TABLE Orders ADD CustomerEmail NVARCHAR(100) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_Orders_OrderCode' AND object_id=OBJECT_ID('Orders'))
BEGIN
  CREATE UNIQUE INDEX UQ_Orders_OrderCode ON Orders(OrderCode) WHERE OrderCode IS NOT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_OrderCode' AND object_id=OBJECT_ID('Orders'))
BEGIN
  CREATE INDEX IX_Orders_OrderCode ON Orders(OrderCode);
END;

UPDATE o
SET o.OrderCode = o.OrderNumber
FROM Orders o
WHERE o.OrderCode IS NULL;
