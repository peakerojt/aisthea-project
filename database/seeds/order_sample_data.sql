/* =============================================================
   SAMPLE DATA - ORDER MANAGEMENT TESTING
   Database: AISTHEA (SQL Server)
   
   HƯỚNG DẪN:
   1. Chạy migration trước (thêm Note + OrderStatusHistory):
      Mở 01_schema.sql trong SSMS → chạy toàn bộ file
   2. Sau đó chạy file này để có data test

   Lưu ý: Script dùng MERGE để tránh duplicate khi chạy nhiều lần.
   ============================================================= */

USE AISTHEA;
GO

PRINT 'Inserting Order sample data...';
GO

/* ── STEP 1: Lấy UserId để gắn vào đơn hàng ───────────────────────────── */
-- Lấy UserId đầu tiên có sẵn (thường là admin/first user)
DECLARE @UserId INT = (SELECT TOP 1 UserId FROM Users ORDER BY UserId);

IF @UserId IS NULL
BEGIN
    PRINT '⚠ Không tìm thấy user. Sẽ tạo đơn hàng với UserId = NULL (khách lẻ).';
END
ELSE
BEGIN
    PRINT '✓ Sẽ dùng UserId = ' + CAST(@UserId AS NVARCHAR(10));
END

/* ── STEP 2: Lấy VariantId để gắn vào OrderItems ──────────────────────── */
DECLARE @VariantId1 INT = (SELECT TOP 1 VariantId FROM ProductVariants WHERE IsDeleted = 0 AND StockQuantity > 0 ORDER BY VariantId);
DECLARE @VariantId2 INT = (SELECT TOP 1 VariantId FROM ProductVariants WHERE IsDeleted = 0 AND VariantId != @VariantId1 ORDER BY VariantId DESC);

DECLARE @PName1 NVARCHAR(200) = ISNULL((
    SELECT TOP 1 p.Name FROM Products p
    JOIN ProductVariants pv ON p.ProductId = pv.ProductId
    WHERE pv.VariantId = @VariantId1
), N'Áo Oversize Premium');

DECLARE @PName2 NVARCHAR(200) = ISNULL((
    SELECT TOP 1 p.Name FROM Products p
    JOIN ProductVariants pv ON p.ProductId = pv.ProductId
    WHERE pv.VariantId = @VariantId2
), N'Quần Cargo Streetwear');

DECLARE @PSKU1 NVARCHAR(50) = ISNULL((SELECT TOP 1 SKU FROM ProductVariants WHERE VariantId = @VariantId1), 'SKU-TEST-001');
DECLARE @PSKU2 NVARCHAR(50) = ISNULL((SELECT TOP 1 SKU FROM ProductVariants WHERE VariantId = @VariantId2), 'SKU-TEST-002');
DECLARE @PPrice1 DECIMAL(18,2) = ISNULL((SELECT TOP 1 Price FROM ProductVariants WHERE VariantId = @VariantId1), 1500000);
DECLARE @PPrice2 DECIMAL(18,2) = ISNULL((SELECT TOP 1 Price FROM ProductVariants WHERE VariantId = @VariantId2), 890000);

PRINT '✓ Variant 1: ' + @PSKU1 + ' - ' + @PName1;
PRINT '✓ Variant 2: ' + @PSKU2 + ' - ' + @PName2;

/* ── STEP 3: Tạo 5 đơn hàng mẫu (mỗi trạng thái 1 đơn) ─────────────── */

-- Đơn 1: PENDING — Chờ xác nhận
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = 'ORD-TEST-0001')
BEGIN
    INSERT INTO Orders (
        UserId, OrderNumber, CustomerName, CustomerPhone,
        ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
        TotalAmount, Status, PaymentMethod, PaymentStatus, Note
    ) VALUES (
        @UserId, 'ORD-TEST-0001', N'Nguyễn Văn An', '0901234567',
        N'TP. Hồ Chí Minh', N'Quận 1', N'Phường Bến Nghé', N'123 Đường Lê Lợi',
        @PPrice1 * 2 + @PPrice2, 'PENDING', 'COD', 'Unpaid', NULL
    );
    DECLARE @OId1 INT = SCOPE_IDENTITY();

    INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
    VALUES
        (@OId1, @VariantId1, @PName1, @PSKU1, N'Đen / XL', @PPrice1, 2),
        (@OId1, @VariantId2, @PName2, @PSKU2, N'Be / M',   @PPrice2, 1);

    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES (@OId1, 'PENDING', DATEADD(HOUR, -5, GETDATE()));

    PRINT '✓ Created ORD-TEST-0001 (PENDING)';
END

-- Đơn 2: PROCESSING — Đang chuẩn bị
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = 'ORD-TEST-0002')
BEGIN
    INSERT INTO Orders (
        UserId, OrderNumber, CustomerName, CustomerPhone,
        ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
        TotalAmount, Status, PaymentMethod, PaymentStatus, Note
    ) VALUES (
        @UserId, 'ORD-TEST-0002', N'Trần Thị Bình', '0912345678',
        N'Hà Nội', N'Cầu Giấy', N'Phường Dịch Vọng', N'45 Đường Xuân Thủy',
        @PPrice2 * 3, 'PROCESSING', 'Banking', 'Paid', N'Giao giờ hành chính'
    );
    DECLARE @OId2 INT = SCOPE_IDENTITY();

    INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
    VALUES (@OId2, @VariantId2, @PName2, @PSKU2, N'Xanh Navy / L', @PPrice2, 3);

    INSERT INTO Payments (OrderId, PaymentMethod, Amount, Status, TransactionCode)
    VALUES (@OId2, 'Banking', @PPrice2 * 3, 'Completed', 'TXN20260226001');

    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES
        (@OId2, 'PENDING',    DATEADD(HOUR, -24, GETDATE())),
        (@OId2, 'PROCESSING', DATEADD(HOUR,  -2, GETDATE()));

    PRINT '✓ Created ORD-TEST-0002 (PROCESSING)';
END

-- Đơn 3: SHIPPING — Đang giao hàng
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = 'ORD-TEST-0003')
BEGIN
    INSERT INTO Orders (
        UserId, OrderNumber, CustomerName, CustomerPhone,
        ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
        TotalAmount, Status, PaymentMethod, PaymentStatus,
        TrackingNumber, Carrier, Note
    ) VALUES (
        @UserId, 'ORD-TEST-0003', N'Lê Minh Cường', '0923456789',
        N'Đà Nẵng', N'Hải Châu', N'Phường Hải Châu 1', N'78 Đường Hùng Vương',
        @PPrice1 + @PPrice2 * 2, 'SHIPPING', 'COD', 'Unpaid',
        'GHN123456789VN', 'Giao Hàng Nhanh', NULL
    );
    DECLARE @OId3 INT = SCOPE_IDENTITY();

    INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
    VALUES
        (@OId3, @VariantId1, @PName1, @PSKU1, N'Trắng / S', @PPrice1, 1),
        (@OId3, @VariantId2, @PName2, @PSKU2, N'Đen / M',   @PPrice2, 2);

    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES
        (@OId3, 'PENDING',    DATEADD(DAY, -3, GETDATE())),
        (@OId3, 'PROCESSING', DATEADD(DAY, -2, GETDATE())),
        (@OId3, 'SHIPPING',   DATEADD(HOUR, -6, GETDATE()));

    PRINT '✓ Created ORD-TEST-0003 (SHIPPING)';
END

-- Đơn 4: COMPLETED — Giao thành công
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = 'ORD-TEST-0004')
BEGIN
    INSERT INTO Orders (
        UserId, OrderNumber, CustomerName, CustomerPhone,
        ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
        TotalAmount, Status, PaymentMethod, PaymentStatus,
        TrackingNumber, Carrier
    ) VALUES (
        @UserId, 'ORD-TEST-0004', N'Phạm Thị Dung', '0934567890',
        N'TP. Hồ Chí Minh', N'Quận 3', N'Phường 12', N'22 Đường Võ Văn Tần',
        @PPrice1 * 3, 'COMPLETED', 'Banking', 'Paid',
        'JT123456789VN', 'J&T Express'
    );
    DECLARE @OId4 INT = SCOPE_IDENTITY();

    INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
    VALUES (@OId4, @VariantId1, @PName1, @PSKU1, N'Nâu / XXL', @PPrice1, 3);

    INSERT INTO Payments (OrderId, PaymentMethod, Amount, Status, TransactionCode, PaymentDate)
    VALUES (@OId4, 'Banking', @PPrice1 * 3, 'Completed', 'TXN20260225001', DATEADD(DAY, -5, GETDATE()));

    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES
        (@OId4, 'PENDING',    DATEADD(DAY, -7, GETDATE())),
        (@OId4, 'PROCESSING', DATEADD(DAY, -6, GETDATE())),
        (@OId4, 'SHIPPING',   DATEADD(DAY, -5, GETDATE())),
        (@OId4, 'COMPLETED',  DATEADD(DAY, -3, GETDATE()));

    PRINT '✓ Created ORD-TEST-0004 (COMPLETED)';
END

-- Đơn 5: CANCELLED — Đã hủy (có lý do)
IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderNumber = 'ORD-TEST-0005')
BEGIN
    INSERT INTO Orders (
        UserId, OrderNumber, CustomerName, CustomerPhone,
        ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
        TotalAmount, Status, PaymentMethod, PaymentStatus, Note
    ) VALUES (
        @UserId, 'ORD-TEST-0005', N'Hoàng Văn Em', '0945678901',
        N'Hà Nội', N'Đống Đa', N'Phường Ô Chợ Dừa', N'99 Đường Nguyễn Lương Bằng',
        @PPrice1 + @PPrice2, 'CANCELLED', 'COD', 'Unpaid',
        N'Khách hàng hủy vì đặt nhầm size'
    );
    DECLARE @OId5 INT = SCOPE_IDENTITY();

    INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, UnitPrice, Quantity)
    VALUES
        (@OId5, @VariantId1, @PName1, @PSKU1, N'Đen / M', @PPrice1, 1),
        (@OId5, @VariantId2, @PName2, @PSKU2, N'Be / S',  @PPrice2, 1);

    INSERT INTO OrderStatusHistory (OrderId, Status, ChangedAt)
    VALUES
        (@OId5, 'PENDING',   DATEADD(DAY, -1, GETDATE())),
        (@OId5, 'CANCELLED', DATEADD(HOUR, -3, GETDATE()));

    PRINT '✓ Created ORD-TEST-0005 (CANCELLED)';
END

/* ── STEP 4: Kết quả ──────────────────────────────────────────────────── */
PRINT '';
PRINT '========================================'
PRINT 'ORDER SAMPLE DATA INSERTED SUCCESSFULLY'
PRINT '========================================';

SELECT
    o.OrderNumber,
    o.CustomerName,
    o.CustomerPhone,
    o.Status,
    CAST(o.TotalAmount AS NVARCHAR(30)) AS TotalAmount,
    o.PaymentMethod,
    o.PaymentStatus,
    COUNT(oi.OrderItemId) AS ItemCount
FROM Orders o
LEFT JOIN OrderItems oi ON o.OrderId = oi.OrderId
WHERE o.OrderNumber LIKE 'ORD-TEST-%'
GROUP BY o.OrderNumber, o.CustomerName, o.CustomerPhone,
         o.Status, o.TotalAmount, o.PaymentMethod, o.PaymentStatus
ORDER BY o.OrderNumber;
GO
