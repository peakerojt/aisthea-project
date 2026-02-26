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
   SCHEMA UPDATES - ORDER MANAGEMENT SYSTEM
   Description: Add Note to Orders, add OrderStatusHistory table
   Date: 2026-02-26
   ============================================================= */

PRINT '';
PRINT 'Applying Order Management System updates...';
GO

-- Add Note column to Orders if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Orders'
    AND COLUMN_NAME = 'Note'
)
BEGIN
    ALTER TABLE Orders ADD Note NVARCHAR(500) NULL;
    PRINT '✓ Added Note column to Orders table';
END
ELSE
BEGIN
    PRINT '⚠ Note column already exists in Orders';
END
GO

-- Create OrderStatusHistory table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderStatusHistory')
BEGIN
    CREATE TABLE OrderStatusHistory (
        OrderStatusHistoryId INT IDENTITY(1,1) PRIMARY KEY,
        OrderId              INT NOT NULL,
        Status               NVARCHAR(20) NOT NULL,
        ChangedAt            DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_OrderStatusHistory_Orders
            FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    CREATE INDEX IX_OrderStatusHistory_OrderId ON OrderStatusHistory(OrderId);
    PRINT '✓ Created table: OrderStatusHistory';
END
ELSE
BEGIN
    PRINT '⚠ OrderStatusHistory table already exists';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✓ Order Management System Schema Ready!';
PRINT '========================================';
GO
