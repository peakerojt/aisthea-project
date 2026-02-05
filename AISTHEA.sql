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
        Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT CHK_User_Status CHECK (Status IN ('Active', 'Banned')),
        CONSTRAINT UQ_Users_GoogleId UNIQUE (GoogleId)
    );
    PRINT '✓ Created table: Users';
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
        CreatedAt DATETIME2 DEFAULT GETDATE()
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

-- Bảng Orders (depends on Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        OrderId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
        CustomerName NVARCHAR(100) NOT NULL,
        CustomerPhone NVARCHAR(20) NOT NULL,
        ShippingCity NVARCHAR(50) NOT NULL,
        ShippingDistrict NVARCHAR(50) NOT NULL,
        ShippingWard NVARCHAR(50),
        ShippingAddressDetail NVARCHAR(200) NOT NULL,
        TrackingNumber NVARCHAR(100) NULL,
        Carrier NVARCHAR(50) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(20) DEFAULT 'Pending',
        PaymentMethod NVARCHAR(50) DEFAULT 'COD',
        PaymentStatus NVARCHAR(20) DEFAULT 'Unpaid',
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
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
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
        CONSTRAINT FK_Products_Brands FOREIGN KEY (BrandId) REFERENCES Brands(BrandId)
    );
    PRINT '✓ Created table: Products';
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

-- Bảng Reviews (depends on Products, Users)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
BEGIN
    CREATE TABLE Reviews (
        ReviewId INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL,
        UserId INT NOT NULL,
        Rating INT CHECK (Rating >= 1 AND Rating <= 5),
        Comment NVARCHAR(500),
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_Reviews_Users FOREIGN KEY (UserId) REFERENCES Users(UserId)
    );
    PRINT '✓ Created table: Reviews';
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
        CONSTRAINT FK_CartItems_Carts FOREIGN KEY (CartId) REFERENCES Carts(CartId) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE
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

GO

PRINT '';
PRINT '========================================';
PRINT '✓ Database Schema Ready!';
PRINT '  - Database: AISTHEA';
PRINT '  - Tables: 19';
PRINT '  - Foreign Keys: 21';
PRINT '  - Google OAuth: Enabled';
PRINT '========================================';
GO
