/* =============================================================
                 (PERFORMANCE OPTIMIZATION)
   ============================================================= */
GO

-- --- TỐI ƯU BẢNG PRODUCTS ---
-- Tăng tốc lọc sản phẩm theo Danh mục và Thương hiệu (Rất hay dùng ở trang Home/Shop)
CREATE NONCLUSTERED INDEX IX_Products_CategoryId ON Products(CategoryId);
CREATE NONCLUSTERED INDEX IX_Products_BrandId ON Products(BrandId);

-- Tăng tốc tìm kiếm theo Tên sản phẩm và sắp xếp theo Giá
CREATE NONCLUSTERED INDEX IX_Products_Name ON Products(Name);
CREATE NONCLUSTERED INDEX IX_Products_BasePrice ON Products(BasePrice);
CREATE NONCLUSTERED INDEX IX_Products_Status ON Products(Status); -- Admin lọc sản phẩm Active

-- --- TỐI ƯU BẢNG PRODUCT VARIANTS ---
-- Tăng tốc khi JOIN từ Product sang Variant để lấy giá/số lượng
CREATE NONCLUSTERED INDEX IX_ProductVariants_ProductId ON ProductVariants(ProductId);
-- Tăng tốc khi query tồn kho (Stock) để check "Còn hàng" hay không
CREATE NONCLUSTERED INDEX IX_ProductVariants_StockQuantity ON ProductVariants(StockQuantity);

-- --- TỐI ƯU BẢNG ORDERS ---
-- Tăng tốc hiển thị "Đơn hàng của tôi" (My Orders)
CREATE NONCLUSTERED INDEX IX_Orders_UserId ON Orders(UserId);

-- Tăng tốc Dashboard thống kê: Tìm đơn theo Ngày tạo và Trạng thái
CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt ON Orders(CreatedAt);
CREATE NONCLUSTERED INDEX IX_Orders_Status ON Orders(Status);
CREATE NONCLUSTERED INDEX IX_Orders_OrderNumber ON Orders(OrderNumber); -- Hỗ trợ tìm nhanh mã đơn

-- --- TỐI ƯU BẢNG ORDER ITEMS ---
-- Cực kỳ quan trọng: Tăng tốc khi xem "Chi tiết đơn hàng" (JOIN Order -> OrderItems)
CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
CREATE NONCLUSTERED INDEX IX_OrderItems_VariantId ON OrderItems(VariantId);

-- --- TỐI ƯU CÁC BẢNG LIÊN KẾT KHÁC ---
-- Tăng tốc load Giỏ hàng
CREATE NONCLUSTERED INDEX IX_CartItems_CartId ON CartItems(CartId);

-- Tăng tốc hiển thị Review ở trang chi tiết sản phẩm
CREATE NONCLUSTERED INDEX IX_Reviews_ProductId ON Reviews(ProductId);

-- Tăng tốc tìm kiếm User (Admin search user)
CREATE NONCLUSTERED INDEX IX_Users_Email ON Users(Email); -- Email thường là Unique nên đã có index ngầm, nhưng khai báo thêm cũng không sao
CREATE NONCLUSTERED INDEX IX_Users_Phone ON Users(Phone);

-- Tăng tốc lọc biến thể theo thuộc tính (Ví dụ: Lọc tất cả áo màu Đỏ)
CREATE NONCLUSTERED INDEX IX_VariantAttributes_ValueId ON VariantAttributes(ValueId);
CREATE NONCLUSTERED INDEX IX_VariantAttributes_VariantId ON VariantAttributes(VariantId);

CREATE UNIQUE NONCLUSTERED INDEX UX_ProductImages_Primary
ON ProductImages(ProductId)
WHERE IsPrimary = 1;

GO
PRINT 'Indices Created Successfully! Database Optimized.';