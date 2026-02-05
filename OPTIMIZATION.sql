/* =============================================================
                 (PERFORMANCE OPTIMIZATION)
   ============================================================= */

USE AISTHEA;
GO

PRINT 'Starting index creation...';
GO

-- --- TỐI ƯU BẢNG USERS (Quan trọng cho tính năng Login/Ban) ---
-- Tăng tốc Login: Tìm Email và kiểm tra ngay Status có Active không
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email_Status' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_Email_Status ON Users(Email, Status);
    PRINT '✓ Created index: IX_Users_Email_Status';
END

-- Tăng tốc Admin Dashboard: Lọc danh sách người dùng bị Ban
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Status' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_Status ON Users(Status);
    PRINT '✓ Created index: IX_Users_Status';
END

-- Tìm kiếm người dùng
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Phone' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_Phone ON Users(Phone);
    PRINT '✓ Created index: IX_Users_Phone';
END

-- --- TỐI ƯU BẢNG PRODUCTS ---
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_CategoryId' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_CategoryId ON Products(CategoryId);
    PRINT '✓ Created index: IX_Products_CategoryId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_BrandId' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_BrandId ON Products(BrandId);
    PRINT '✓ Created index: IX_Products_BrandId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Name' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_Name ON Products(Name);
    PRINT '✓ Created index: IX_Products_Name';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_BasePrice' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_BasePrice ON Products(BasePrice);
    PRINT '✓ Created index: IX_Products_BasePrice';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Status' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_Status ON Products(Status);
    PRINT '✓ Created index: IX_Products_Status';
END

-- --- TỐI ƯU BẢNG PRODUCT VARIANTS ---
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_ProductId' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProductVariants_ProductId ON ProductVariants(ProductId);
    PRINT '✓ Created index: IX_ProductVariants_ProductId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_StockQuantity' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProductVariants_StockQuantity ON ProductVariants(StockQuantity);
    PRINT '✓ Created index: IX_ProductVariants_StockQuantity';
END

-- --- TỐI ƯU BẢNG ORDERS ---
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_UserId' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_UserId ON Orders(UserId);
    PRINT '✓ Created index: IX_Orders_UserId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_CreatedAt' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);
    PRINT '✓ Created index: IX_Orders_CreatedAt';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_Status' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_Status ON Orders(Status);
    PRINT '✓ Created index: IX_Orders_Status';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Orders_OrderNumber ON Orders(OrderNumber);
    PRINT '✓ Created index: IX_Orders_OrderNumber';
END

-- --- TỐI ƯU BẢNG ORDER ITEMS ---
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_OrderId' AND object_id = OBJECT_ID('OrderItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
    PRINT '✓ Created index: IX_OrderItems_OrderId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_VariantId' AND object_id = OBJECT_ID('OrderItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_OrderItems_VariantId ON OrderItems(VariantId);
    PRINT '✓ Created index: IX_OrderItems_VariantId';
END

-- --- TỐI ƯU CÁC BẢNG LIÊN KẾT KHÁC ---
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CartItems_CartId' AND object_id = OBJECT_ID('CartItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CartItems_CartId ON CartItems(CartId);
    PRINT '✓ Created index: IX_CartItems_CartId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Reviews_ProductId' AND object_id = OBJECT_ID('Reviews'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Reviews_ProductId ON Reviews(ProductId);
    PRINT '✓ Created index: IX_Reviews_ProductId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VariantAttributes_ValueId' AND object_id = OBJECT_ID('VariantAttributes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_ValueId ON VariantAttributes(ValueId);
    PRINT '✓ Created index: IX_VariantAttributes_ValueId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VariantAttributes_VariantId' AND object_id = OBJECT_ID('VariantAttributes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_VariantId ON VariantAttributes(VariantId);
    PRINT '✓ Created index: IX_VariantAttributes_VariantId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserLogins_UserId' AND object_id = OBJECT_ID('UserLogins'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserLogins_UserId ON UserLogins(UserId);
    PRINT '✓ Created index: IX_UserLogins_UserId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ProductImages_Primary' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_ProductImages_Primary
        ON ProductImages(ProductId)
        WHERE IsPrimary = 1;
    PRINT '✓ Created index: UX_ProductImages_Primary';
END

GO

PRINT '';
PRINT '========================================';
PRINT '✓ Index optimization complete!';
PRINT '  All indexes verified/created';
PRINT '  Database ready for production';
PRINT '========================================';
GO