/* =============================================================
                 (PERFORMANCE OPTIMIZATION)
   ============================================================= */
GO

-- --- TỐI ƯU BẢNG USERS (Quan trọng cho tính năng Login/Ban) ---
-- Tăng tốc Login: Tìm Email và kiểm tra ngay Status có Active không
CREATE NONCLUSTERED INDEX IX_Users_Email_Status ON Users(Email, Status);
-- Tăng tốc Admin Dashboard: Lọc danh sách người dùng bị Ban
CREATE NONCLUSTERED INDEX IX_Users_Status ON Users(Status);
-- Tìm kiếm người dùng
CREATE NONCLUSTERED INDEX IX_Users_Phone ON Users(Phone);


-- --- TỐI ƯU BẢNG PRODUCTS ---
-- Tăng tốc lọc sản phẩm theo Danh mục và Thương hiệu
CREATE NONCLUSTERED INDEX IX_Products_CategoryId ON Products(CategoryId);
CREATE NONCLUSTERED INDEX IX_Products_BrandId ON Products(BrandId);

-- Tăng tốc tìm kiếm theo Tên sản phẩm và sắp xếp theo Giá
CREATE NONCLUSTERED INDEX IX_Products_Name ON Products(Name);
CREATE NONCLUSTERED INDEX IX_Products_BasePrice ON Products(BasePrice);
CREATE NONCLUSTERED INDEX IX_Products_Status ON Products(Status);


-- --- TỐI ƯU BẢNG PRODUCT VARIANTS ---
-- Tăng tốc khi JOIN từ Product sang Variant
CREATE NONCLUSTERED INDEX IX_ProductVariants_ProductId ON ProductVariants(ProductId);
-- Tăng tốc khi query tồn kho (Stock)
CREATE NONCLUSTERED INDEX IX_ProductVariants_StockQuantity ON ProductVariants(StockQuantity);


-- --- TỐI ƯU BẢNG ORDERS ---
-- Tăng tốc hiển thị "Đơn hàng của tôi"
CREATE NONCLUSTERED INDEX IX_Orders_UserId ON Orders(UserId);

-- Tăng tốc Dashboard thống kê
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);
CREATE NONCLUSTERED INDEX IX_Orders_Status ON Orders(Status);
CREATE NONCLUSTERED INDEX IX_Orders_OrderNumber ON Orders(OrderNumber);


-- --- TỐI ƯU BẢNG ORDER ITEMS ---
-- Tăng tốc khi xem "Chi tiết đơn hàng"
CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
CREATE NONCLUSTERED INDEX IX_OrderItems_VariantId ON OrderItems(VariantId);


-- --- TỐI ƯU CÁC BẢNG LIÊN KẾT KHÁC ---
-- Tăng tốc load Giỏ hàng
CREATE NONCLUSTERED INDEX IX_CartItems_CartId ON CartItems(CartId);

-- Tăng tốc hiển thị Review
CREATE NONCLUSTERED INDEX IX_Reviews_ProductId ON Reviews(ProductId);

-- Tăng tốc lọc biến thể theo thuộc tính
CREATE NONCLUSTERED INDEX IX_VariantAttributes_ValueId ON VariantAttributes(ValueId);
CREATE NONCLUSTERED INDEX IX_VariantAttributes_VariantId ON VariantAttributes(VariantId);

CREATE NONCLUSTERED INDEX IX_UserLogins_UserId ON UserLogins(UserId);

CREATE UNIQUE NONCLUSTERED INDEX UX_ProductImages_Primary
    ON ProductImages(ProductId)
    WHERE IsPrimary = 1;

GO
PRINT 'Indices Created Successfully! Database Optimized with User Status Support.';