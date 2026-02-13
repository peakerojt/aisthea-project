/* =============================================================
   MASTER OPTIMIZATION SCRIPT
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Consolidated script including Critical Indexes, 
                Performance Indexes, Data Quality Fixes, and 
                Additional Search Indexes.
   ============================================================= */

USE AISTHEA;
GO

PRINT 'Starting Master Optimization...';
GO

/* =============================================================
   SECTION 1: CRITICAL INDEXES (From Migration 001)
   ============================================================= */

-- Products table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_CategoryId' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_CategoryId 
        ON Products(CategoryId) 
        WHERE IsDeleted = 0;
    PRINT 'Created IX_Products_CategoryId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_BrandId' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_BrandId 
        ON Products(BrandId) 
        WHERE IsDeleted = 0 AND BrandId IS NOT NULL;
    PRINT 'Created IX_Products_BrandId';
END

-- ProductVariants table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_ProductId' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE INDEX IX_ProductVariants_ProductId 
        ON ProductVariants(ProductId) 
        WHERE IsDeleted = 0;
    PRINT 'Created IX_ProductVariants_ProductId';
END

-- ProductImages table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductImages_ProductId' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE INDEX IX_ProductImages_ProductId 
        ON ProductImages(ProductId)
        INCLUDE (ImageUrl, ThumbnailUrl, IsPrimary);
    PRINT 'Created IX_ProductImages_ProductId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductImages_VariantId' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE INDEX IX_ProductImages_VariantId 
        ON ProductImages(VariantId)
        WHERE VariantId IS NOT NULL;
    PRINT 'Created IX_ProductImages_VariantId';
END

-- VariantAttributes table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VariantAttributes_ValueId' AND object_id = OBJECT_ID('VariantAttributes'))
BEGIN
    CREATE INDEX IX_VariantAttributes_ValueId 
        ON VariantAttributes(ValueId);
    PRINT 'Created IX_VariantAttributes_ValueId';
END

-- CartItems table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CartItems_VariantId' AND object_id = OBJECT_ID('CartItems'))
BEGIN
    CREATE INDEX IX_CartItems_VariantId 
        ON CartItems(VariantId);
    PRINT 'Created IX_CartItems_VariantId';
END

-- OrderItems table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_VariantId' AND object_id = OBJECT_ID('OrderItems'))
BEGIN
    CREATE INDEX IX_OrderItems_VariantId 
        ON OrderItems(VariantId)
        WHERE VariantId IS NOT NULL;
    PRINT 'Created IX_OrderItems_VariantId';
END

-- Reviews table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Reviews_ProductId' AND object_id = OBJECT_ID('Reviews'))
BEGIN
    CREATE INDEX IX_Reviews_ProductId 
        ON Reviews(ProductId)
        INCLUDE (Rating, CreatedAt);
    PRINT 'Created IX_Reviews_ProductId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Reviews_UserId' AND object_id = OBJECT_ID('Reviews'))
BEGIN
    CREATE INDEX IX_Reviews_UserId 
        ON Reviews(UserId);
    PRINT 'Created IX_Reviews_UserId';
END

-- Unique Constraints
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_ProductImages_Primary' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE UNIQUE INDEX UX_ProductImages_Primary 
        ON ProductImages(ProductId) 
        WHERE IsPrimary = 1;
    PRINT 'Created UX_ProductImages_Primary';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_Addresses_Default' AND object_id = OBJECT_ID('Addresses'))
BEGIN
    CREATE UNIQUE INDEX UX_Addresses_Default 
        ON Addresses(UserId) 
        WHERE IsDefault = 1;
    PRINT 'Created UX_Addresses_Default';
END

-- Query Pattern Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Status_Deleted' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_Status_Deleted 
        ON Products(Status, IsDeleted)
        INCLUDE (Name, BasePrice, Slug, CategoryId, CreatedAt);
    PRINT 'Created IX_Products_Status_Deleted';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Slug_Active' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_Slug_Active 
        ON Products(Slug)
        INCLUDE (ProductId, Name, BasePrice, CategoryId, Description)
        WHERE IsDeleted = 0;
    PRINT 'Created IX_Products_Slug_Active';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_SKU_Active' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE INDEX IX_ProductVariants_SKU_Active 
        ON ProductVariants(SKU)
        INCLUDE (ProductId, Price, StockQuantity)
        WHERE IsDeleted = 0;
    PRINT 'Created IX_ProductVariants_SKU_Active';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductImages_Primary_Lookup' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE INDEX IX_ProductImages_Primary_Lookup 
        ON ProductImages(ProductId, IsPrimary)
        INCLUDE (ImageUrl, ThumbnailUrl)
        WHERE IsPrimary = 1;
    PRINT 'Created IX_ProductImages_Primary_Lookup';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Carts_UserId' AND object_id = OBJECT_ID('Carts'))
BEGIN
    CREATE INDEX IX_Carts_UserId 
        ON Carts(UserId)
        WHERE UserId IS NOT NULL;
    PRINT 'Created IX_Carts_UserId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Carts_SessionId' AND object_id = OBJECT_ID('Carts'))
BEGIN
    CREATE INDEX IX_Carts_SessionId 
        ON Carts(SessionId)
        WHERE SessionId IS NOT NULL;
    PRINT 'Created IX_Carts_SessionId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_UserId_CreatedAt' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE INDEX IX_Orders_UserId_CreatedAt 
        ON Orders(UserId, CreatedAt DESC)
        INCLUDE (OrderNumber, TotalAmount, Status)
        WHERE UserId IS NOT NULL;
    PRINT 'Created IX_Orders_UserId_CreatedAt';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_OrderNumber' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE INDEX IX_Orders_OrderNumber 
        ON Orders(OrderNumber)
        INCLUDE (UserId, Status, TotalAmount, CreatedAt);
    PRINT 'Created IX_Orders_OrderNumber';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Categories_ParentId' AND object_id = OBJECT_ID('Categories'))
BEGIN
    CREATE INDEX IX_Categories_ParentId 
        ON Categories(ParentId)
        WHERE ParentId IS NOT NULL;
    PRINT 'Created IX_Categories_ParentId';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_StockQuantity' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE INDEX IX_ProductVariants_StockQuantity 
        ON ProductVariants(StockQuantity)
        INCLUDE (ProductId, SKU, Price)
        WHERE IsDeleted = 0;
    PRINT 'Created IX_ProductVariants_StockQuantity';
END

GO

/* =============================================================
   SECTION 2: PERFORMANCE INDEXES (From Migration 002)
   ============================================================= */

-- Product search by category + status
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Category_Status' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_Category_Status 
        ON Products(CategoryId, Status, IsDeleted)
        INCLUDE (Name, BasePrice, Slug, CreatedAt);
    PRINT 'Created IX_Products_Category_Status';
END

-- Product price range queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Price_Range' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_Price_Range 
        ON Products(BasePrice, IsDeleted)
        INCLUDE (ProductId, Name, Slug, CategoryId)
        WHERE Status = 'Active';
    PRINT 'Created IX_Products_Price_Range';
END

-- Variant availability (in-stock items)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProductVariants_InStock' AND object_id = OBJECT_ID('ProductVariants'))
BEGIN
    CREATE INDEX IX_ProductVariants_InStock 
        ON ProductVariants(ProductId, StockQuantity)
        INCLUDE (VariantId, SKU, Price)
        WHERE IsDeleted = 0 AND StockQuantity > 0;
    PRINT 'Created IX_ProductVariants_InStock';
END

-- Order management
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_Status_CreatedAt' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE INDEX IX_Orders_Status_CreatedAt 
        ON Orders(Status, CreatedAt DESC)
        INCLUDE (OrderId, OrderNumber, CustomerName, TotalAmount);
    PRINT 'Created IX_Orders_Status_CreatedAt';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_Status_Date' AND object_id = OBJECT_ID('Payments'))
BEGIN
    CREATE INDEX IX_Payments_Status_Date 
        ON Payments(Status, PaymentDate DESC)
        INCLUDE (OrderId, Amount, PaymentMethod);
    PRINT 'Created IX_Payments_Status_Date';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Status_CreatedAt' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE INDEX IX_Users_Status_CreatedAt 
        ON Users(Status, CreatedAt DESC)
        INCLUDE (UserId, Email, FullName);
    PRINT 'Created IX_Users_Status_CreatedAt';
END

-- Analytics
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_CreatedAt_Amount' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE INDEX IX_Orders_CreatedAt_Amount 
        ON Orders(CreatedAt, TotalAmount)
        INCLUDE (OrderId, UserId)
        WHERE Status IN ('Completed', 'Delivered');
    PRINT 'Created IX_Orders_CreatedAt_Amount';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Reviews_Product_CreatedAt' AND object_id = OBJECT_ID('Reviews'))
BEGIN
    CREATE INDEX IX_Reviews_Product_CreatedAt 
        ON Reviews(ProductId, CreatedAt DESC)
        INCLUDE (Rating, UserId);
    PRINT 'Created IX_Reviews_Product_CreatedAt';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_Variant_Quantity' AND object_id = OBJECT_ID('OrderItems'))
BEGIN
    CREATE INDEX IX_OrderItems_Variant_Quantity 
        ON OrderItems(VariantId, Quantity)
        INCLUDE (OrderId, UnitPrice)
        WHERE VariantId IS NOT NULL;
    PRINT 'Created IX_OrderItems_Variant_Quantity';
END

-- User Experience
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Orders_User_Recent' AND object_id = OBJECT_ID('Orders'))
BEGIN
    CREATE INDEX IX_Orders_User_Recent 
        ON Orders(UserId, CreatedAt DESC)
        INCLUDE (OrderId, OrderNumber, Status, TotalAmount)
        WHERE UserId IS NOT NULL;
    PRINT 'Created IX_Orders_User_Recent';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Reviews_User_Recent' AND object_id = OBJECT_ID('Reviews'))
BEGIN
    CREATE INDEX IX_Reviews_User_Recent 
        ON Reviews(UserId, CreatedAt DESC)
        INCLUDE (ProductId, Rating, Comment);
    PRINT 'Created IX_Reviews_User_Recent';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmailVerificationTokens_Token' AND object_id = OBJECT_ID('EmailVerificationTokens'))
BEGIN
    CREATE INDEX IX_EmailVerificationTokens_Token 
        ON EmailVerificationTokens(Token)
        INCLUDE (UserId, ExpiresAt);
    PRINT 'Created IX_EmailVerificationTokens_Token';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PasswordResetTokens_Token' AND object_id = OBJECT_ID('PasswordResetTokens'))
BEGIN
    CREATE INDEX IX_PasswordResetTokens_Token 
        ON PasswordResetTokens(Token)
        INCLUDE (UserId, ExpiresAt);
    PRINT 'Created IX_PasswordResetTokens_Token';
END

GO

/* =============================================================
   SECTION 3: DATA QUALITY (From Migration 003)
   ============================================================= */

-- Fix duplicate primary images
WITH DuplicatePrimary AS (
    SELECT ImageId, ProductId, ROW_NUMBER() OVER (PARTITION BY ProductId ORDER BY ImageId) AS RowNum
    FROM ProductImages WHERE IsPrimary = 1
)
UPDATE ProductImages SET IsPrimary = 0
WHERE ImageId IN (SELECT ImageId FROM DuplicatePrimary WHERE RowNum > 1);

-- Ensure primary images
WITH ProductsWithoutPrimary AS (
    SELECT DISTINCT p.ProductId FROM Products p
    WHERE NOT EXISTS (SELECT 1 FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1)
    AND EXISTS (SELECT 1 FROM ProductImages pi2 WHERE pi2.ProductId = p.ProductId)
)
UPDATE ProductImages SET IsPrimary = 1
WHERE ImageId IN (
    SELECT MIN(pi.ImageId) FROM ProductImages pi
    INNER JOIN ProductsWithoutPrimary pwp ON pi.ProductId = pwp.ProductId
    GROUP BY pi.ProductId
);

-- Ensure default variants
WITH ProductsWithoutDefault AS (
    SELECT DISTINCT pv.ProductId FROM ProductVariants pv
    WHERE NOT EXISTS (SELECT 1 FROM ProductVariants pv2 WHERE pv2.ProductId = pv.ProductId AND pv2.IsDefault = 1 AND pv2.IsDeleted = 0)
    AND pv.IsDeleted = 0
)
UPDATE ProductVariants SET IsDefault = 1
WHERE VariantId IN (
    SELECT MIN(pv.VariantId) FROM ProductVariants pv
    INNER JOIN ProductsWithoutDefault pwd ON pv.ProductId = pwd.ProductId
    WHERE pv.IsDeleted = 0
    GROUP BY pv.ProductId
);

-- Constraints
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Products_BasePrice')
    ALTER TABLE Products ADD CONSTRAINT CHK_Products_BasePrice CHECK (BasePrice >= 0);

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ProductVariants_Price')
    ALTER TABLE ProductVariants ADD CONSTRAINT CHK_ProductVariants_Price CHECK (Price >= 0);

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_ProductVariants_Stock')
    ALTER TABLE ProductVariants ADD CONSTRAINT CHK_ProductVariants_Stock CHECK (StockQuantity >= 0);

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Orders_TotalAmount')
    ALTER TABLE Orders ADD CONSTRAINT CHK_Orders_TotalAmount CHECK (TotalAmount > 0);

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_OrderItems_UnitPrice')
    ALTER TABLE OrderItems ADD CONSTRAINT CHK_OrderItems_UnitPrice CHECK (UnitPrice >= 0);

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_Payments_Amount')
    ALTER TABLE Payments ADD CONSTRAINT CHK_Payments_Amount CHECK (Amount > 0);

-- Default Values
IF NOT EXISTS (SELECT * FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('Products') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'Status'))
    ALTER TABLE Products ADD CONSTRAINT DF_Products_Status DEFAULT 'Active' FOR Status;

IF NOT EXISTS (SELECT * FROM sys.default_constraints WHERE parent_object_id = OBJECT_ID('ProductVariants') AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('ProductVariants') AND name = 'StockQuantity'))
    ALTER TABLE ProductVariants ADD CONSTRAINT DF_ProductVariants_StockQuantity DEFAULT 0 FOR StockQuantity;

GO

/* =============================================================
   SECTION 4: ADDITIONAL SEARCH INDEXES (Original)
   ============================================================= */

-- Email + Status lookup
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email_Status' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_Email_Status ON Users(Email, Status);
    PRINT 'Created IX_Users_Email_Status';
END

-- Phone search
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Phone' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_Phone ON Users(Phone);
    PRINT 'Created IX_Users_Phone';
END

-- Name search
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_Name' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Products_Name ON Products(Name);
    PRINT 'Created IX_Products_Name';
END

-- OrderItems OrderId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_OrderItems_OrderId' AND object_id = OBJECT_ID('OrderItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId ON OrderItems(OrderId);
    PRINT 'Created IX_OrderItems_OrderId';
END

-- CartItems CartId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CartItems_CartId' AND object_id = OBJECT_ID('CartItems'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_CartItems_CartId ON CartItems(CartId);
    PRINT 'Created IX_CartItems_CartId';
END

-- VariantAttributes VariantId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VariantAttributes_VariantId' AND object_id = OBJECT_ID('VariantAttributes'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_VariantId ON VariantAttributes(VariantId);
    PRINT 'Created IX_VariantAttributes_VariantId';
END

-- UserLogins search
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserLogins_UserId' AND object_id = OBJECT_ID('UserLogins'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserLogins_UserId ON UserLogins(UserId);
    PRINT 'Created IX_UserLogins_UserId';
END

GO

PRINT '';
PRINT '========================================';
PRINT 'OPTIMIZATION COMPLETE';
PRINT 'All indexes and constraints applied.';
PRINT '========================================';
GO