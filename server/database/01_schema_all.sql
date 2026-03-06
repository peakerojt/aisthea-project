
/* =============================================================
   FILE: table/01_schema.sql
   ============================================================= */

/* =============================================================
   PROJECT: AISTHEA
   DATABASE: AISTHEA (Tables Only)
   TYPE: SQL Server (T-SQL)
   VERSION: 3.1 - Tables Only (Database must exist)
   ============================================================= */

USE AISTHEA;
GO

PRINT 'Starting schema creation for database: AISTHEA';
GO

/* =============================================================
   FUNCTIONS
   ============================================================= */

-- Drop and recreate function with proper options
IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_RemoveDiacritics;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE FUNCTION dbo.fn_RemoveDiacritics(@input NVARCHAR(MAX))
RETURNS NVARCHAR(850)
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @result NVARCHAR(MAX) = @input;
    
    -- Vietnamese vowels lowercase
    SET @result = REPLACE(@result, N'à', 'a'); SET @result = REPLACE(@result, N'á', 'a');
    SET @result = REPLACE(@result, N'ả', 'a'); SET @result = REPLACE(@result, N'ã', 'a');
    SET @result = REPLACE(@result, N'ạ', 'a'); SET @result = REPLACE(@result, N'â', 'a');
    SET @result = REPLACE(@result, N'ầ', 'a'); SET @result = REPLACE(@result, N'ấ', 'a');
    SET @result = REPLACE(@result, N'ẩ', 'a'); SET @result = REPLACE(@result, N'ẫ', 'a');
    SET @result = REPLACE(@result, N'ậ', 'a'); SET @result = REPLACE(@result, N'ă', 'a');
    SET @result = REPLACE(@result, N'ằ', 'a'); SET @result = REPLACE(@result, N'ắ', 'a');
    SET @result = REPLACE(@result, N'ẳ', 'a'); SET @result = REPLACE(@result, N'ẵ', 'a');
    SET @result = REPLACE(@result, N'ặ', 'a');
    
    SET @result = REPLACE(@result, N'è', 'e'); SET @result = REPLACE(@result, N'é', 'e');
    SET @result = REPLACE(@result, N'ẻ', 'e'); SET @result = REPLACE(@result, N'ẽ', 'e');
    SET @result = REPLACE(@result, N'ẹ', 'e'); SET @result = REPLACE(@result, N'ê', 'e');
    SET @result = REPLACE(@result, N'ề', 'e'); SET @result = REPLACE(@result, N'ế', 'e');
    SET @result = REPLACE(@result, N'ể', 'e'); SET @result = REPLACE(@result, N'ễ', 'e');
    SET @result = REPLACE(@result, N'ệ', 'e');
    
    SET @result = REPLACE(@result, N'ì', 'i'); SET @result = REPLACE(@result, N'í', 'i');
    SET @result = REPLACE(@result, N'ỉ', 'i'); SET @result = REPLACE(@result, N'ĩ', 'i');
    SET @result = REPLACE(@result, N'ị', 'i');
    
    SET @result = REPLACE(@result, N'ò', 'o'); SET @result = REPLACE(@result, N'ó', 'o');
    SET @result = REPLACE(@result, N'ỏ', 'o'); SET @result = REPLACE(@result, N'õ', 'o');
    SET @result = REPLACE(@result, N'ọ', 'o'); SET @result = REPLACE(@result, N'ô', 'o');
    SET @result = REPLACE(@result, N'ồ', 'o'); SET @result = REPLACE(@result, N'ố', 'o');
    SET @result = REPLACE(@result, N'ổ', 'o'); SET @result = REPLACE(@result, N'ỗ', 'o');
    SET @result = REPLACE(@result, N'ộ', 'o'); SET @result = REPLACE(@result, N'ơ', 'o');
    SET @result = REPLACE(@result, N'ờ', 'o'); SET @result = REPLACE(@result, N'ớ', 'o');
    SET @result = REPLACE(@result, N'ở', 'o'); SET @result = REPLACE(@result, N'ỡ', 'o');
    SET @result = REPLACE(@result, N'ợ', 'o');
    
    SET @result = REPLACE(@result, N'ù', 'u'); SET @result = REPLACE(@result, N'ú', 'u');
    SET @result = REPLACE(@result, N'ủ', 'u'); SET @result = REPLACE(@result, N'ũ', 'u');
    SET @result = REPLACE(@result, N'ụ', 'u'); SET @result = REPLACE(@result, N'ư', 'u');
    SET @result = REPLACE(@result, N'ừ', 'u'); SET @result = REPLACE(@result, N'ứ',  'u');
    SET @result = REPLACE(@result, N'ử', 'u'); SET @result = REPLACE(@result, N'ữ', 'u');
    SET @result = REPLACE(@result, N'ự', 'u');
    
    SET @result = REPLACE(@result, N'ỳ', 'y'); SET @result = REPLACE(@result, N'ý', 'y');
    SET @result = REPLACE(@result, N'ỷ', 'y'); SET @result = REPLACE(@result, N'ỹ', 'y');
    SET @result = REPLACE(@result, N'ỵ', 'y');
    
    SET @result = REPLACE(@result, N'đ', 'd');
    
    -- Uppercase
    SET @result = REPLACE(@result, N'À', 'A'); SET @result = REPLACE(@result, N'Á', 'A');
    SET @result = REPLACE(@result, N'Ả', 'A'); SET @result = REPLACE(@result, N'Ã', 'A');
    SET @result = REPLACE(@result, N'Ạ', 'A'); SET @result = REPLACE(@result, N'Â', 'A');
    SET @result = REPLACE(@result, N'Ầ', 'A'); SET @result = REPLACE(@result, N'Ấ', 'A');
    SET @result = REPLACE(@result, N'Ẩ', 'A'); SET @result = REPLACE(@result, N'Ẫ', 'A');
    SET @result = REPLACE(@result, N'Ậ', 'A'); SET @result = REPLACE(@result, N'Ă', 'A');
    SET @result = REPLACE(@result, N'Ằ', 'A'); SET @result = REPLACE(@result, N'Ắ', 'A');
    SET @result = REPLACE(@result, N'Ẳ', 'A'); SET @result = REPLACE(@result, N'Ẵ', 'A');
    SET @result = REPLACE(@result, N'Ặ', 'A');
    
    SET @result = REPLACE(@result, N'È', 'E'); SET @result = REPLACE(@result, N'É', 'E');
    SET @result = REPLACE(@result, N'Ẻ', 'E'); SET @result = REPLACE(@result, N'Ẽ', 'E');
    SET @result = REPLACE(@result, N'Ẹ', 'E'); SET @result = REPLACE(@result, N'Ê', 'E');
    SET @result = REPLACE(@result, N'Ề', 'E'); SET @result = REPLACE(@result, N'Ế', 'E');
    SET @result = REPLACE(@result, N'Ể', 'E'); SET @result = REPLACE(@result, N'Ễ', 'E');
    SET @result = REPLACE(@result, N'Ệ', 'E');
    
    SET @result = REPLACE(@result, N'Ì', 'I'); SET @result = REPLACE(@result, N'Í', 'I');
    SET @result = REPLACE(@result, N'Ỉ', 'I'); SET @result = REPLACE(@result, N'Ĩ', 'I');
    SET @result = REPLACE(@result, N'Ị', 'I');
    
    SET @result = REPLACE(@result, N'Ò', 'O'); SET @result = REPLACE(@result, N'Ó', 'O');
    SET @result = REPLACE(@result, N'Ỏ', 'O'); SET @result = REPLACE(@result, N'Õ', 'O');
    SET @result = REPLACE(@result, N'Ọ', 'O'); SET @result = REPLACE(@result, N'Ô', 'O');
    SET @result = REPLACE(@result, N'Ồ', 'O'); SET @result = REPLACE(@result, N'Ố', 'O');
    SET @result = REPLACE(@result, N'Ổ', 'O'); SET @result = REPLACE(@result, N'Ỗ', 'O');
    SET @result = REPLACE(@result, N'Ộ', 'O'); SET @result = REPLACE(@result, N'Ơ', 'O');
    SET @result = REPLACE(@result, N'Ờ', 'O'); SET @result = REPLACE(@result, N'Ớ', 'O');
    SET @result = REPLACE(@result, N'Ở', 'O'); SET @result = REPLACE(@result, N'Ỡ', 'O');
    SET @result = REPLACE(@result, N'Ợ', 'O');
    
    SET @result = REPLACE(@result, N'Ù', 'U'); SET @result = REPLACE(@result, N'Ú', 'U');
    SET @result = REPLACE(@result, N'Ủ', 'U'); SET @result = REPLACE(@result, N'Ũ', 'U');
    SET @result = REPLACE(@result, N'Ụ', 'U'); SET @result = REPLACE(@result, N'Ư', 'U');
    SET @result = REPLACE(@result, N'Ừ', 'U'); SET @result = REPLACE(@result, N'Ứ', 'U');
    SET @result = REPLACE(@result, N'Ử', 'U'); SET @result = REPLACE(@result, N'Ữ', 'U');
    SET @result = REPLACE(@result, N'Ự', 'U');
    
    SET @result = REPLACE(@result, N'Ỳ', 'Y'); SET @result = REPLACE(@result, N'Ý', 'Y');
    SET @result = REPLACE(@result, N'Ỷ', 'Y'); SET @result = REPLACE(@result, N'Ỹ', 'Y');
    SET @result = REPLACE(@result, N'Ỵ', 'Y');
    
    SET @result = REPLACE(@result, N'Đ', 'D');
    
    RETURN CAST(LOWER(@result) AS NVARCHAR(850));
END
GO

PRINT '✓ Created function: dbo.fn_RemoveDiacritics';
GO

/* =============================================================
   TABLES - ORDERED BY DEPENDENCIES
   ============================================================= */

-- Level 0: No dependencies
-- ============================================

-- Bảng Roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        RoleId INT IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(50) NOT NULL UNIQUE
    );
    PRINT '✓ Created table: Roles';
END

-- Bảng Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NULL,
        FullName NVARCHAR(100) NOT NULL,
        Phone NVARCHAR(20),
        AvatarUrl NVARCHAR(500) NULL,
        GoogleId NVARCHAR(255) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT CHK_User_Status CHECK (Status IN ('Active', 'Banned', 'Pending'))
        -- CONSTRAINT UQ_Users_GoogleId UNIQUE (GoogleId) -- Removed: SQL Server Unique Constraint allows only ONE NULL.
    );
    -- Create Filtered Unique Index for GoogleId to allow multiple NULLs
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Users_GoogleId' AND object_id = OBJECT_ID('Users'))
    BEGIN
        CREATE UNIQUE INDEX UQ_Users_GoogleId ON Users(GoogleId) WHERE GoogleId IS NOT NULL;
    END
    PRINT '✓ Created table: Users';
END

-- Bảng EmailVerificationTokens (depends on Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmailVerificationTokens')
BEGIN
    CREATE TABLE EmailVerificationTokens (
        TokenId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Token NVARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_EmailVerificationTokens_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: EmailVerificationTokens';
END

-- Bảng PasswordResetTokens (depends on Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
    CREATE TABLE PasswordResetTokens (
        TokenId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Token NVARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2 NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: PasswordResetTokens';
END

-- Bảng Brands
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Brands')
BEGIN
    CREATE TABLE Brands (
        BrandId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255)
    );
    PRINT '✓ Created table: Brands';
END

-- Bảng Attributes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attributes')
BEGIN
    CREATE TABLE Attributes (
        AttributeId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE
    );
    PRINT '✓ Created table: Attributes';
END

-- Bảng Carts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Carts')
BEGIN
    CREATE TABLE Carts (
        CartId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        SessionId NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Carts_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT UQ_Carts_UserId UNIQUE (UserId)
    );
    PRINT '✓ Created table: Carts';
END

GO

-- Level 1: Depend on Level 0
-- ============================================

-- Bảng UserRoles (depends on Users, Roles)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: UserRoles';
END

-- Bảng UserLogins (depends on Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserLogins')
BEGIN
    CREATE TABLE UserLogins (
        LoginProvider NVARCHAR(50) NOT NULL,
        ProviderKey NVARCHAR(128) NOT NULL,
        ProviderDisplayName NVARCHAR(100) NULL,
        UserId INT NOT NULL,
        AccessToken NVARCHAR(MAX) NULL,
        RefreshToken NVARCHAR(MAX) NULL,
        TokenExpiry DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        PRIMARY KEY (LoginProvider, ProviderKey),
        CONSTRAINT FK_UserLogins_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: UserLogins';
END

-- Bảng Addresses (depends on Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Addresses')
BEGIN
    CREATE TABLE Addresses (
        AddressId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        RecipientName NVARCHAR(100) NOT NULL,
        Phone NVARCHAR(20) NOT NULL,
        AddressLine NVARCHAR(255) NOT NULL,
        City NVARCHAR(50) NOT NULL,
        District NVARCHAR(50),
        IsDefault BIT DEFAULT 0,
        CONSTRAINT FK_Addresses_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: Addresses';
END

-- Bảng Categories (self-referencing)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Categories')
BEGIN
    CREATE TABLE Categories (
        CategoryId INT IDENTITY(1,1) PRIMARY KEY,
        ParentId INT NULL,
        Name NVARCHAR(100) NOT NULL,
        Slug NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255),
        ImageUrl NVARCHAR(1000) NULL,
        CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentId) REFERENCES Categories(CategoryId)
    );
    PRINT '✓ Created table: Categories';
END

-- Bảng AttributeValues (depends on Attributes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttributeValues')
BEGIN
    CREATE TABLE AttributeValues (
        ValueId INT IDENTITY(1,1) PRIMARY KEY,
        AttributeId INT NOT NULL,
        Value NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_AttributeValues_Attributes FOREIGN KEY (AttributeId) REFERENCES Attributes(AttributeId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: AttributeValues';
END

-- Bảng Coupons
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Coupons')
BEGIN
    CREATE TABLE Coupons (
        CouponId INT IDENTITY(1,1) PRIMARY KEY,
        Code NVARCHAR(50) NOT NULL UNIQUE,
        Type NVARCHAR(20) NOT NULL,
        Value DECIMAL(18,2) NOT NULL,
        MaxDiscountAmount DECIMAL(18,2) NULL,
        MinOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NOT NULL,
        UsageLimit INT NOT NULL,
        UsedCount INT NOT NULL DEFAULT 0,
        UsagePerUser INT NOT NULL DEFAULT 1,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE NONCLUSTERED INDEX IX_Coupons_Code ON Coupons (Code);
    CREATE NONCLUSTERED INDEX IX_Coupons_IsActive ON Coupons (IsActive);
    PRINT '✓ Created table: Coupons';
END

-- Bảng Orders (depends on Users, Coupons)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        OrderId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        OrderCode NVARCHAR(50) NULL UNIQUE,
        OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
        CustomerName NVARCHAR(100) NOT NULL,
        CustomerEmail NVARCHAR(100) NULL,
        CustomerPhone NVARCHAR(20) NOT NULL,
        ShippingCity NVARCHAR(50) NOT NULL,
        ShippingDistrict NVARCHAR(50) NOT NULL,
        ShippingWard NVARCHAR(50),
        ShippingAddressDetail NVARCHAR(200) NOT NULL,
        TrackingNumber NVARCHAR(100) NULL,
        Carrier NVARCHAR(50) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        DiscountAmount DECIMAL(18,2) NULL DEFAULT 0,
        CouponId INT NULL,
        Status NVARCHAR(20) DEFAULT 'Pending',
        PaymentMethod NVARCHAR(50) DEFAULT 'COD',
        PaymentStatus NVARCHAR(20) DEFAULT 'Unpaid',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        Note NVARCHAR(500) NULL,
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserId) REFERENCES Users(UserId),
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (CouponId) REFERENCES Coupons(CouponId)
    );
    PRINT '✓ Created table: Orders';
END

GO

-- Level 2: Depend on Level 1
-- ============================================

-- Bảng Products (depends on Categories, Brands)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE Products (
        ProductId INT IDENTITY(1,1) PRIMARY KEY,
        CategoryId INT NOT NULL,
        BrandId INT NULL,
        Name NVARCHAR(200) NOT NULL,
        Slug NVARCHAR(200) NOT NULL UNIQUE,
        Description NVARCHAR(MAX),
        BasePrice DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(20) DEFAULT 'Active',
        IsDeleted BIT DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        
        -- Normalized columns for optimized search (Moved from 11/12)
        NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED,
        DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED,
        
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
        CONSTRAINT FK_Products_Brands FOREIGN KEY (BrandId) REFERENCES Brands(BrandId)
    );
    
    -- Optimized indexes for normalized columns
    CREATE INDEX IX_Products_NameNormalized ON Products(NameNormalized) WHERE IsDeleted = 0 AND Status = 'Active';
    CREATE INDEX IX_Products_DescriptionNormalized ON Products(DescriptionNormalized) WHERE IsDeleted = 0 AND Status = 'Active';
    
    PRINT '✓ Created table: Products (with normalized columns and indexes)';
END

-- Bảng Payments (depends on Orders)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
BEGIN
    CREATE TABLE Payments (
        PaymentId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        PaymentMethod NVARCHAR(50) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        TransactionCode NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        PaymentDate DATETIME2 DEFAULT GETDATE(),
        Note NVARCHAR(500) NULL,
        CONSTRAINT FK_Payments_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: Payments';
END

GO

-- Level 3: Depend on Level 2
-- ============================================

-- Bảng ProductVariants (depends on Products)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductVariants')
BEGIN
    CREATE TABLE ProductVariants (
        VariantId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        SKU NVARCHAR(50) NOT NULL UNIQUE,
        Price DECIMAL(18,2) NOT NULL,
        StockQuantity INT NOT NULL DEFAULT 0,
        IsDefault BIT DEFAULT 0,
        IsDeleted BIT DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        CONSTRAINT FK_ProductVariants_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: ProductVariants';
END


GO

-- Level 4: Depend on Level 3
-- ============================================

-- Bảng VariantAttributes (depends on ProductVariants, AttributeValues)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VariantAttributes')
BEGIN
    CREATE TABLE VariantAttributes (
        VariantId INT NOT NULL,
        ValueId INT NOT NULL,
        PRIMARY KEY (VariantId, ValueId),
        CONSTRAINT FK_VariantAttributes_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT FK_VariantAttributes_Values FOREIGN KEY (ValueId) REFERENCES AttributeValues(ValueId) ON DELETE CASCADE
    );
    PRINT '✓ Created table: VariantAttributes';
END

-- Bảng ProductImages (depends on Products, ProductVariants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductImages')
BEGIN
    CREATE TABLE ProductImages (
        ImageId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        VariantId INT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        IsPrimary BIT DEFAULT 0,
        CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductImages_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId)
    );
    PRINT '✓ Created table: ProductImages';
END

-- Bảng CartItems (depends on Carts, ProductVariants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CartItems')
BEGIN
    CREATE TABLE CartItems (
        CartItemId INT IDENTITY(1,1) PRIMARY KEY,
        CartId INT NOT NULL,
        VariantId INT NOT NULL,
        Quantity INT NOT NULL CHECK (Quantity > 0),
        AddedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_CartItems_Carts FOREIGN KEY (CartId) REFERENCES Carts(CartId) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT UQ_CartItems_Cart_Variant UNIQUE(CartId, VariantId)
    );
    PRINT '✓ Created table: CartItems';
END

-- Bảng OrderItems (depends on Orders, ProductVariants)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems')
BEGIN
    CREATE TABLE OrderItems (
        OrderItemId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        VariantId INT NULL,
        ProductName NVARCHAR(200) NOT NULL,
        SKU NVARCHAR(50) NOT NULL,
        VariantName NVARCHAR(200) NOT NULL,
        UnitPrice DECIMAL(18,2) NOT NULL,
        Quantity INT NOT NULL,
        CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE SET NULL
    );
    PRINT '✓ Created table: OrderItems';
END

-- Bảng Reviews (depends on Products, Users, OrderItems)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
BEGIN
    CREATE TABLE Reviews (
        ReviewId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        UserId INT NOT NULL,
        OrderItemId INT NULL UNIQUE,
        Rating INT CHECK (Rating >= 1 AND Rating <= 5),
        Comment NVARCHAR(1000),
        Images NVARCHAR(MAX) DEFAULT '[]',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_Reviews_Users FOREIGN KEY (UserId) REFERENCES Users(UserId),
        CONSTRAINT FK_Reviews_OrderItems FOREIGN KEY (OrderItemId) REFERENCES OrderItems(OrderItemId)
    );
    PRINT '✓ Created table: Reviews';
END

-- Bảng Shipments (depends on Orders)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Shipments')
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
    CREATE NONCLUSTERED INDEX IX_Shipments_TrackingNumber ON Shipments(TrackingNumber);
    PRINT '✓ Created table: Shipments';
END

-- Bảng OrderReturns (depends on Orders, Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderReturns')
BEGIN
    CREATE TABLE OrderReturns (
        ReturnId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL UNIQUE,
        UserId INT NULL,
        Reason NVARCHAR(500) NOT NULL,
        ProofImages NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
        AdminNote NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_OrderReturns_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_OrderReturns_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX IX_OrderReturns_OrderId ON OrderReturns(OrderId);
    CREATE NONCLUSTERED INDEX IX_OrderReturns_Status ON OrderReturns(Status);
    CREATE NONCLUSTERED INDEX IX_OrderReturns_UserId ON OrderReturns(UserId);
    PRINT '✓ Created table: OrderReturns';
END

-- Bảng Refunds (depends on Orders, Payments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Refunds')
BEGIN
    CREATE TABLE Refunds (
        RefundId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        PaymentId INT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Type NVARCHAR(10) NOT NULL,
        Method NVARCHAR(25) NOT NULL,
        Status NVARCHAR(15) NOT NULL DEFAULT 'PENDING',
        GatewayTransactionId NVARCHAR(100) NULL,
        Reason NVARCHAR(500) NOT NULL,
        GatewayError NVARCHAR(500) NULL,
        CreatedBy INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Refunds_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_Refunds_Payments FOREIGN KEY (PaymentId) REFERENCES Payments(PaymentId)
    );
    CREATE NONCLUSTERED INDEX IX_Refunds_OrderId ON Refunds(OrderId);
    CREATE NONCLUSTERED INDEX IX_Refunds_Status ON Refunds(Status);
    PRINT '✓ Created table: Refunds';
END

-- Bảng OrderStatusHistory (depends on Orders)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderStatusHistory')
BEGIN
    CREATE TABLE OrderStatusHistory (
        OrderStatusHistoryId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL,
        OldStatus NVARCHAR(20) NULL,
        Status NVARCHAR(20) NOT NULL,
        ChangedBy INT NULL,
        Note NVARCHAR(500) NULL,
        ChangedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_OrderStatusHistory_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderId ON OrderStatusHistory(OrderId);
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderId_ChangedAt ON OrderStatusHistory(OrderId, ChangedAt);
    PRINT '✓ Created table: OrderStatusHistory';
END

-- Bảng InventoryLogs (depends on ProductVariants, Orders, Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InventoryLogs')
BEGIN
    CREATE TABLE InventoryLogs (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        VariantId INT NOT NULL,
        OrderId INT NULL,
        UserId INT NULL,
        ChangeQuantity INT NOT NULL,
        PreviousStock INT NOT NULL,
        NewStock INT NOT NULL,
        Reason NVARCHAR(30) NOT NULL,
        Note NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_InventoryLogs_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT FK_InventoryLogs_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE SET NULL,
        CONSTRAINT FK_InventoryLogs_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX IX_InventoryLogs_VariantId ON InventoryLogs(VariantId);
    CREATE NONCLUSTERED INDEX IX_InventoryLogs_OrderId ON InventoryLogs(OrderId);
    PRINT '✓ Created table: InventoryLogs';
END

GO

PRINT '';
PRINT '========================================';
PRINT '✓ Database Schema Ready!';
PRINT '========================================';
GO

/* =============================================================
   SCHEMA UPDATES - CLOUDINARY INTEGRATION
   Description: Increase URL column sizes for Cloudinary support
   Date: 2026-02-08
   ============================================================= */

PRINT '';
PRINT 'Applying Cloudinary integration updates...';
GO

-- Increase Users.AvatarUrl from NVARCHAR(500) to NVARCHAR(1000)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'AvatarUrl')
BEGIN
    PRINT 'Updating Users.AvatarUrl to NVARCHAR(1000)...';
    
    ALTER TABLE Users
    ALTER COLUMN AvatarUrl NVARCHAR(1000) NULL;
    
    PRINT '✓ Users.AvatarUrl updated successfully';
END
GO

-- Increase ProductImages.ImageUrl from NVARCHAR(500) to NVARCHAR(1000)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductImages') AND name = 'ImageUrl')
BEGIN
    PRINT 'Updating ProductImages.ImageUrl to NVARCHAR(1000)...';
    
    ALTER TABLE ProductImages
    ALTER COLUMN ImageUrl NVARCHAR(1000) NOT NULL;
    
    PRINT '✓ ProductImages.ImageUrl updated successfully';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✓ URL Column Resize Complete!';
PRINT '========================================';
GO

/* =============================================================
   SCHEMA UPDATES - THUMBNAIL URL SUPPORT
   Description: Add ThumbnailUrl column for optimized 300x300 thumbnails
   Date: 2026-02-08
   ============================================================= */

PRINT '';
PRINT 'Adding ThumbnailUrl column for thumbnail support...';
GO

-- Add ThumbnailUrl column if it doesn't exist
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ProductImages' 
    AND COLUMN_NAME = 'ThumbnailUrl'
)
BEGIN
    ALTER TABLE ProductImages ADD ThumbnailUrl NVARCHAR(1000) NULL;
    PRINT '✓ Added ThumbnailUrl column to ProductImages table';
END
ELSE    
BEGIN
    PRINT '⚠ ThumbnailUrl column already exists';
END
GO

ALTER TABLE Users DROP CONSTRAINT CHK_User_Status;
ALTER TABLE Users ADD CONSTRAINT CHK_User_Status CHECK (Status IN ('Active', 'Banned', 'Pending'));

GO

/* =============================================================
   SCHEMA UPDATES - CATEGORY IMAGE SUPPORT
   Description: Add ImageUrl column to Categories table for
                Cloudinary image support in category management.
   Date: 2026-02-26
   ============================================================= */

PRINT '';
PRINT 'Adding ImageUrl column to Categories table...';
GO

IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Categories'
    AND COLUMN_NAME = 'ImageUrl'
)
BEGIN
    ALTER TABLE Categories ADD ImageUrl NVARCHAR(1000) NULL;
    PRINT '✓ Added ImageUrl column to Categories table';
END
ELSE
BEGIN
    PRINT '⚠ ImageUrl column already exists in Categories';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✓ Category Image Support Ready!';
PRINT '========================================';
GO



/* =============================================================
   FILE: rbac_migration.sql
   ============================================================= */

-- ============================================================
-- RBAC Migration: Add Permissions and RolePermissions tables
-- Run this in SSMS or via sqlcmd BEFORE running the seed script
-- ============================================================

-- 1. Create Permissions table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Permissions' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[Permissions] (
        [PermissionId]  INT           NOT NULL IDENTITY(1,1),
        [Code]          NVARCHAR(100) NOT NULL,
        [Module]        NVARCHAR(50)  NOT NULL,
        [Description]   NVARCHAR(255) NOT NULL,
        CONSTRAINT [PK_Permissions]        PRIMARY KEY CLUSTERED ([PermissionId]),
        CONSTRAINT [UQ_Permissions_Code]   UNIQUE ([Code])
    );
    CREATE INDEX [IX_Permissions_Module] ON [dbo].[Permissions] ([Module]);
    PRINT 'Created Permissions table';
END
ELSE
    PRINT 'Permissions table already exists';

-- 2. Create RolePermissions join table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RolePermissions' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[RolePermissions] (
        [RoleId]        INT NOT NULL,
        [PermissionId]  INT NOT NULL,
        CONSTRAINT [PK_RolePermissions]
            PRIMARY KEY CLUSTERED ([RoleId], [PermissionId]),
        CONSTRAINT [FK_RolePermissions_Roles]
            FOREIGN KEY ([RoleId])
            REFERENCES [dbo].[Roles] ([RoleId])
            ON DELETE CASCADE,
        CONSTRAINT [FK_RolePermissions_Permissions]
            FOREIGN KEY ([PermissionId])
            REFERENCES [dbo].[Permissions] ([PermissionId])
            ON DELETE CASCADE
    );
    PRINT 'Created RolePermissions table';
END
ELSE
    PRINT 'RolePermissions table already exists';

PRINT 'RBAC migration complete.';

GO



/* =============================================================
   FILE: indexes/04_indexes.sql
   ============================================================= */

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

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_Status_Date' AND object_id = OBJECT_ID('Payments'))
    BEGIN
        CREATE INDEX IX_Payments_Status_Date 
            ON Payments(Status, PaymentDate DESC)
            INCLUDE (OrderId, Amount, PaymentMethod);
        PRINT 'Created IX_Payments_Status_Date';
    END
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
GO

/* =============================================================
   FILE: views/05_view_product_catalog.sql
   ============================================================= */

/* =============================================================
   DATABASE VIEW: vw_ProductCatalog
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Optimized view for product listing pages.
                Pre-joins Categories, Brands, Images and calculates
                min/max prices, stock totals from variants.
   USAGE: SELECT * FROM vw_ProductCatalog WHERE categorySlug = 'men';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('vw_ProductCatalog', 'V') IS NOT NULL
    DROP VIEW vw_ProductCatalog;
GO

CREATE VIEW vw_ProductCatalog
AS
SELECT 
    -- Product Info
    p.ProductId AS productId,
    p.Name AS name,
    p.Slug AS slug,
    p.Description AS description,
    p.BasePrice AS basePrice,
    p.Status AS status,
    p.CreatedAt AS createdAt,
    p.NameNormalized,
    p.DescriptionNormalized,
    
    -- Category
    c.Name AS categoryName,
    c.Slug AS categorySlug,
    
    -- Brand
    b.Name AS brandName,
    
    -- Variant Aggregations
    (SELECT MIN(pv.Price) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS minPrice,
    (SELECT MAX(pv.Price) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS maxPrice,
    (SELECT SUM(pv.StockQuantity) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS totalStock,
    (SELECT COUNT(*) FROM ProductVariants pv WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0) AS variantCount,
    
    -- Primary Image (fallback to ImageUrl if ThumbnailUrl is NULL)
    (SELECT TOP 1 pi.ImageUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryImageUrl,
    (SELECT TOP 1 COALESCE(pi.ThumbnailUrl, pi.ImageUrl) FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryThumbnailUrl


FROM Products p
LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
LEFT JOIN Brands b ON p.BrandId = b.BrandId
WHERE p.IsDeleted = 0 AND p.Status = 'Active';

GO

PRINT 'Created view vw_ProductCatalog';
GO

GO

/* =============================================================
   FILE: views/06_view_order_summary.sql
   ============================================================= */

/* =============================================================
   DATABASE VIEW: vw_OrderSummary
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Analytics view for admin dashboard.
                Aggregates orders by date with revenue and counts.
   USAGE: SELECT * FROM vw_OrderSummary WHERE orderDate >= '2026-01-01';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('vw_OrderSummary', 'V') IS NOT NULL
    DROP VIEW vw_OrderSummary;
GO

CREATE VIEW vw_OrderSummary
AS
SELECT 
    CAST(o.CreatedAt AS DATE) AS orderDate,
    COUNT(DISTINCT o.OrderId) AS totalOrders,
    SUM(o.TotalAmount) AS totalRevenue,
    SUM(CASE WHEN o.Status = 'Pending' THEN 1 ELSE 0 END) AS pendingOrders,
    SUM(CASE WHEN o.Status = 'Processing' THEN 1 ELSE 0 END) AS processingOrders,
    SUM(CASE WHEN o.Status = 'Completed' THEN 1 ELSE 0 END) AS completedOrders,
    SUM(CASE WHEN o.Status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
    COUNT(DISTINCT o.UserId) AS uniqueCustomers
FROM Orders o
GROUP BY CAST(o.CreatedAt AS DATE);

GO

PRINT 'Created view vw_OrderSummary';
GO

GO

/* =============================================================
   FILE: procedures/07_sp_get_product_details.sql
   ============================================================= */

/* =============================================================
   STORED PROCEDURE: sp_GetProductDetails
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Fetch full product details (Info, Variants, Images, Attributes)
                in a single round-trip for maximum performance.
   USAGE: EXEC sp_GetProductDetails @ProductId = 123;
          EXEC sp_GetProductDetails @Slug = 'ao-thun-nam';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_GetProductDetails', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetProductDetails;
GO

CREATE PROCEDURE sp_GetProductDetails
    @ProductId INT = NULL,
    @Slug NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id INT;

    -- Resolve ID
    IF @ProductId IS NOT NULL
        SET @Id = @ProductId;
    ELSE IF @Slug IS NOT NULL
        SELECT @Id = ProductId FROM Products WHERE Slug = @Slug AND IsDeleted = 0;

    IF @Id IS NULL
    BEGIN
        -- Don't raise error, just return empty sets to indicate not found gracefully
        -- Or raise error if application expects it. Let's return empty result.
        RETURN;
    END

    -- Return everything as a SINGLE JSON string
    SELECT 
        p.ProductId AS productId, p.Name AS name, p.Slug AS slug, p.Description AS description, 
        p.BasePrice AS basePrice, p.Status AS status, p.CreatedAt AS createdAt,
        c.Name AS categoryName, c.Slug AS categorySlug,
        b.Name AS brandName,

        -- Variants
        (
            SELECT 
                pv.VariantId AS variantId, pv.SKU AS sku, pv.Price AS price, 
                pv.StockQuantity AS stockQuantity, pv.IsDefault AS isDefault,
                -- Attributes for this variant
                (
                    SELECT 
                        a.Name AS attributeName, 
                        av.Value AS attributeValue
                    FROM VariantAttributes va
                    JOIN AttributeValues av ON va.ValueId = av.ValueId
                    JOIN Attributes a ON av.AttributeId = a.AttributeId
                    WHERE va.VariantId = pv.VariantId
                    FOR JSON PATH
                ) AS attributes
            FROM ProductVariants pv
            WHERE pv.ProductId = p.ProductId AND pv.IsDeleted = 0
            ORDER BY pv.IsDefault DESC, pv.Price ASC
            FOR JSON PATH
        ) AS variants,

        -- Images
        (
            SELECT 
                pi.ImageId AS imageId, pi.ImageUrl AS imageUrl, pi.ThumbnailUrl AS thumbnailUrl, 
                pi.IsPrimary AS isPrimary, pi.VariantId AS variantId
            FROM ProductImages pi
            WHERE pi.ProductId = p.ProductId
            ORDER BY pi.IsPrimary DESC, pi.ImageId ASC
            FOR JSON PATH
        ) AS images,

        -- Reviews
        (
            SELECT 
                r.ReviewId AS reviewId, r.Rating AS rating, r.Comment AS comment, r.CreatedAt AS createdAt,
                u.FullName AS 'user.fullName'
            FROM Reviews r
            JOIN Users u ON r.UserId = u.UserId
            WHERE r.ProductId = p.ProductId
            ORDER BY r.CreatedAt DESC
            FOR JSON PATH
        ) AS reviews

    FROM Products p
    LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
    LEFT JOIN Brands b ON p.BrandId = b.BrandId
    WHERE p.ProductId = @Id
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;

    -- Optional: Similar Products? (Future enhancement)
END
GO

PRINT 'Created procedure sp_GetProductDetails';
GO

GO

/* =============================================================
   FILE: procedures/08_sp_search_products.sql
   ============================================================= */

/* =============================================================
   STORED PROCEDURE: sp_SearchProducts
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Full-Text Search for products using CONTAINS.
                Returns ranked results by relevance.
   USAGE: EXEC sp_SearchProducts @SearchTerm = 'áo thun';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_SearchProducts', 'P') IS NOT NULL
    DROP PROCEDURE sp_SearchProducts;
GO

CREATE PROCEDURE sp_SearchProducts
    @SearchTerm NVARCHAR(255),
    @MaxResults INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate input
    IF @SearchTerm IS NULL OR LTRIM(RTRIM(@SearchTerm)) = ''
    BEGIN
        RAISERROR('Search term cannot be empty', 16, 1);
        RETURN;
    END

    -- Format search term by removing diacritics
    DECLARE @NormalizedTerm NVARCHAR(255);
    SET @NormalizedTerm = dbo.fn_RemoveDiacritics(@SearchTerm);

    -- Use optimized LIKE on indexed normalized columns
    SELECT TOP (@MaxResults)
        p.ProductId AS productId,
        p.Name AS name,
        p.Slug AS slug,
        p.Description AS description,
        p.BasePrice AS basePrice,
        p.Status AS status,
        c.Name AS categoryName,
        c.Slug AS categorySlug,
        b.Name AS brandName,
        
        -- Get primary image
        (SELECT TOP 1 pi.ImageUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryImageUrl,
        (SELECT TOP 1 pi.ThumbnailUrl FROM ProductImages pi WHERE pi.ProductId = p.ProductId AND pi.IsPrimary = 1) AS primaryThumbnailUrl,
        
        -- Simple relevance: Name match = 2, Description match = 1
        CASE 
            WHEN p.NameNormalized LIKE '%' + @NormalizedTerm + '%' THEN 2
            ELSE 1
        END AS relevance
        
    FROM Products p
    LEFT JOIN Categories c ON p.CategoryId = c.CategoryId
    LEFT JOIN Brands b ON p.BrandId = b.BrandId
    
    WHERE p.IsDeleted = 0 
      AND p.Status = 'Active'
      AND (p.NameNormalized LIKE '%' + @NormalizedTerm + '%' 
           OR p.DescriptionNormalized LIKE '%' + @NormalizedTerm + '%')
    
    ORDER BY relevance DESC, p.CreatedAt DESC;

END
GO

PRINT 'Created procedure sp_SearchProducts';
GO

GO

/* =============================================================
   FILE: procedures/09_sp_checkout.sql
   ============================================================= */

/* =============================================================
   STORED PROCEDURE: sp_Checkout
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Process user checkout atomically.
                Validate Stock -> Deduct Stock -> Create Order -> Clear Cart
   USAGE: EXEC sp_Checkout @UserId=1, @PaymentMethod='COD';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_Checkout', 'P') IS NOT NULL
    DROP PROCEDURE sp_Checkout;
GO

CREATE PROCEDURE sp_Checkout
    @UserId INT,
    @PaymentMethod NVARCHAR(50), -- 'COD', 'CreditCard', 'Paypal'
    @CustomerName NVARCHAR(100) = N'Khách hàng',
    @CustomerPhone NVARCHAR(20) = N'0000000000',
    @ShippingCity NVARCHAR(50) = N'Hà Nội',
    @ShippingDistrict NVARCHAR(50) = N'Không xác định',
    @ShippingWard NVARCHAR(50) = NULL,
    @ShippingAddressDetail NVARCHAR(200) = N'Không xác định',
    @ShippingAddress NVARCHAR(500) = NULL  -- Legacy param kept for backwards compatibility
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- Auto-rollback on error

    DECLARE @OrderId INT = 0;
    DECLARE @TotalAmount DECIMAL(18, 2) = 0;
    DECLARE @CartId INT;

    -- 1. Get User's Active Cart
    SELECT @CartId = CartId 
    FROM Carts 
    WHERE UserId = @UserId; -- Assuming only 1 active cart per user logic, or user passes CartId

    IF @CartId IS NULL
    BEGIN
        RAISERROR('No active cart found for user.', 16, 1);
        RETURN;
    END

    -- 2. Calculate Total Amount
    SELECT @TotalAmount = SUM(ci.Quantity * pv.Price)
    FROM CartItems ci
    JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
    WHERE ci.CartId = @CartId;

    IF @TotalAmount IS NULL OR @TotalAmount = 0
    BEGIN
        RAISERROR('Cart is empty.', 16, 1);
        RETURN;
    END

    -- START TRANSACTION
    BEGIN TRANSACTION;

    BEGIN TRY
        -- 3. Check Stock Availability & Deduct Stock
        -- Strategy: Use UPDATE directly with check to lock rows and validate in one step
        -- If any update fails (Stock < Qty), it will raise error via check constraint 
        -- or we check @@ROWCOUNT if we use WHERE clause.
        
        -- Better approach: Check first (Dirty read safe? No. Use row lock or just rely on Update)
        -- Let's iterate or use set-based update check.
        
        -- Check if any item has insufficient stock
        IF EXISTS (
            SELECT 1
            FROM CartItems ci
            JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
            WHERE ci.CartId = @CartId
            AND pv.StockQuantity < ci.Quantity
        )
        BEGIN
            RAISERROR('Insufficient stock for one or more items.', 16, 1);
        END

        -- Deduct Stock
        UPDATE pv
        SET pv.StockQuantity = pv.StockQuantity - ci.Quantity
        FROM ProductVariants pv
        JOIN CartItems ci ON pv.VariantId = ci.VariantId
        WHERE ci.CartId = @CartId;

        -- 4. Create Order
        INSERT INTO Orders (
            UserId, OrderNumber, CustomerName, CustomerPhone,
            ShippingCity, ShippingDistrict, ShippingWard, ShippingAddressDetail,
            TotalAmount, Status, PaymentMethod, CreatedAt
        )
        VALUES (
            @UserId,
            'ORD-' + CONVERT(NVARCHAR(20), GETDATE(), 112) + '-' + SUBSTRING(CAST(NEWID() AS NVARCHAR(36)), 1, 8),
            @CustomerName,
            @CustomerPhone,
            @ShippingCity,
            @ShippingDistrict,
            @ShippingWard,
            @ShippingAddressDetail,
            @TotalAmount,
            'Pending',
            @PaymentMethod,
            GETDATE()
        );
        
        SET @OrderId = SCOPE_IDENTITY();

        -- 5. Create OrderItems (include ProductName, SKU, VariantName from joined tables)
        INSERT INTO OrderItems (OrderId, VariantId, ProductName, SKU, VariantName, Quantity, UnitPrice)
        SELECT 
            @OrderId, 
            ci.VariantId, 
            p.Name,
            pv.SKU,
            pv.SKU,  -- VariantName defaults to SKU; can be enhanced later
            ci.Quantity, 
            pv.Price
        FROM CartItems ci
        JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
        JOIN Products p ON pv.ProductId = p.ProductId
        WHERE ci.CartId = @CartId;

        -- 6. Create Payment Record
        INSERT INTO Payments (OrderId, PaymentMethod, PaymentDate, Amount, Status)
        VALUES (@OrderId, @PaymentMethod, GETDATE(), @TotalAmount, 'Pending');

        -- 7. Clear Cart
        DELETE FROM CartItems WHERE CartId = @CartId;
        -- Optional: DELETE FROM Carts WHERE CartId = @CartId; if carts are transient

        COMMIT TRANSACTION;
        
        -- Return the new OrderId
        SELECT @OrderId AS OrderId, 'Success' AS Status;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT 'Created procedure sp_Checkout';
GO

GO

/* =============================================================
   FILE: fulltext/10_fulltext_setup.sql
   ============================================================= */

/* =============================================================
   FULL-TEXT SEARCH SETUP
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Enable Full-Text Search on Products table for
                intelligent product search with ranking.
   ============================================================= */

USE AISTHEA;
GO

-- Check if Full-Text Search is installed
IF FULLTEXTSERVICEPROPERTY('IsFulltextInstalled') = 1
BEGIN
    PRINT 'Full-Text Search service is installed. Proceeding with setup...';
    
    -- Step 1: Create Full-Text Catalog
    IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'ftCatalog_AISTHEA')
    BEGIN
        CREATE FULLTEXT CATALOG ftCatalog_AISTHEA AS DEFAULT;
        PRINT 'Created Full-Text Catalog: ftCatalog_AISTHEA';
    END
    ELSE
    BEGIN
        PRINT 'Full-Text Catalog already exists.';
    END

    -- Step 2: Create Full-Text Index on Products table
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Products'))
    BEGIN
        -- Dynamically resolve the actual PK name
        DECLARE @ProductsPKName NVARCHAR(255);
        SELECT @ProductsPKName = name 
        FROM sys.key_constraints 
        WHERE type = 'PK' AND parent_object_id = OBJECT_ID('dbo.Products');

        IF @ProductsPKName IS NOT NULL
        BEGIN
            DECLARE @Sql NVARCHAR(MAX) = '
            CREATE FULLTEXT INDEX ON Products
            (
                Name LANGUAGE 1033,
                Description LANGUAGE 1033
            )
            KEY INDEX ' + QUOTENAME(@ProductsPKName) + '
            ON ftCatalog_AISTHEA
            WITH CHANGE_TRACKING AUTO;';
            
            EXEC sp_executesql @Sql;
            PRINT 'Created Full-Text Index on Products table using PK: ' + @ProductsPKName;
        END
        ELSE
        BEGIN
            PRINT 'WARNING: Could not find PK on Products table. Full-text index skipped.';
        END
    END
    ELSE
    BEGIN
        PRINT 'Full-Text Index on Products already exists.';
    END

    -- Step 3: (Optional) Create Full-Text Index on Reviews
    IF NOT EXISTS (SELECT * FROM sys.fulltext_indexes WHERE object_id = OBJECT_ID('Reviews'))
    BEGIN
        DECLARE @ReviewPKName NVARCHAR(128);
        SELECT @ReviewPKName = name FROM sys.indexes WHERE object_id = OBJECT_ID('Reviews') AND is_primary_key = 1;
        
        IF @ReviewPKName IS NOT NULL
        BEGIN
            DECLARE @SqlReview NVARCHAR(MAX) = 'CREATE FULLTEXT INDEX ON Reviews (Comment LANGUAGE 1033) KEY INDEX ' + QUOTENAME(@ReviewPKName) + ' ON ftCatalog_AISTHEA WITH CHANGE_TRACKING AUTO';
            EXEC sp_executesql @SqlReview;
            PRINT 'Created Full-Text Index on Reviews(Comment)';
        END
    END
END
ELSE
BEGIN
    PRINT '-------------------------------------------------------------------------';
    PRINT 'WARNING: Full-Text Search service is NOT installed on this SQL instance.';
    PRINT 'The full-text index on Products will not be created.';
    PRINT 'Search functionality will fall back to using LIKE in sp_SearchProducts.';
    PRINT '-------------------------------------------------------------------------';
END
GO

PRINT '';
PRINT 'Full-Text Search setup complete!';
GO

GO

/* =============================================================
   FILE: fulltext/11_fulltext_optimized_search.sql
   ============================================================= */

/* =============================================================
   COMPLETE SEARCH OPTIMIZATION SETUP
   Proper SET options throughout
   ============================================================= */

USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ⚠️  SAFE DROP+RECREATE: Only drop fn_RemoveDiacritics if computed columns do NOT exist yet.
--     If 01_schema.sql ran first, computed columns exist and we cannot drop the function.
--     In that case, the function is already correct and we skip the recreate.
IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NULL
    AND COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NULL
BEGIN
    -- Safe to drop and recreate the function (no computed columns depend on it yet)
    IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NOT NULL
        DROP FUNCTION dbo.fn_RemoveDiacritics;

    PRINT 'Dropped fn_RemoveDiacritics (safe - no computed columns exist yet)';
END
ELSE
BEGIN
    PRINT 'Skipping DROP fn_RemoveDiacritics — computed columns already exist (01_schema.sql ran first). Function is already up-to-date.';
END
GO

-- Create function only if it does not exist (either fresh install or was just dropped above)
IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NULL
BEGIN
    EXEC sp_executesql N'
    CREATE FUNCTION dbo.fn_RemoveDiacritics(@input NVARCHAR(MAX))
    RETURNS NVARCHAR(850)
    WITH SCHEMABINDING
    AS
    BEGIN
        DECLARE @result NVARCHAR(850) = CAST(@input AS NVARCHAR(850));
        SET @result = REPLACE(@result, N''à'', ''a''); SET @result = REPLACE(@result, N''á'', ''a'');
        SET @result = REPLACE(@result, N''ả'', ''a''); SET @result = REPLACE(@result, N''ã'', ''a'');
        SET @result = REPLACE(@result, N''ạ'', ''a''); SET @result = REPLACE(@result, N''â'', ''a'');
        SET @result = REPLACE(@result, N''ầ'', ''a''); SET @result = REPLACE(@result, N''ấ'', ''a'');
        SET @result = REPLACE(@result, N''ẩ'', ''a''); SET @result = REPLACE(@result, N''ẫ'', ''a'');
        SET @result = REPLACE(@result, N''ậ'', ''a''); SET @result = REPLACE(@result, N''ă'', ''a'');
        SET @result = REPLACE(@result, N''ằ'', ''a''); SET @result = REPLACE(@result, N''ắ'', ''a'');
        SET @result = REPLACE(@result, N''ẳ'', ''a''); SET @result = REPLACE(@result, N''ẵ'', ''a'');
        SET @result = REPLACE(@result, N''ặ'', ''a'');
        SET @result = REPLACE(@result, N''è'', ''e''); SET @result = REPLACE(@result, N''é'', ''e'');
        SET @result = REPLACE(@result, N''ẻ'', ''e''); SET @result = REPLACE(@result, N''ẽ'', ''e'');
        SET @result = REPLACE(@result, N''ẹ'', ''e''); SET @result = REPLACE(@result, N''ê'', ''e'');
        SET @result = REPLACE(@result, N''ề'', ''e''); SET @result = REPLACE(@result, N''ế'', ''e'');
        SET @result = REPLACE(@result, N''ể'', ''e''); SET @result = REPLACE(@result, N''ễ'', ''e'');
        SET @result = REPLACE(@result, N''ệ'', ''e'');
        SET @result = REPLACE(@result, N''ì'', ''i''); SET @result = REPLACE(@result, N''í'', ''i'');
        SET @result = REPLACE(@result, N''ỉ'', ''i''); SET @result = REPLACE(@result, N''ĩ'', ''i'');
        SET @result = REPLACE(@result, N''ị'', ''i'');
        SET @result = REPLACE(@result, N''ò'', ''o''); SET @result = REPLACE(@result, N''ó'', ''o'');
        SET @result = REPLACE(@result, N''ỏ'', ''o''); SET @result = REPLACE(@result, N''õ'', ''o'');
        SET @result = REPLACE(@result, N''ọ'', ''o''); SET @result = REPLACE(@result, N''ô'', ''o'');
        SET @result = REPLACE(@result, N''ồ'', ''o''); SET @result = REPLACE(@result, N''ố'', ''o'');
        SET @result = REPLACE(@result, N''ổ'', ''o''); SET @result = REPLACE(@result, N''ỗ'', ''o'');
        SET @result = REPLACE(@result, N''ộ'', ''o''); SET @result = REPLACE(@result, N''ơ'', ''o'');
        SET @result = REPLACE(@result, N''ờ'', ''o''); SET @result = REPLACE(@result, N''ớ'', ''o'');
        SET @result = REPLACE(@result, N''ở'', ''o''); SET @result = REPLACE(@result, N''ỡ'', ''o'');
        SET @result = REPLACE(@result, N''ợ'', ''o'');
        SET @result = REPLACE(@result, N''ù'', ''u''); SET @result = REPLACE(@result, N''ú'', ''u'');
        SET @result = REPLACE(@result, N''ủ'', ''u''); SET @result = REPLACE(@result, N''ũ'', ''u'');
        SET @result = REPLACE(@result, N''ụ'', ''u''); SET @result = REPLACE(@result, N''ư'', ''u'');
        SET @result = REPLACE(@result, N''ừ'', ''u''); SET @result = REPLACE(@result, N''ứ'',  ''u'');
        SET @result = REPLACE(@result, N''ử'', ''u''); SET @result = REPLACE(@result, N''ữ'', ''u'');
        SET @result = REPLACE(@result, N''ự'', ''u'');
        SET @result = REPLACE(@result, N''ỳ'', ''y''); SET @result = REPLACE(@result, N''ý'', ''y'');
        SET @result = REPLACE(@result, N''ỷ'', ''y''); SET @result = REPLACE(@result, N''ỹ'', ''y'');
        SET @result = REPLACE(@result, N''ỵ'', ''y'');
        SET @result = REPLACE(@result, N''đ'', ''d'');
        SET @result = REPLACE(@result, N''À'', ''A''); SET @result = REPLACE(@result, N''Á'', ''A'');
        SET @result = REPLACE(@result, N''Ả'', ''A''); SET @result = REPLACE(@result, N''Ã'', ''A'');
        SET @result = REPLACE(@result, N''Ạ'', ''A''); SET @result = REPLACE(@result, N''Â'', ''A'');
        SET @result = REPLACE(@result, N''Ầ'', ''A''); SET @result = REPLACE(@result, N''Ấ'', ''A'');
        SET @result = REPLACE(@result, N''Ẩ'', ''A''); SET @result = REPLACE(@result, N''Ẫ'', ''A'');
        SET @result = REPLACE(@result, N''Ậ'', ''A''); SET @result = REPLACE(@result, N''Ă'', ''A'');
        SET @result = REPLACE(@result, N''Ằ'', ''A''); SET @result = REPLACE(@result, N''Ắ'', ''A'');
        SET @result = REPLACE(@result, N''Ẳ'', ''A''); SET @result = REPLACE(@result, N''Ẵ'', ''A'');
        SET @result = REPLACE(@result, N''Ặ'', ''A'');
        SET @result = REPLACE(@result, N''È'', ''E''); SET @result = REPLACE(@result, N''É'', ''E'');
        SET @result = REPLACE(@result, N''Ẻ'', ''E''); SET @result = REPLACE(@result, N''Ẽ'', ''E'');
        SET @result = REPLACE(@result, N''Ẹ'', ''E''); SET @result = REPLACE(@result, N''Ê'', ''E'');
        SET @result = REPLACE(@result, N''Ề'', ''E''); SET @result = REPLACE(@result, N''Ế'', ''E'');
        SET @result = REPLACE(@result, N''Ể'', ''E''); SET @result = REPLACE(@result, N''Ễ'', ''E'');
        SET @result = REPLACE(@result, N''Ệ'', ''E'');
        SET @result = REPLACE(@result, N''Ì'', ''I''); SET @result = REPLACE(@result, N''Í'', ''I'');
        SET @result = REPLACE(@result, N''Ỉ'', ''I''); SET @result = REPLACE(@result, N''Ĩ'', ''I'');
        SET @result = REPLACE(@result, N''Ị'', ''I'');
        SET @result = REPLACE(@result, N''Ò'', ''O''); SET @result = REPLACE(@result, N''Ó'', ''O'');
        SET @result = REPLACE(@result, N''Ỏ'', ''O''); SET @result = REPLACE(@result, N''Õ'', ''O'');
        SET @result = REPLACE(@result, N''Ọ'', ''O''); SET @result = REPLACE(@result, N''Ô'', ''O'');
        SET @result = REPLACE(@result, N''Ồ'', ''O''); SET @result = REPLACE(@result, N''Ố'', ''O'');
        SET @result = REPLACE(@result, N''Ổ'', ''O''); SET @result = REPLACE(@result, N''Ỗ'', ''O'');
        SET @result = REPLACE(@result, N''Ộ'', ''O''); SET @result = REPLACE(@result, N''Ơ'', ''O'');
        SET @result = REPLACE(@result, N''Ờ'', ''O''); SET @result = REPLACE(@result, N''Ớ'', ''O'');
        SET @result = REPLACE(@result, N''Ở'', ''O''); SET @result = REPLACE(@result, N''Ỡ'', ''O'');
        SET @result = REPLACE(@result, N''Ợ'', ''O'');
        SET @result = REPLACE(@result, N''Ù'', ''U''); SET @result = REPLACE(@result, N''Ú'', ''U'');
        SET @result = REPLACE(@result, N''Ủ'', ''U''); SET @result = REPLACE(@result, N''Ũ'', ''U'');
        SET @result = REPLACE(@result, N''Ụ'', ''U''); SET @result = REPLACE(@result, N''Ư'', ''U'');
        SET @result = REPLACE(@result, N''Ừ'', ''U''); SET @result = REPLACE(@result, N''Ứ'', ''U'');
        SET @result = REPLACE(@result, N''Ử'', ''U''); SET @result = REPLACE(@result, N''Ữ'', ''U'');
        SET @result = REPLACE(@result, N''Ự'', ''U'');
        SET @result = REPLACE(@result, N''Ỳ'', ''Y''); SET @result = REPLACE(@result, N''Ý'', ''Y'');
        SET @result = REPLACE(@result, N''Ỷ'', ''Y''); SET @result = REPLACE(@result, N''Ỹ'', ''Y'');
        SET @result = REPLACE(@result, N''Ỵ'', ''Y'');
        SET @result = REPLACE(@result, N''Đ'', ''D'');
        RETURN CAST(LOWER(@result) AS NVARCHAR(850));
    END';
    PRINT 'Created function fn_RemoveDiacritics';
END
ELSE
BEGIN
    PRINT 'fn_RemoveDiacritics already exists — skipping create.';
END
GO

-- Add computed columns if missing
IF COL_LENGTH('dbo.Products', 'NameNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED;
    PRINT 'Added computed column NameNormalized';
END
ELSE
BEGIN
    PRINT 'NameNormalized already exists';
END

IF COL_LENGTH('dbo.Products', 'DescriptionNormalized') IS NULL
BEGIN
    ALTER TABLE dbo.Products ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED;
    PRINT 'Added computed column DescriptionNormalized';
END
ELSE
BEGIN
    PRINT 'DescriptionNormalized already exists';
END
GO

-- Create indexes if missing
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_NameNormalized ON dbo.Products(NameNormalized)
    WHERE IsDeleted = 0;
    PRINT 'Created index IX_Products_NameNormalized';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_DescriptionNormalized ON dbo.Products(DescriptionNormalized)
    WHERE IsDeleted = 0;
    PRINT 'Created index IX_Products_DescriptionNormalized';
END
GO

PRINT '';
PRINT 'Search optimization complete!';
GO

GO

/* =============================================================
   FILE: fulltext/12_add_computed_columns.sql
   ============================================================= */

/* =============================================================
   ADD COMPUTED COLUMNS (MANUAL FIX)
   Run this separately if optimized_search.sql fails
   ============================================================= */

USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Check and add NameNormalized
IF COL_LENGTH('Products', 'NameNormalized') IS NULL
BEGIN
    EXEC sp_executesql N'ALTER TABLE Products ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED';
    PRINT 'Added computed column Products.NameNormalized';
END
ELSE
BEGIN
    PRINT 'NameNormalized column already exists';
END

-- Check and add DescriptionNormalized  
IF COL_LENGTH('Products', 'DescriptionNormalized') IS NULL
BEGIN
    EXEC sp_executesql N'ALTER TABLE Products ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED';
    PRINT 'Added computed column Products.DescriptionNormalized';
END
ELSE
BEGIN
    PRINT 'DescriptionNormalized column already exists';
END
GO

-- Create indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_NameNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_NameNormalized ON Products(NameNormalized)
    WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Created index IX_Products_NameNormalized';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Products_DescriptionNormalized' AND object_id = OBJECT_ID('Products'))
BEGIN
    CREATE INDEX IX_Products_DescriptionNormalized ON Products(DescriptionNormalized)
    WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT 'Created index IX_Products_DescriptionNormalized';
END
GO

PRINT 'Computed columns and indexes setup complete!';
GO

GO

/* =============================================================
   FILE: migrations/03_return_refund_migration.sql
   ============================================================= */

/* =============================================================
   MIGRATION: Return & Refund Module
   Adds: OrderReturns table + Orders.UpdatedAt column + Refunds table
   Safe to re-run: uses IF NOT EXISTS guards
   ============================================================= */

-- ─── 1. Add UpdatedAt column to Orders (if it does not already exist) ─────────
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Orders') AND name = N'UpdatedAt'
)
BEGIN
    ALTER TABLE dbo.Orders
        ADD UpdatedAt DATETIME2 NULL DEFAULT GETDATE();

    PRINT '✔ Orders.UpdatedAt column added.';
END
ELSE
BEGIN
    PRINT '– Orders.UpdatedAt already exists, skipping.';
END
GO

-- Set UpdatedAt = CreatedAt for existing rows (so 7-day window works correctly)
UPDATE dbo.Orders
SET UpdatedAt = CreatedAt
WHERE UpdatedAt IS NULL AND CreatedAt IS NOT NULL;
GO

-- ─── 2. Create OrderReturns table (if it does not already exist) ──────────────
IF NOT EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.OrderReturns') AND type = N'U'
)
BEGIN
    CREATE TABLE dbo.OrderReturns (
        ReturnId    INT              NOT NULL IDENTITY(1,1),
        OrderId     INT              NOT NULL,             -- FK → Orders (unique: 1 return per order)
        UserId      INT              NULL,                 -- FK → Users (nullable: guest orders)
        Reason      NVARCHAR(500)    NOT NULL,
        ProofImages NVARCHAR(MAX)    NOT NULL DEFAULT N'[]', -- JSON array of Cloudinary URLs
        [Status]    NVARCHAR(30)     NOT NULL DEFAULT N'PENDING_APPROVAL',
        AdminNote   NVARCHAR(500)    NULL,
        CreatedAt   DATETIME2        NOT NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME2        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_OrderReturns PRIMARY KEY (ReturnId),
        CONSTRAINT UQ_OrderReturns_OrderId UNIQUE (OrderId),
        CONSTRAINT FK_OrderReturns_Orders
            FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
            ON DELETE CASCADE,
        CONSTRAINT FK_OrderReturns_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId)
            ON DELETE SET NULL
    );

    -- Indexes
    CREATE INDEX IX_OrderReturns_OrderId ON dbo.OrderReturns (OrderId);
    CREATE INDEX IX_OrderReturns_Status  ON dbo.OrderReturns ([Status]);
    CREATE INDEX IX_OrderReturns_UserId  ON dbo.OrderReturns (UserId);

    PRINT '✔ OrderReturns table created.';
END
ELSE
BEGIN
    PRINT '– OrderReturns table already exists, skipping.';
END
GO

-- ─── 3. Create Refunds table — Financial Refund Ledger (if not already exists) ─
-- type:   FULL | PARTIAL
-- method: ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
-- status: PENDING | PROCESSING | SUCCESS | FAILED
IF NOT EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.Refunds') AND type = N'U'
)
BEGIN
    CREATE TABLE dbo.Refunds (
        RefundId             INT              NOT NULL IDENTITY(1,1),
        OrderId              INT              NOT NULL,           -- FK → Orders (CASCADE)
        PaymentId            INT              NULL,               -- FK → Payments (NO ACTION)
        Amount               DECIMAL(18,2)    NOT NULL,
        [Type]               NVARCHAR(10)     NOT NULL,           -- FULL | PARTIAL
        Method               NVARCHAR(25)     NOT NULL,           -- ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
        [Status]             NVARCHAR(15)     NOT NULL DEFAULT N'PENDING',
        GatewayTransactionId NVARCHAR(100)    NULL,
        Reason               NVARCHAR(500)    NOT NULL,
        GatewayError         NVARCHAR(500)    NULL,
        CreatedBy            INT              NULL,
        CreatedAt            DATETIME2        NOT NULL DEFAULT GETDATE(),
        UpdatedAt            DATETIME2        NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_Refunds PRIMARY KEY (RefundId),
        CONSTRAINT FK_Refunds_Orders
            FOREIGN KEY (OrderId) REFERENCES dbo.Orders (OrderId)
            ON DELETE CASCADE
            ON UPDATE NO ACTION,
        CONSTRAINT FK_Refunds_Payments
            FOREIGN KEY (PaymentId) REFERENCES dbo.Payments (PaymentId)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION
    );

    -- Indexes
    CREATE INDEX IX_Refunds_OrderId  ON dbo.Refunds (OrderId);
    CREATE INDEX IX_Refunds_Status   ON dbo.Refunds ([Status]);

    PRINT '✔ Refunds table created.';
END
ELSE
BEGIN
    PRINT '– Refunds table already exists, skipping.';
END
GO

PRINT '==============================================';
PRINT '  Return & Refund migration complete!';
PRINT '  (includes Refunds financial ledger table)';
PRINT '==============================================';
GO

GO

/* =============================================================
   FILE: migrations/20260227_add_return_order_feature/migration.sql
   ============================================================= */

/* =============================================================
   MIGRATION: Return Order Feature
   Adds: ReturnRequests, ReturnRequestItems, ReturnRequestAttachments,
         ReturnRequestStatusLogs, RefundTransactions tables
   Safe to re-run: uses IF NOT EXISTS guards
   ============================================================= */

-- ─── 1. ReturnRequests ────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[ReturnRequests]') AND type = N'U'
)
BEGIN
    CREATE TABLE [dbo].[ReturnRequests] (
        [ReturnRequestId]   INT IDENTITY(1,1) NOT NULL,
        [OrderId]           INT               NOT NULL,
        [UserId]            INT               NOT NULL,
        [Status]            NVARCHAR(20)      NOT NULL CONSTRAINT [DF_ReturnRequests_Status]      DEFAULT N'REQUESTED',
        [Reason]            NVARCHAR(20)      NOT NULL,
        [Note]              NVARCHAR(500)     NULL,
        [TotalRefundAmount] DECIMAL(18,2)     NOT NULL,
        [DeliveredAt]       DATETIME2         NOT NULL,
        [RequestDate]       DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequests_RequestDate] DEFAULT GETDATE(),
        [CreatedAt]         DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequests_CreatedAt]   DEFAULT GETDATE(),
        [UpdatedAt]         DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequests_UpdatedAt]   DEFAULT GETDATE(),
        CONSTRAINT [PK_ReturnRequests]        PRIMARY KEY ([ReturnRequestId]),
        CONSTRAINT [FK_ReturnRequests_Orders] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders]([OrderId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReturnRequests_Users]  FOREIGN KEY ([UserId])  REFERENCES [dbo].[Users]([UserId]),
        CONSTRAINT [CK_ReturnRequests_Status] CHECK ([Status] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED')),
        CONSTRAINT [CK_ReturnRequests_Reason] CHECK ([Reason] IN (N'DEFECTIVE',N'WRONG_ITEM',N'SIZE_ISSUE',N'CHANGED_MIND',N'OTHER'))
    );

    CREATE INDEX [IX_ReturnRequests_Status_CreatedAt]  ON [dbo].[ReturnRequests]([Status],  [CreatedAt]);
    CREATE INDEX [IX_ReturnRequests_UserId_CreatedAt]  ON [dbo].[ReturnRequests]([UserId],  [CreatedAt]);
    CREATE INDEX [IX_ReturnRequests_OrderId_CreatedAt] ON [dbo].[ReturnRequests]([OrderId], [CreatedAt]);

    PRINT '✔ ReturnRequests table created.';
END
ELSE
BEGIN
    PRINT '– ReturnRequests table already exists, skipping.';
END
GO

-- ─── 2. ReturnRequestItems ────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[ReturnRequestItems]') AND type = N'U'
)
BEGIN
    CREATE TABLE [dbo].[ReturnRequestItems] (
        [ReturnRequestItemId] INT IDENTITY(1,1) NOT NULL,
        [ReturnRequestId]     INT               NOT NULL,
        [OrderItemId]         INT               NOT NULL,
        [Quantity]            INT               NOT NULL,
        [UnitPrice]           DECIMAL(18,2)     NOT NULL,
        [Reason]              NVARCHAR(20)      NULL,
        [CreatedAt]           DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequestItems_CreatedAt] DEFAULT GETDATE(),
        [UpdatedAt]           DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequestItems_UpdatedAt] DEFAULT GETDATE(),
        CONSTRAINT [PK_ReturnRequestItems]                    PRIMARY KEY ([ReturnRequestItemId]),
        CONSTRAINT [FK_ReturnRequestItems_ReturnRequests]     FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReturnRequestItems_OrderItems]         FOREIGN KEY ([OrderItemId])     REFERENCES [dbo].[OrderItems]([OrderItemId]),
        CONSTRAINT [UQ_ReturnRequestItems_Request_OrderItem]  UNIQUE ([ReturnRequestId], [OrderItemId]),
        CONSTRAINT [CK_ReturnRequestItems_Reason]             CHECK ([Reason] IS NULL OR [Reason] IN (N'DEFECTIVE',N'WRONG_ITEM',N'SIZE_ISSUE',N'CHANGED_MIND',N'OTHER'))
    );

    CREATE INDEX [IX_ReturnRequestItems_OrderItemId] ON [dbo].[ReturnRequestItems]([OrderItemId]);

    PRINT '✔ ReturnRequestItems table created.';
END
ELSE
BEGIN
    PRINT '– ReturnRequestItems table already exists, skipping.';
END
GO

-- ─── 3. ReturnRequestAttachments ──────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[ReturnRequestAttachments]') AND type = N'U'
)
BEGIN
    CREATE TABLE [dbo].[ReturnRequestAttachments] (
        [AttachmentId]    INT IDENTITY(1,1) NOT NULL,
        [ReturnRequestId] INT               NOT NULL,
        [FileUrl]         NVARCHAR(1000)    NOT NULL,
        [CreatedAt]       DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequestAttachments_CreatedAt] DEFAULT GETDATE(),
        CONSTRAINT [PK_ReturnRequestAttachments]             PRIMARY KEY ([AttachmentId]),
        CONSTRAINT [FK_ReturnRequestAttachments_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_ReturnRequestAttachments_ReturnRequestId] ON [dbo].[ReturnRequestAttachments]([ReturnRequestId]);

    PRINT '✔ ReturnRequestAttachments table created.';
END
ELSE
BEGIN
    PRINT '– ReturnRequestAttachments table already exists, skipping.';
END
GO

-- ─── 4. ReturnRequestStatusLogs ───────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[ReturnRequestStatusLogs]') AND type = N'U'
)
BEGIN
    CREATE TABLE [dbo].[ReturnRequestStatusLogs] (
        [LogId]           INT IDENTITY(1,1) NOT NULL,
        [ReturnRequestId] INT               NOT NULL,
        [FromStatus]      NVARCHAR(20)      NULL,
        [ToStatus]        NVARCHAR(20)      NOT NULL,
        [ChangedBy]       INT               NOT NULL,
        [Comment]         NVARCHAR(500)     NULL,
        [CreatedAt]       DATETIME2         NOT NULL CONSTRAINT [DF_ReturnRequestStatusLogs_CreatedAt] DEFAULT GETDATE(),
        CONSTRAINT [PK_ReturnRequestStatusLogs]               PRIMARY KEY ([LogId]),
        CONSTRAINT [FK_ReturnRequestStatusLogs_ReturnRequests] FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReturnRequestStatusLogs_Users]          FOREIGN KEY ([ChangedBy])       REFERENCES [dbo].[Users]([UserId]),
        CONSTRAINT [CK_ReturnRequestStatusLogs_FromStatus]     CHECK ([FromStatus] IS NULL OR [FromStatus] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED')),
        CONSTRAINT [CK_ReturnRequestStatusLogs_ToStatus]       CHECK ([ToStatus] IN (N'REQUESTED',N'APPROVED',N'REJECTED',N'RECEIVED',N'REFUNDED'))
    );

    CREATE INDEX [IX_ReturnRequestStatusLogs_RequestId_CreatedAt] ON [dbo].[ReturnRequestStatusLogs]([ReturnRequestId], [CreatedAt]);
    CREATE INDEX [IX_ReturnRequestStatusLogs_ChangedBy]           ON [dbo].[ReturnRequestStatusLogs]([ChangedBy]);

    PRINT '✔ ReturnRequestStatusLogs table created.';
END
ELSE
BEGIN
    PRINT '– ReturnRequestStatusLogs table already exists, skipping.';
END
GO

-- ─── 5. RefundTransactions ────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[RefundTransactions]') AND type = N'U'
)
BEGIN
    CREATE TABLE [dbo].[RefundTransactions] (
        [TransactionId]   INT IDENTITY(1,1) NOT NULL,
        [ReturnRequestId] INT               NOT NULL,
        [Amount]          DECIMAL(18,2)     NOT NULL,
        [Method]          NVARCHAR(30)      NOT NULL,
        [Status]          NVARCHAR(20)      NOT NULL CONSTRAINT [DF_RefundTransactions_Status] DEFAULT N'PENDING',
        [IdempotencyKey]  NVARCHAR(100)     NOT NULL,
        [TransactionRef]  NVARCHAR(100)     NULL,
        [ProcessedBy]     INT               NULL,
        [CreatedAt]       DATETIME2         NOT NULL CONSTRAINT [DF_RefundTransactions_CreatedAt] DEFAULT GETDATE(),
        [UpdatedAt]       DATETIME2         NOT NULL CONSTRAINT [DF_RefundTransactions_UpdatedAt] DEFAULT GETDATE(),
        CONSTRAINT [PK_RefundTransactions]                 PRIMARY KEY ([TransactionId]),
        CONSTRAINT [FK_RefundTransactions_ReturnRequests]  FOREIGN KEY ([ReturnRequestId]) REFERENCES [dbo].[ReturnRequests]([ReturnRequestId]) ON DELETE CASCADE,
        CONSTRAINT [UQ_RefundTransactions_IdempotencyKey]  UNIQUE ([IdempotencyKey]),
        CONSTRAINT [CK_RefundTransactions_Method]          CHECK ([Method] IN (N'ORIGINAL_PAYMENT',N'WALLET_CREDIT')),
        CONSTRAINT [CK_RefundTransactions_Status]          CHECK ([Status] IN (N'PENDING',N'COMPLETED',N'FAILED'))
    );

    CREATE INDEX [IX_RefundTransactions_RequestId_Status] ON [dbo].[RefundTransactions]([ReturnRequestId], [Status]);
    CREATE INDEX [IX_RefundTransactions_CreatedAt]        ON [dbo].[RefundTransactions]([CreatedAt]);

    PRINT '✔ RefundTransactions table created.';
END
ELSE
BEGIN
    PRINT '– RefundTransactions table already exists, skipping.';
END
GO

PRINT '==============================================';
PRINT '  Return Order Feature migration complete!';
PRINT '==============================================';
GO

GO

/* =============================================================
   FILE: migrations/20260302_order_tracking_feature/migration.sql
   ============================================================= */

/* =============================================================
   MIGRATION: Order Tracking Feature
   Adds: Orders.OrderCode column, Orders.CustomerEmail column,
         Shipments table
   Safe to re-run: uses IF NOT EXISTS / column-existence guards
   ============================================================= */

-- ─── 1. Add OrderCode column to Orders ────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Orders') AND name = N'OrderCode'
)
BEGIN
    ALTER TABLE dbo.Orders ADD OrderCode NVARCHAR(50) NULL;
    PRINT '✔ Orders.OrderCode column added.';
END
ELSE
BEGIN
    PRINT '– Orders.OrderCode already exists, skipping.';
END
GO

-- Backfill OrderCode from OrderNumber for existing rows
UPDATE o
SET o.OrderCode = o.OrderNumber
FROM dbo.Orders o
WHERE o.OrderCode IS NULL;
GO

-- ─── 2. Add CustomerEmail column to Orders ────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Orders') AND name = N'CustomerEmail'
)
BEGIN
    ALTER TABLE dbo.Orders ADD CustomerEmail NVARCHAR(100) NULL;
    PRINT '✔ Orders.CustomerEmail column added.';
END
ELSE
BEGIN
    PRINT '– Orders.CustomerEmail already exists, skipping.';
END
GO

-- ─── 3. Indexes on Orders.OrderCode ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Orders_OrderCode' AND object_id = OBJECT_ID('dbo.Orders'))
BEGIN
    CREATE UNIQUE INDEX UQ_Orders_OrderCode ON dbo.Orders(OrderCode) WHERE OrderCode IS NOT NULL;
    PRINT '✔ UQ_Orders_OrderCode index created.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_OrderCode' AND object_id = OBJECT_ID('dbo.Orders'))
BEGIN
    CREATE INDEX IX_Orders_OrderCode ON dbo.Orders(OrderCode);
    PRINT '✔ IX_Orders_OrderCode index created.';
END
GO

-- ─── 4. Shipments table ───────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'dbo.Shipments') AND type = N'U'
)
BEGIN
    CREATE TABLE dbo.Shipments (
        ShipmentId         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        OrderId            INT               NOT NULL UNIQUE,
        Carrier            NVARCHAR(100)     NULL,
        TrackingNumber     NVARCHAR(100)     NULL,
        Eta                DATETIME2         NULL,
        LastKnownLocation  NVARCHAR(255)     NULL,
        CreatedAt          DATETIME2         NOT NULL DEFAULT GETDATE(),
        UpdatedAt          DATETIME2         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Shipments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE
    );

    CREATE INDEX IX_Shipments_TrackingNumber ON dbo.Shipments(TrackingNumber);

    PRINT '✔ Shipments table created.';
END
ELSE
BEGIN
    PRINT '– Shipments table already exists, skipping.';
END
GO

-- ─── 5. Index on OrderStatusHistory ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderStatusHistory_OrderId_ChangedAt' AND object_id = OBJECT_ID('dbo.OrderStatusHistory'))
BEGIN
    CREATE INDEX IX_OrderStatusHistory_OrderId_ChangedAt ON dbo.OrderStatusHistory(OrderId, ChangedAt);
    PRINT '✔ IX_OrderStatusHistory_OrderId_ChangedAt index created.';
END
GO

PRINT '==============================================';
PRINT '  Order Tracking Feature migration complete!';
PRINT '==============================================';
GO

/* =============================================================
   FILE: migrations/add_review_orderitem_images.sql
   ============================================================= */

-- ============================================================
-- Migration: Add orderItemId + images to Reviews table
-- ============================================================

-- 1. Add OrderItemId column (nullable, unique) to Reviews
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'OrderItemId'
)
BEGIN
  ALTER TABLE Reviews
    ADD OrderItemId INT NULL;

  -- Add unique constraint (one review per purchased item)
  ALTER TABLE Reviews
    ADD CONSTRAINT UQ_Reviews_OrderItemId UNIQUE (OrderItemId);

  -- Add foreign key to OrderItems
  ALTER TABLE Reviews
    ADD CONSTRAINT FK_Reviews_OrderItems
    FOREIGN KEY (OrderItemId)
    REFERENCES OrderItems(OrderItemId)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;

  PRINT 'Added OrderItemId column with UNIQUE constraint and FK to OrderItems.';
END
ELSE
BEGIN
  PRINT 'Column OrderItemId already exists in Reviews. Skipped.';
END
GO

-- 2. Add Images column (JSON array stored as nvarchar(max))
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'Reviews' AND COLUMN_NAME = 'Images'
)
BEGIN
  ALTER TABLE Reviews
    ADD Images NVARCHAR(MAX) DEFAULT '[]' NULL;

  PRINT 'Added Images column to Reviews.';
END
ELSE
BEGIN
  PRINT 'Column Images already exists in Reviews. Skipped.';
END
GO

-- 3. Expand Comment column from NVarChar(500) to NVarChar(1000)
ALTER TABLE Reviews
  ALTER COLUMN Comment NVARCHAR(1000) NULL;

PRINT 'Expanded Comment column to NVARCHAR(1000).';
GO

-- 4. Add index on UserId for query performance
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Reviews') AND name = 'IX_Reviews_UserId'
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_Reviews_UserId
    ON Reviews (UserId);

  PRINT 'Added index IX_Reviews_UserId.';
END
GO

PRINT '==============================================';
PRINT '  Review + OrderItem migration complete!';
PRINT '==============================================';
GO
/* =============================================================
   FILE: migrations/cart_persistent_merge.sql
   Description: Persistent Cart & Cart Merging feature
                - Carts.UserId becomes 1-to-1 with Users (unique + FK)
                - Carts.UpdatedAt column added
                - CartItems.AddedAt column added
                - UQ_CartItems_Cart_Variant unique constraint
   Date: 2026-03-05
   Version: schema.prisma v3.2
   ============================================================= */

USE AISTHEA;
GO

PRINT '';
PRINT 'Applying Persistent Cart & Cart Merging migration...';
GO

-- ============================================================
-- 1. Carts: Them cot UpdatedAt
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Carts' AND COLUMN_NAME = 'UpdatedAt'
)
BEGIN
    ALTER TABLE Carts
        ADD UpdatedAt DATETIME2 NULL CONSTRAINT DF_Carts_UpdatedAt DEFAULT GETDATE();
    PRINT '+ Added UpdatedAt column to Carts';
END
ELSE
BEGIN
    PRINT '! UpdatedAt already exists in Carts -- skipped';
END
GO

-- ============================================================
-- 2. Carts: Them FK Carts.UserId -> Users.UserId (ON DELETE CASCADE)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Carts_Users'
)
BEGIN
    -- Xoa bon ghi orphan truoc khi them FK
    DELETE FROM Carts
    WHERE UserId IS NOT NULL
      AND UserId NOT IN (SELECT UserId FROM Users);

    ALTER TABLE Carts
        ADD CONSTRAINT FK_Carts_Users
        FOREIGN KEY (UserId) REFERENCES Users(UserId)
        ON DELETE CASCADE
        ON UPDATE NO ACTION;

    PRINT '+ Added FK_Carts_Users (UserId -> Users.UserId, ON DELETE CASCADE)';
END
ELSE
BEGIN
    PRINT '! FK_Carts_Users already exists -- skipped';
END
GO

-- ============================================================
-- 3. Carts: Tao Filtered Unique Index UQ_Carts_UserId
--    (1 gio hang / user, cho phep nhieu NULL cho guest sessions)
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('Carts') AND name = 'UQ_Carts_UserId'
)
BEGIN
    -- Xu ly trung lap: giu lai gio moi nhat theo CartId
    WITH CTE_Dupes AS (
        SELECT CartId,
               ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY CartId DESC) AS rn
        FROM Carts
        WHERE UserId IS NOT NULL
    )
    DELETE FROM CTE_Dupes WHERE rn > 1;
    PRINT '+ Cleaned up duplicate Carts per UserId';

    -- Filtered Unique Index cho phep UserId = NULL
    CREATE UNIQUE INDEX UQ_Carts_UserId
        ON Carts (UserId)
        WHERE UserId IS NOT NULL;

    PRINT '+ Created UQ_Carts_UserId filtered unique index';
END
ELSE
BEGIN
    PRINT '! UQ_Carts_UserId already exists -- skipped';
END
GO

-- ============================================================
-- 4. CartItems: Them cot AddedAt
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CartItems' AND COLUMN_NAME = 'AddedAt'
)
BEGIN
    ALTER TABLE CartItems
        ADD AddedAt DATETIME2 NULL CONSTRAINT DF_CartItems_AddedAt DEFAULT GETDATE();
    PRINT '+ Added AddedAt column to CartItems';
END
ELSE
BEGIN
    PRINT '! AddedAt already exists in CartItems -- skipped';
END
GO

-- ============================================================
-- 5. CartItems: Them Unique Constraint [CartId, VariantId]
--    Ngan trung lap cung variant trong 1 gio hang
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('CartItems') AND name = 'UQ_CartItems_Cart_Variant'
)
BEGIN
    -- Xu ly trung lap: giu ban ghi co CartItemId lon nhat
    WITH CTE_Dupes AS (
        SELECT CartItemId,
               ROW_NUMBER() OVER (PARTITION BY CartId, VariantId ORDER BY CartItemId DESC) AS rn
        FROM CartItems
    )
    DELETE FROM CTE_Dupes WHERE rn > 1;
    PRINT '+ Cleaned up duplicate CartItems (same CartId + VariantId)';

    ALTER TABLE CartItems
        ADD CONSTRAINT UQ_CartItems_Cart_Variant
        UNIQUE (CartId, VariantId);

    PRINT '+ Created UQ_CartItems_Cart_Variant unique constraint';
END
ELSE
BEGIN
    PRINT '! UQ_CartItems_Cart_Variant already exists -- skipped';
END
GO

PRINT '';
PRINT '==============================================';
PRINT '  Persistent Cart & Cart Merging migration complete!';
PRINT '==============================================';
GO
