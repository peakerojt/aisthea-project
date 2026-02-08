/* =============================================================
   PROJECT: AISTHEA
   FILE: seed-data.sql
   DESCRIPTION: Mock Data for Fashion E-commerce Platform
   VERSION: 1.0
   CREATED: 2026-02-08
   
   EXECUTION ORDER:
   1. Roles & Brands
   2. Attributes & AttributeValues (Size, Color)
   3. Categories
   4. Products
   5. ProductVariants
   6. VariantAttributes
   7. ProductImages
   ============================================================= */

USE AISTHEA;
GO

PRINT '========================================'
PRINT '🌱 Starting AISTHEA Seed Data Import'
PRINT '========================================'
GO

/* =============================================================
   CLEANUP - Delete existing seed data (to allow re-running)
   Order: Reverse of creation (children first)
   ============================================================= */

PRINT ''
PRINT '🧹 Cleaning up existing seed data...'
GO

-- Delete product-related data
DELETE FROM VariantAttributes WHERE VariantId IN (SELECT VariantId FROM ProductVariants WHERE ProductId IN (SELECT ProductId FROM Products WHERE Slug LIKE 'aisthea-%'));
DELETE FROM ProductImages WHERE ProductId IN (SELECT ProductId FROM Products WHERE Slug LIKE 'aisthea-%');
DELETE FROM ProductVariants WHERE ProductId IN (SELECT ProductId FROM Products WHERE Slug LIKE 'aisthea-%');
DELETE FROM Products WHERE Slug LIKE 'aisthea-%';

-- Delete categories (seeded ones)
DELETE FROM Categories WHERE Slug IN ('nam', 'nu', 'phu-kien', 'bo-suu-tap-thu-dong', 'ao-so-mi-nam', 'quan-au-nam', 'dam-nu', 'ao-khoac');

-- Delete attribute values & attributes (seeded ones)
DELETE FROM AttributeValues WHERE AttributeId IN (SELECT AttributeId FROM Attributes WHERE Name IN (N'Size', N'Màu sắc'));
DELETE FROM Attributes WHERE Name IN (N'Size', N'Màu sắc');

-- Delete brand (seeded)
DELETE FROM Brands WHERE Name = N'AISTHEA';

-- Delete roles (if not exists)
DELETE FROM Roles WHERE RoleName IN ('Admin', 'Customer', 'Staff');

PRINT '✓ Cleanup completed!'
GO

/* =============================================================
   LEVEL 0: ROLES & BRANDS
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Roles...'
GO

-- Insert Roles
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Admin')
    INSERT INTO Roles (RoleName) VALUES ('Admin');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Customer')
    INSERT INTO Roles (RoleName) VALUES ('Customer');

IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Staff')
    INSERT INTO Roles (RoleName) VALUES ('Staff');

PRINT '✓ Roles inserted!'
GO

PRINT ''
PRINT '📦 Inserting Brand AISTHEA...'
GO

-- Insert AISTHEA Brand
SET IDENTITY_INSERT Brands ON;
INSERT INTO Brands (BrandId, Name, Description)
VALUES (1, N'AISTHEA', N'Thương hiệu thời trang cao cấp Việt Nam - Phong cách hiện đại, chất lượng vượt trội');
SET IDENTITY_INSERT Brands OFF;

PRINT '✓ Brand AISTHEA inserted!'
GO

/* =============================================================
   LEVEL 0: ATTRIBUTES (Size & Color)
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Attributes...'
GO

-- Insert Attributes
SET IDENTITY_INSERT Attributes ON;
INSERT INTO Attributes (AttributeId, Name) VALUES (1, N'Size');
INSERT INTO Attributes (AttributeId, Name) VALUES (2, N'Màu sắc');
SET IDENTITY_INSERT Attributes OFF;

PRINT '✓ Attributes inserted!'
GO

PRINT ''
PRINT '📦 Inserting Attribute Values...'
GO

-- Insert Size Values
SET IDENTITY_INSERT AttributeValues ON;
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (1, 1, N'S');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (2, 1, N'M');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (3, 1, N'L');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (4, 1, N'XL');

-- Insert Color Values
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (5, 2, N'Đen');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (6, 2, N'Trắng');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (7, 2, N'Be');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (8, 2, N'Navy');
INSERT INTO AttributeValues (ValueId, AttributeId, Value) VALUES (9, 2, N'Xám');
SET IDENTITY_INSERT AttributeValues OFF;

PRINT '✓ Attribute Values inserted!'
GO

/* =============================================================
   LEVEL 1: CATEGORIES
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Categories...'
GO

-- Insert Parent Categories
SET IDENTITY_INSERT Categories ON;

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (1, NULL, N'Nam', N'nam', N'Thời trang nam cao cấp AISTHEA - Phong cách lịch lãm, hiện đại');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (2, NULL, N'Nữ', N'nu', N'Thời trang nữ AISTHEA - Thanh lịch, quyến rũ');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (3, NULL, N'Phụ kiện', N'phu-kien', N'Phụ kiện thời trang cao cấp - Điểm nhấn hoàn hảo');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (4, NULL, N'Bộ sưu tập Thu Đông', N'bo-suu-tap-thu-dong', N'BST Thu Đông 2026 - Ấm áp trong phong cách');

-- Insert Child Categories
INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (5, 1, N'Áo sơ mi Nam', N'ao-so-mi-nam', N'Áo sơ mi nam cao cấp - Chất liệu cao cấp, form chuẩn');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (6, 1, N'Quần âu Nam', N'quan-au-nam', N'Quần âu nam - Đường may sắc sảo, ôm dáng hoàn hảo');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (7, 2, N'Đầm Nữ', N'dam-nu', N'Đầm nữ thanh lịch - Tôn dáng quyến rũ');

INSERT INTO Categories (CategoryId, ParentId, Name, Slug, Description)
VALUES (8, 4, N'Áo khoác', N'ao-khoac', N'Áo khoác Thu Đông - Ấm áp mà vẫn thời thượng');

SET IDENTITY_INSERT Categories OFF;

PRINT '✓ Categories inserted!'
GO

/* =============================================================
   LEVEL 2: PRODUCTS (10 Parent Products)
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Products...'
GO

SET IDENTITY_INSERT Products ON;

-- Product 1: Áo sơ mi lụa Signature
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (1, 5, 1, 
    N'Áo Sơ Mi Lụa AISTHEA Signature', 
    N'aisthea-ao-so-mi-lua-signature',
    N'Áo sơ mi lụa cao cấp từ BST Signature của AISTHEA. Được làm từ 100% lụa tơ tằm Bảo Lộc, mang đến cảm giác mềm mại, thoáng mát tuyệt đối. Đường may tinh tế, cổ áo cứng cáp giúp bạn tự tin trong mọi cuộc gặp gỡ quan trọng.',
    1490000.00, 'Active', 0, GETDATE());

-- Product 2: Quần âu Slimfit Premium
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (2, 6, 1,
    N'Quần Âu Slimfit Premium AISTHEA',
    N'aisthea-quan-au-slimfit-premium',
    N'Quần âu nam cao cấp với phom Slimfit hiện đại, tôn dáng nam tính. Chất liệu vải Wool pha Cashmere nhập khẩu Italia, co giãn nhẹ, không nhăn. Hoàn hảo cho cả môi trường công sở lẫn các sự kiện sang trọng.',
    1290000.00, 'Active', 0, GETDATE());

-- Product 3: Áo Polo Classic
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (3, 1, 1,
    N'Áo Polo Classic AISTHEA',
    N'aisthea-ao-polo-classic',
    N'Áo Polo nam dòng Classic với thiết kế cổ bẻ thanh lịch. Chất liệu Cotton Pima 100% cao cấp, thấm hút mồ hôi tốt, form Regular Fit thoải mái. Logo AISTHEA thêu tinh xảo tại ngực trái.',
    890000.00, 'Active', 0, GETDATE());

-- Product 4: Đầm Cocktail Luminous
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (4, 7, 1,
    N'Đầm Cocktail Luminous AISTHEA',
    N'aisthea-dam-cocktail-luminous',
    N'Đầm cocktail sang trọng từ BST Luminous - Tỏa sáng trong mọi bữa tiệc. Thiết kế xếp ly tinh tế, chất liệu Satin cao cấp, tôn đường cong quyến rũ. Phù hợp cho các buổi tiệc tối, sự kiện thời trang.',
    1890000.00, 'Active', 0, GETDATE());

-- Product 5: Áo Blazer Modern Fit
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (5, 8, 1,
    N'Áo Blazer Modern Fit AISTHEA',
    N'aisthea-ao-blazer-modern-fit',
    N'Áo blazer nam phom Modern Fit - Sự kết hợp hoàn hảo giữa cổ điển và hiện đại. Vải Tweed cao cấp, lót trong 100% lụa, nút sừng tự nhiên. Món item must-have cho Gentleman đích thực.',
    1990000.00, 'Active', 0, GETDATE());

-- Product 6: Áo Len Cashmere Warm Touch
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (6, 8, 1,
    N'Áo Len Cashmere Warm Touch AISTHEA',
    N'aisthea-ao-len-cashmere-warm-touch',
    N'Áo len Cashmere cao cấp từ BST Thu Đông. 80% Cashmere + 20% Silk mang đến sự ấm áp mà vẫn nhẹ nhàng. Thiết kế cổ tròn thanh lịch, phù hợp layer cùng áo sơ mi hoặc mặc đơn.',
    1790000.00, 'Active', 0, GETDATE());

-- Product 7: Chân Váy Midi Elegant
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (7, 2, 1,
    N'Chân Váy Midi Elegant AISTHEA',
    N'aisthea-chan-vay-midi-elegant',
    N'Chân váy midi thanh lịch dành cho phái đẹp. Chất liệu vải Crepe cao cấp, rủ nhẹ, tạo dáng A-line tôn vòng eo. Phối được nhiều kiểu áo từ công sở đến dạo phố.',
    990000.00, 'Active', 0, GETDATE());

-- Product 8: Áo Blouse Silk Romance
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (8, 2, 1,
    N'Áo Blouse Silk Romance AISTHEA',
    N'aisthea-ao-blouse-silk-romance',
    N'Áo blouse nữ lụa tơ tằm từ BST Romance. Thiết kế cổ V thanh thoát, tay áo bèo nhẹ nhàng nữ tính. Màu sắc pastel dịu dàng, phù hợp cho các quý cô thanh lịch.',
    1190000.00, 'Active', 0, GETDATE());

-- Product 9: Thắt Lưng Da Premium
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (9, 3, 1,
    N'Thắt Lưng Da Premium AISTHEA',
    N'aisthea-that-lung-da-premium',
    N'Thắt lưng da bò thật 100% cao cấp. Khóa kim loại mạ vàng sang trọng với logo AISTHEA tinh xảo. Bản rộng 3.5cm phù hợp cả quần âu lẫn quần jean. Bền đẹp theo thời gian.',
    590000.00, 'Active', 0, GETDATE());

-- Product 10: Khăn Choàng Cashmere
INSERT INTO Products (ProductId, CategoryId, BrandId, Name, Slug, Description, BasePrice, Status, IsDeleted, CreatedAt)
VALUES (10, 3, 1,
    N'Khăn Choàng Cashmere Deluxe AISTHEA',
    N'aisthea-khan-choang-cashmere-deluxe',
    N'Khăn choàng Cashmere cao cấp nhập khẩu Mongolia. Mềm mại, ấm áp, nhẹ như hơi sương. Kích thước 200x70cm, đủ để quấn nhiều kiểu. Item hoàn hảo cho mùa Thu Đông.',
    890000.00, 'Active', 0, GETDATE());

SET IDENTITY_INSERT Products OFF;

PRINT '✓ 10 Products inserted!'
GO

/* =============================================================
   LEVEL 3: PRODUCT VARIANTS (3-5 per product = Size x Color)
   Using random stock quantities 5-50
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Product Variants...'
GO

SET IDENTITY_INSERT ProductVariants ON;

DECLARE @VariantId INT = 1;

-- ============================================
-- Product 1: Áo Sơ Mi Lụa Signature (5 variants)
-- Sizes: S, M, L, XL | Colors: Trắng, Be
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (1, 1, N'AISTHEA-SMLS-S-WHITE', 1490000.00, 25, 0, 0),
    (2, 1, N'AISTHEA-SMLS-M-WHITE', 1490000.00, 30, 1, 0),
    (3, 1, N'AISTHEA-SMLS-L-WHITE', 1490000.00, 28, 0, 0),
    (4, 1, N'AISTHEA-SMLS-M-BEIGE', 1490000.00, 22, 0, 0),
    (5, 1, N'AISTHEA-SMLS-L-BEIGE', 1490000.00, 18, 0, 0);

-- ============================================
-- Product 2: Quần Âu Slimfit Premium (5 variants)
-- Sizes: M, L, XL | Colors: Đen, Navy, Xám
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (6, 2, N'AISTHEA-QASP-M-BLACK', 1290000.00, 35, 1, 0),
    (7, 2, N'AISTHEA-QASP-L-BLACK', 1290000.00, 40, 0, 0),
    (8, 2, N'AISTHEA-QASP-XL-BLACK', 1290000.00, 20, 0, 0),
    (9, 2, N'AISTHEA-QASP-M-NAVY', 1290000.00, 25, 0, 0),
    (10, 2, N'AISTHEA-QASP-L-GREY', 1290000.00, 15, 0, 0);

-- ============================================
-- Product 3: Áo Polo Classic (4 variants)
-- Sizes: S, M, L, XL | Colors: Đen, Trắng
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (11, 3, N'AISTHEA-APC-S-BLACK', 890000.00, 45, 0, 0),
    (12, 3, N'AISTHEA-APC-M-BLACK', 890000.00, 50, 1, 0),
    (13, 3, N'AISTHEA-APC-L-WHITE', 890000.00, 38, 0, 0),
    (14, 3, N'AISTHEA-APC-XL-WHITE', 890000.00, 28, 0, 0);

-- ============================================
-- Product 4: Đầm Cocktail Luminous (4 variants)
-- Sizes: S, M, L | Colors: Đen, Be
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (15, 4, N'AISTHEA-DCL-S-BLACK', 1890000.00, 12, 0, 0),
    (16, 4, N'AISTHEA-DCL-M-BLACK', 1890000.00, 18, 1, 0),
    (17, 4, N'AISTHEA-DCL-S-BEIGE', 1890000.00, 10, 0, 0),
    (18, 4, N'AISTHEA-DCL-M-BEIGE', 1890000.00, 14, 0, 0);

-- ============================================
-- Product 5: Áo Blazer Modern Fit (5 variants)
-- Sizes: M, L, XL | Colors: Đen, Navy, Xám
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (19, 5, N'AISTHEA-ABM-M-BLACK', 1990000.00, 15, 1, 0),
    (20, 5, N'AISTHEA-ABM-L-BLACK', 1990000.00, 20, 0, 0),
    (21, 5, N'AISTHEA-ABM-XL-NAVY', 1990000.00, 12, 0, 0),
    (22, 5, N'AISTHEA-ABM-M-GREY', 1990000.00, 18, 0, 0),
    (23, 5, N'AISTHEA-ABM-L-GREY', 1990000.00, 22, 0, 0);

-- ============================================
-- Product 6: Áo Len Cashmere Warm Touch (4 variants)
-- Sizes: S, M, L, XL | Colors: Be
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (24, 6, N'AISTHEA-ALC-S-BEIGE', 1790000.00, 20, 0, 0),
    (25, 6, N'AISTHEA-ALC-M-BEIGE', 1790000.00, 25, 1, 0),
    (26, 6, N'AISTHEA-ALC-L-BEIGE', 1790000.00, 22, 0, 0),
    (27, 6, N'AISTHEA-ALC-XL-BEIGE', 1790000.00, 15, 0, 0);

-- ============================================
-- Product 7: Chân Váy Midi Elegant (3 variants)
-- Sizes: S, M, L | Colors: Đen
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (28, 7, N'AISTHEA-CVE-S-BLACK', 990000.00, 30, 0, 0),
    (29, 7, N'AISTHEA-CVE-M-BLACK', 990000.00, 35, 1, 0),
    (30, 7, N'AISTHEA-CVE-L-BLACK', 990000.00, 25, 0, 0);

-- ============================================
-- Product 8: Áo Blouse Silk Romance (5 variants)
-- Sizes: S, M, L | Colors: Trắng, Be
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (31, 8, N'AISTHEA-ABS-S-WHITE', 1190000.00, 28, 0, 0),
    (32, 8, N'AISTHEA-ABS-M-WHITE', 1190000.00, 32, 1, 0),
    (33, 8, N'AISTHEA-ABS-L-WHITE', 1190000.00, 24, 0, 0),
    (34, 8, N'AISTHEA-ABS-S-BEIGE', 1190000.00, 20, 0, 0),
    (35, 8, N'AISTHEA-ABS-M-BEIGE', 1190000.00, 26, 0, 0);

-- ============================================
-- Product 9: Thắt Lưng Da Premium (3 variants - One Size)
-- Colors: Đen, Be, Navy
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (36, 9, N'AISTHEA-TLD-OS-BLACK', 590000.00, 50, 1, 0),
    (37, 9, N'AISTHEA-TLD-OS-BEIGE', 590000.00, 35, 0, 0),
    (38, 9, N'AISTHEA-TLD-OS-NAVY', 590000.00, 28, 0, 0);

-- ============================================
-- Product 10: Khăn Choàng Cashmere (4 variants - One Size)
-- Colors: Đen, Trắng, Be, Xám
-- ============================================
INSERT INTO ProductVariants (VariantId, ProductId, SKU, Price, StockQuantity, IsDefault, IsDeleted)
VALUES 
    (39, 10, N'AISTHEA-KCC-OS-BLACK', 890000.00, 30, 0, 0),
    (40, 10, N'AISTHEA-KCC-OS-WHITE', 890000.00, 25, 0, 0),
    (41, 10, N'AISTHEA-KCC-OS-BEIGE', 890000.00, 35, 1, 0),
    (42, 10, N'AISTHEA-KCC-OS-GREY', 890000.00, 20, 0, 0);

SET IDENTITY_INSERT ProductVariants OFF;

PRINT '✓ 42 Product Variants inserted!'
GO

/* =============================================================
   LEVEL 4: VARIANT ATTRIBUTES (Size + Color for each variant)
   AttributeValue IDs:
   - Size: 1=S, 2=M, 3=L, 4=XL
   - Color: 5=Đen, 6=Trắng, 7=Be, 8=Navy, 9=Xám
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Variant Attributes...'
GO

-- Product 1: Áo Sơ Mi Lụa Signature
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (1, 1), (1, 6),   -- S, Trắng
    (2, 2), (2, 6),   -- M, Trắng
    (3, 3), (3, 6),   -- L, Trắng
    (4, 2), (4, 7),   -- M, Be
    (5, 3), (5, 7);   -- L, Be

-- Product 2: Quần Âu Slimfit Premium
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (6, 2), (6, 5),   -- M, Đen
    (7, 3), (7, 5),   -- L, Đen
    (8, 4), (8, 5),   -- XL, Đen
    (9, 2), (9, 8),   -- M, Navy
    (10, 3), (10, 9); -- L, Xám

-- Product 3: Áo Polo Classic
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (11, 1), (11, 5),  -- S, Đen
    (12, 2), (12, 5),  -- M, Đen
    (13, 3), (13, 6),  -- L, Trắng
    (14, 4), (14, 6);  -- XL, Trắng

-- Product 4: Đầm Cocktail Luminous
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (15, 1), (15, 5),  -- S, Đen
    (16, 2), (16, 5),  -- M, Đen
    (17, 1), (17, 7),  -- S, Be
    (18, 2), (18, 7);  -- M, Be

-- Product 5: Áo Blazer Modern Fit
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (19, 2), (19, 5),  -- M, Đen
    (20, 3), (20, 5),  -- L, Đen
    (21, 4), (21, 8),  -- XL, Navy
    (22, 2), (22, 9),  -- M, Xám
    (23, 3), (23, 9);  -- L, Xám

-- Product 6: Áo Len Cashmere Warm Touch
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (24, 1), (24, 7),  -- S, Be
    (25, 2), (25, 7),  -- M, Be
    (26, 3), (26, 7),  -- L, Be
    (27, 4), (27, 7);  -- XL, Be

-- Product 7: Chân Váy Midi Elegant
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (28, 1), (28, 5),  -- S, Đen
    (29, 2), (29, 5),  -- M, Đen
    (30, 3), (30, 5);  -- L, Đen

-- Product 8: Áo Blouse Silk Romance
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (31, 1), (31, 6),  -- S, Trắng
    (32, 2), (32, 6),  -- M, Trắng
    (33, 3), (33, 6),  -- L, Trắng
    (34, 1), (34, 7),  -- S, Be
    (35, 2), (35, 7);  -- M, Be

-- Product 9: Thắt Lưng Da Premium (One Size only - no size attribute)
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (36, 5),  -- Đen
    (37, 7),  -- Be
    (38, 8);  -- Navy

-- Product 10: Khăn Choàng Cashmere (One Size only - no size attribute)
INSERT INTO VariantAttributes (VariantId, ValueId) VALUES
    (39, 5),  -- Đen
    (40, 6),  -- Trắng
    (41, 7),  -- Be
    (42, 9);  -- Xám

PRINT '✓ Variant Attributes inserted!'
GO

/* =============================================================
   LEVEL 4: PRODUCT IMAGES
   Using Unsplash placeholder URLs with color-specific images
   ============================================================= */

PRINT ''
PRINT '📦 Inserting Product Images...'
GO

SET IDENTITY_INSERT ProductImages ON;

-- ============================================
-- Product 1: Áo Sơ Mi Lụa Signature (White & Beige)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (1, 1, NULL, 
     N'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 
     N'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&q=80', 1),
    (2, 1, 1, 
     N'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80', 
     N'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300&q=80', 0),
    (3, 1, 4, 
     N'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80', 
     N'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80', 0);

-- ============================================
-- Product 2: Quần Âu Slimfit Premium (Black, Navy, Grey)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (4, 2, NULL, 
     N'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', 
     N'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&q=80', 1),
    (5, 2, 6, 
     N'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80', 
     N'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&q=80', 0),
    (6, 2, 9, 
     N'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80', 
     N'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&q=80', 0);

-- ============================================
-- Product 3: Áo Polo Classic (Black & White)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (7, 3, NULL, 
     N'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80', 
     N'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=300&q=80', 1),
    (8, 3, 11, 
     N'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80', 
     N'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&q=80', 0),
    (9, 3, 13, 
     N'https://images.unsplash.com/photo-1625910513413-5fc45f5c1f93?w=800&q=80', 
     N'https://images.unsplash.com/photo-1625910513413-5fc45f5c1f93?w=300&q=80', 0);

-- ============================================
-- Product 4: Đầm Cocktail Luminous (Black & Beige)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (10, 4, NULL, 
     N'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', 
     N'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&q=80', 1),
    (11, 4, 15, 
     N'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', 
     N'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=300&q=80', 0),
    (12, 4, 17, 
     N'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80', 
     N'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&q=80', 0);

-- ============================================
-- Product 5: Áo Blazer Modern Fit (Black, Navy, Grey)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (13, 5, NULL, 
     N'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=80', 
     N'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=300&q=80', 1),
    (14, 5, 19, 
     N'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', 
     N'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=80', 0),
    (15, 5, 21, 
     N'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', 
     N'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&q=80', 0);

-- ============================================
-- Product 6: Áo Len Cashmere Warm Touch (Beige)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (16, 6, NULL, 
     N'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80', 
     N'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&q=80', 1),
    (17, 6, 25, 
     N'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80', 
     N'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&q=80', 0);

-- ============================================
-- Product 7: Chân Váy Midi Elegant (Black)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (18, 7, NULL, 
     N'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80', 
     N'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=300&q=80', 1),
    (19, 7, 29, 
     N'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80', 
     N'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=300&q=80', 0);

-- ============================================
-- Product 8: Áo Blouse Silk Romance (White & Beige)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (20, 8, NULL, 
     N'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80', 
     N'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=300&q=80', 1),
    (21, 8, 31, 
     N'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80', 
     N'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=300&q=80', 0),
    (22, 8, 34, 
     N'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80', 
     N'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300&q=80', 0);

-- ============================================
-- Product 9: Thắt Lưng Da Premium (Black, Beige, Navy)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (23, 9, NULL, 
     N'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 
     N'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80', 1),
    (24, 9, 36, 
     N'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80', 
     N'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=300&q=80', 0),
    (25, 9, 37, 
     N'https://images.unsplash.com/photo-1585856331426-d7a22a3d41c8?w=800&q=80', 
     N'https://images.unsplash.com/photo-1585856331426-d7a22a3d41c8?w=300&q=80', 0);

-- ============================================
-- Product 10: Khăn Choàng Cashmere (Black, White, Beige, Grey)
-- ============================================
INSERT INTO ProductImages (ImageId, ProductId, VariantId, ImageUrl, ThumbnailUrl, IsPrimary) VALUES
    (26, 10, NULL, 
     N'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80', 
     N'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&q=80', 1),
    (27, 10, 39, 
     N'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80', 
     N'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=300&q=80', 0),
    (28, 10, 41, 
     N'https://images.unsplash.com/photo-1584736286279-a87a0e8f5f7d?w=800&q=80', 
     N'https://images.unsplash.com/photo-1584736286279-a87a0e8f5f7d?w=300&q=80', 0);

SET IDENTITY_INSERT ProductImages OFF;

PRINT '✓ 28 Product Images inserted!'
GO

/* =============================================================
   SUMMARY REPORT
   ============================================================= */

PRINT ''
PRINT '========================================'
PRINT '✅ AISTHEA Seed Data Import Complete!'
PRINT '========================================'
PRINT ''
PRINT '📊 Summary:'
PRINT '   • Roles: 3'
PRINT '   • Brands: 1 (AISTHEA)'
PRINT '   • Attributes: 2 (Size, Màu sắc)'
PRINT '   • Attribute Values: 9 (4 sizes + 5 colors)'
PRINT '   • Categories: 8 (4 parent + 4 child)'
PRINT '   • Products: 10'
PRINT '   • Product Variants: 42'
PRINT '   • Variant Attributes: 78'
PRINT '   • Product Images: 28'
PRINT ''
PRINT '💰 Price Range: 590,000đ - 1,990,000đ'
PRINT '📦 Stock Range: 10 - 50 units per variant'
PRINT ''
GO

-- Quick verification queries
PRINT 'Verification Queries:'
PRINT '--------------------'

SELECT 'Products' AS [Table], COUNT(*) AS [Count] FROM Products WHERE Slug LIKE 'aisthea-%'
UNION ALL
SELECT 'ProductVariants', COUNT(*) FROM ProductVariants WHERE ProductId IN (SELECT ProductId FROM Products WHERE Slug LIKE 'aisthea-%')
UNION ALL
SELECT 'Categories', COUNT(*) FROM Categories
UNION ALL
SELECT 'ProductImages', COUNT(*) FROM ProductImages WHERE ProductId IN (SELECT ProductId FROM Products WHERE Slug LIKE 'aisthea-%');

GO
