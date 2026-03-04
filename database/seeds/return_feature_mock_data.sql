USE AISTHEA;
GO

/*
  Mock data for Return Order feature testing
  - Create customer user (Active)
  - Assign Customer role
  - Create one DELIVERED order within return window
  - Create order items + delivered status history

  Login credential (raw):
    email: return.customer@test.com
    password: 123456
*/

DECLARE @CustomerEmail NVARCHAR(100) = N'return.customer@test.com';
DECLARE @CustomerPasswordHash NVARCHAR(255) = N'$2b$10$0.72huJ/MYfTBod2ipVFq.x4jfk5sKrsLZA4iPFLvmplE/vl8aLvO';
DECLARE @CustomerUserId INT;
DECLARE @CustomerRoleId INT;
DECLARE @VariantId1 INT;
DECLARE @VariantId2 INT;
DECLARE @OrderId INT;

-- Ensure role Customer exists
SELECT @CustomerRoleId = RoleId FROM Roles WHERE RoleName = N'Customer';
IF @CustomerRoleId IS NULL
BEGIN
  INSERT INTO Roles (RoleName) VALUES (N'Customer');
  SET @CustomerRoleId = SCOPE_IDENTITY();
END

-- Upsert customer user
SELECT @CustomerUserId = UserId FROM Users WHERE Email = @CustomerEmail;
IF @CustomerUserId IS NULL
BEGIN
  INSERT INTO Users (Email, PasswordHash, FullName, Phone, Status, CreatedAt, UpdatedAt)
  VALUES (@CustomerEmail, @CustomerPasswordHash, N'Return Test Customer', N'0900009999', N'Active', GETDATE(), GETDATE());
  SET @CustomerUserId = SCOPE_IDENTITY();
END
ELSE
BEGIN
  UPDATE Users
  SET PasswordHash = @CustomerPasswordHash,
      FullName = N'Return Test Customer',
      Status = N'Active',
      UpdatedAt = GETDATE()
  WHERE UserId = @CustomerUserId;
END

-- Ensure user has Customer role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @CustomerUserId AND RoleId = @CustomerRoleId)
BEGIN
  INSERT INTO UserRoles (UserId, RoleId) VALUES (@CustomerUserId, @CustomerRoleId);
END

-- Find variants for order items
SELECT TOP 1 @VariantId1 = VariantId FROM ProductVariants WHERE ISNULL(IsDeleted, 0) = 0 ORDER BY VariantId ASC;
SELECT TOP 1 @VariantId2 = VariantId FROM ProductVariants WHERE ISNULL(IsDeleted, 0) = 0 AND VariantId <> @VariantId1 ORDER BY VariantId DESC;

IF @VariantId1 IS NULL
BEGIN
  RAISERROR('No ProductVariants found. Please seed products first.', 16, 1);
  RETURN;
END

IF @VariantId2 IS NULL
BEGIN
  SET @VariantId2 = @VariantId1;
END

-- Create a delivered order for this customer (if not exists)
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = N'ORD-RETURN-TEST-0001')
BEGIN
  INSERT INTO Orders (
    UserId, OrderNumber, CustomerName, CustomerPhone,
    ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
    TotalAmount, Status, PaymentMethod, PaymentStatus, CreatedAt
  )
  VALUES (
    @CustomerUserId, N'ORD-RETURN-TEST-0001', N'Return Test Customer', N'0900009999',
    N'TP. Hồ Chí Minh', N'Quận 1', N'Phường Bến Nghé', N'123 Return Street',
    2500000, N'DELIVERED', N'COD', N'Unpaid', DATEADD(DAY, -2, GETDATE())
  );

  SET @OrderId = SCOPE_IDENTITY();

  INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
  VALUES
    (@OrderId, @VariantId1, N'Mock Product 1', N'MOCK-SKU-1', N'Black / M', 1000000, 2),
    (@OrderId, @VariantId2, N'Mock Product 2', N'MOCK-SKU-2', N'White / L', 500000, 1);

  INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
  VALUES
    (@OrderId, N'PENDING', DATEADD(DAY, -5, GETDATE())),
    (@OrderId, N'PROCESSING', DATEADD(DAY, -4, GETDATE())),
    (@OrderId, N'SHIPPING', DATEADD(DAY, -3, GETDATE())),
    (@OrderId, N'DELIVERED', DATEADD(DAY, -2, GETDATE()));
END
ELSE
BEGIN
  SELECT @OrderId = OrderId FROM Orders WHERE OrderNumber = N'ORD-RETURN-TEST-0001';

  UPDATE Orders
  SET UserId = @CustomerUserId,
      Status = N'DELIVERED',
      CreatedAt = DATEADD(DAY, -2, GETDATE())
  WHERE OrderId = @OrderId;

  IF NOT EXISTS (SELECT 1 FROM OrderStatusHistory WHERE OrderId = @OrderId AND Status = N'DELIVERED')
  BEGIN
    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES (@OrderId, N'DELIVERED', DATEADD(DAY, -2, GETDATE()));
  END
END

PRINT '=============================================';
PRINT 'RETURN FEATURE MOCK DATA READY';
PRINT 'Customer email: return.customer@test.com';
PRINT 'Customer password: 123456';
PRINT 'OrderNumber: ORD-RETURN-TEST-0001 (DELIVERED)';
PRINT '=============================================';

SELECT u.UserId, u.Email, u.FullName, u.Status FROM Users u WHERE u.UserId = @CustomerUserId;
SELECT o.OrderId, o.OrderNumber, o.UserId, o.Status, o.CreatedAt FROM Orders o WHERE o.OrderId = @OrderId;
SELECT oi.OrderItemId, oi.OrderId, oi.ProductName, oi.UnitPrice, oi.Quantity FROM OrderItems oi WHERE oi.OrderId = @OrderId;
