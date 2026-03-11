/* =============================================================
   FILE: server/database/01_schema_all.sql
   PROJECT: AISTHEA
   DATABASE: AISTHEA (SQL Server / T-SQL)
   DESCRIPTION: Full schema — synchronized with prisma/schema.prisma
   
   TABLES (31):
     Users, EmailVerificationTokens, PasswordResetTokens,
     Roles, UserRoles, Permissions, RolePermissions, UserLogins,
     Addresses, Brands, Categories, Attributes, AttributeValues,
     Products, ProductVariants, VariantAttributes, ProductImages,
     Carts, CartItems,
     Coupons, Orders, OrderItems, OrderStatusHistory,
     Shipments, Payments, Refunds,
     Reviews, InventoryLogs, OrderReturns,
     Warehouses, Inventory, InventoryReservations,
     InventoryTransactions, StockAdjustments, StockTransfers,
     PurchaseOrders
   ============================================================= */

USE AISTHEA;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '============================================================';
PRINT '  AISTHEA DATABASE SCHEMA SETUP';
PRINT '============================================================';
GO

/* =============================================================
   HELPER FUNCTION: Remove Vietnamese diacritics for search
   ============================================================= */

IF OBJECT_ID('dbo.fn_RemoveDiacritics', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_RemoveDiacritics;
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
    SET @result = REPLACE(@result, N'ừ', 'u'); SET @result = REPLACE(@result, N'ứ', 'u');
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
   LEVEL 0 — No Dependencies
   ============================================================= */

-- ── Roles ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        RoleId   INT           IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(50)  NOT NULL UNIQUE
    );
    PRINT '✓ Roles';
END
GO

-- ── Users ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserId       INT            IDENTITY(1,1) PRIMARY KEY,
        Email        NVARCHAR(100)  NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255)  NULL,
        FullName     NVARCHAR(100)  NOT NULL,
        Phone        NVARCHAR(20)   NULL,
        AvatarUrl    NVARCHAR(1000) NULL,          -- Cloudinary-ready
        GoogleId     NVARCHAR(255)  NULL,
        Status       NVARCHAR(20)   NOT NULL DEFAULT 'Pending',
        CreatedAt    DATETIME2      DEFAULT GETDATE(),
        UpdatedAt    DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT CHK_User_Status CHECK (Status IN ('Active', 'Banned', 'Pending'))
    );
    -- Filtered unique index allows multiple NULLs for GoogleId
    CREATE UNIQUE INDEX UQ_Users_GoogleId ON Users(GoogleId) WHERE GoogleId IS NOT NULL;
    CREATE NONCLUSTERED INDEX IX_Users_Email_Status ON Users(Email, Status);
    CREATE NONCLUSTERED INDEX IX_Users_Phone        ON Users(Phone) WHERE Phone IS NOT NULL;
    CREATE NONCLUSTERED INDEX IX_Users_Status       ON Users(Status);
    PRINT '✓ Users';
END
GO

-- ── Permissions ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Permissions')
BEGIN
    CREATE TABLE Permissions (
        PermissionId INT           IDENTITY(1,1) PRIMARY KEY,
        Code         NVARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'CREATE_PRODUCT'
        Module       NVARCHAR(50)  NOT NULL,           -- e.g. 'PRODUCT'
        Description  NVARCHAR(255) NOT NULL
    );
    CREATE NONCLUSTERED INDEX IX_Permissions_Module ON Permissions(Module);
    PRINT '✓ Permissions';
END
GO

-- ── Brands ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Brands')
BEGIN
    CREATE TABLE Brands (
        BrandId     INT           IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL
    );
    PRINT '✓ Brands';
END
GO

-- ── Attributes ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Attributes')
BEGIN
    CREATE TABLE Attributes (
        AttributeId INT          IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(50) NOT NULL UNIQUE
    );
    PRINT '✓ Attributes';
END
GO

-- ── Coupons ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Coupons')
BEGIN
    CREATE TABLE Coupons (
        CouponId          INT           IDENTITY(1,1) PRIMARY KEY,
        Code              NVARCHAR(50)  NOT NULL UNIQUE,
        Type              NVARCHAR(20)  NOT NULL,       -- 'FIXED_AMOUNT' | 'PERCENTAGE'
        Value             DECIMAL(18,2) NOT NULL,
        MaxDiscountAmount DECIMAL(18,2) NULL,
        MinOrderValue     DECIMAL(18,2) NOT NULL DEFAULT 0,
        StartDate         DATETIME2     NOT NULL,
        EndDate           DATETIME2     NOT NULL,
        UsageLimit        INT           NOT NULL,
        UsedCount         INT           NOT NULL DEFAULT 0,
        UsagePerUser      INT           NOT NULL DEFAULT 1,
        IsActive          BIT           NOT NULL DEFAULT 1,
        CreatedAt         DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt         DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    CREATE NONCLUSTERED INDEX IX_Coupons_Code     ON Coupons(Code);
    CREATE NONCLUSTERED INDEX IX_Coupons_IsActive ON Coupons(IsActive);
    PRINT '✓ Coupons';
END
GO

-- ── Warehouses ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Warehouses')
BEGIN
    CREATE TABLE Warehouses (
        WarehouseId INT           IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100) NOT NULL,
        Address     NVARCHAR(255) NULL,
        IsActive    BIT           NOT NULL DEFAULT 1,
        CreatedAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME2     NOT NULL DEFAULT GETDATE()
    );
    CREATE NONCLUSTERED INDEX IX_Warehouses_IsActive ON Warehouses(IsActive);
    PRINT '✓ Warehouses';
END
GO

/* =============================================================
   LEVEL 1 — Depends on Level 0
   ============================================================= */

-- ── EmailVerificationTokens ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmailVerificationTokens')
BEGIN
    CREATE TABLE EmailVerificationTokens (
        TokenId   INT           IDENTITY(1,1) PRIMARY KEY,
        UserId    INT           NOT NULL,
        Token     NVARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2     NOT NULL,
        CreatedAt DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT FK_EmailVerificationTokens_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ EmailVerificationTokens';
END
GO

-- ── PasswordResetTokens ──────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PasswordResetTokens')
BEGIN
    CREATE TABLE PasswordResetTokens (
        TokenId   INT           IDENTITY(1,1) PRIMARY KEY,
        UserId    INT           NOT NULL,
        Token     NVARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2     NOT NULL,
        CreatedAt DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT FK_PasswordResetTokens_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ PasswordResetTokens';
END
GO

-- ── UserRoles ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserRoles')
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
    );
    PRINT '✓ UserRoles';
END
GO

-- ── RolePermissions ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE RolePermissions (
        RoleId       INT NOT NULL,
        PermissionId INT NOT NULL,
        PRIMARY KEY (RoleId, PermissionId),
        CONSTRAINT FK_RolePermissions_Roles
            FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE,
        CONSTRAINT FK_RolePermissions_Permissions
            FOREIGN KEY (PermissionId) REFERENCES Permissions(PermissionId) ON DELETE CASCADE
    );
    PRINT '✓ RolePermissions';
END
GO

-- ── UserLogins ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserLogins')
BEGIN
    CREATE TABLE UserLogins (
        LoginProvider       NVARCHAR(50)   NOT NULL,
        ProviderKey         NVARCHAR(128)  NOT NULL,
        ProviderDisplayName NVARCHAR(100)  NULL,
        UserId              INT            NOT NULL,
        AccessToken         NVARCHAR(MAX)  NULL,
        RefreshToken        NVARCHAR(MAX)  NULL,
        TokenExpiry         DATETIME2      NULL,
        CreatedAt           DATETIME2      DEFAULT GETDATE(),
        UpdatedAt           DATETIME2      DEFAULT GETDATE(),
        PRIMARY KEY (LoginProvider, ProviderKey),
        CONSTRAINT FK_UserLogins_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_UserLogins_UserId ON UserLogins(UserId);
    PRINT '✓ UserLogins';
END
GO

-- ── Addresses ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Addresses')
BEGIN
    CREATE TABLE Addresses (
        AddressId     INT           IDENTITY(1,1) PRIMARY KEY,
        UserId        INT           NOT NULL,
        RecipientName NVARCHAR(100) NOT NULL,
        Phone         NVARCHAR(20)  NOT NULL,
        AddressLine   NVARCHAR(255) NOT NULL,
        City          NVARCHAR(50)  NOT NULL,
        District      NVARCHAR(50)  NULL,
        IsDefault     BIT           NULL DEFAULT 0,
        CONSTRAINT FK_Addresses_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Addresses';
END
GO

-- ── Categories (self-referencing) ────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Categories')
BEGIN
    CREATE TABLE Categories (
        CategoryId  INT            IDENTITY(1,1) PRIMARY KEY,
        ParentId    INT            NULL,
        Name        NVARCHAR(100)  NOT NULL,
        Slug        NVARCHAR(100)  NOT NULL UNIQUE,
        Description NVARCHAR(255)  NULL,
        ImageUrl    NVARCHAR(1000) NULL,
        CONSTRAINT FK_Categories_Parent
            FOREIGN KEY (ParentId) REFERENCES Categories(CategoryId)
    );
    PRINT '✓ Categories';
END
GO

-- ── AttributeValues ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttributeValues')
BEGIN
    CREATE TABLE AttributeValues (
        ValueId     INT          IDENTITY(1,1) PRIMARY KEY,
        AttributeId INT          NOT NULL,
        Value       NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_AttributeValues_Attributes
            FOREIGN KEY (AttributeId) REFERENCES Attributes(AttributeId) ON DELETE CASCADE
    );
    PRINT '✓ AttributeValues';
END
GO

-- ── Orders ───────────────────────────────────────────────────
-- Valid Status: Pending | Processing | Shipping | Delivered | Cancelled
--               Return_Requested | Returned
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        OrderId               INT           IDENTITY(1,1) PRIMARY KEY,
        UserId                INT           NULL,
        OrderCode             NVARCHAR(50)  NULL UNIQUE,
        OrderNumber           NVARCHAR(50)  NOT NULL UNIQUE,
        CustomerName          NVARCHAR(100) NOT NULL,
        CustomerEmail         NVARCHAR(100) NULL,
        CustomerPhone         NVARCHAR(20)  NOT NULL,
        ShippingCity          NVARCHAR(50)  NOT NULL,
        ShippingDistrict      NVARCHAR(50)  NOT NULL,
        ShippingWard          NVARCHAR(50)  NULL,
        ShippingAddressDetail NVARCHAR(200) NOT NULL,
        TrackingNumber        NVARCHAR(100) NULL,
        Carrier               NVARCHAR(50)  NULL,
        TotalAmount           DECIMAL(18,2) NOT NULL,
        DiscountAmount        DECIMAL(18,2) NULL DEFAULT 0,
        CouponId              INT           NULL,
        Status                NVARCHAR(20)  DEFAULT 'Pending',
        PaymentMethod         NVARCHAR(50)  DEFAULT 'COD',
        PaymentStatus         NVARCHAR(20)  DEFAULT 'Unpaid',
        Note                  NVARCHAR(500) NULL,
        CreatedAt             DATETIME2     DEFAULT GETDATE(),
        UpdatedAt             DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users   FOREIGN KEY (UserId)   REFERENCES Users(UserId),
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (CouponId) REFERENCES Coupons(CouponId)
    );
    CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt   ON Orders(CreatedAt);
    CREATE NONCLUSTERED INDEX IX_Orders_OrderNumber ON Orders(OrderNumber);
    CREATE NONCLUSTERED INDEX IX_Orders_OrderCode   ON Orders(OrderCode) WHERE OrderCode IS NOT NULL;
    CREATE NONCLUSTERED INDEX IX_Orders_Status      ON Orders(Status);
    CREATE NONCLUSTERED INDEX IX_Orders_UserId      ON Orders(UserId) WHERE UserId IS NOT NULL;
    PRINT '✓ Orders';
END
GO

/* =============================================================
   LEVEL 2 — Depends on Level 1
   ============================================================= */

-- ── Products ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE Products (
        ProductId             INT            IDENTITY(1,1) PRIMARY KEY,
        CategoryId            INT            NOT NULL,
        BrandId               INT            NULL,
        Name                  NVARCHAR(200)  NOT NULL,
        Slug                  NVARCHAR(200)  NOT NULL UNIQUE,
        Description           NVARCHAR(MAX)  NULL,
        BasePrice             DECIMAL(18,2)  NOT NULL,
        Status                NVARCHAR(20)   DEFAULT 'Active',
        IsDeleted             BIT            DEFAULT 0,
        DeletedAt             DATETIME2      NULL,
        CreatedAt             DATETIME2      DEFAULT GETDATE(),
        -- Computed columns for Vietnamese search (persisted for indexing)
        NameNormalized        AS dbo.fn_RemoveDiacritics(Name)        PERSISTED,
        DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED,
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
        CONSTRAINT FK_Products_Brands     FOREIGN KEY (BrandId)    REFERENCES Brands(BrandId)
    );
    CREATE NONCLUSTERED INDEX IX_Products_CategoryId     ON Products(CategoryId) WHERE IsDeleted = 0;
    CREATE NONCLUSTERED INDEX IX_Products_BrandId        ON Products(BrandId)    WHERE IsDeleted = 0 AND BrandId IS NOT NULL;
    CREATE NONCLUSTERED INDEX IX_Products_BasePrice      ON Products(BasePrice);
    CREATE NONCLUSTERED INDEX IX_Products_Name           ON Products(Name);
    CREATE NONCLUSTERED INDEX IX_Products_Status         ON Products(Status);
    CREATE NONCLUSTERED INDEX IX_Products_NameNormalized        ON Products(NameNormalized)        WHERE IsDeleted = 0 AND Status = 'Active';
    CREATE NONCLUSTERED INDEX IX_Products_DescriptionNormalized ON Products(DescriptionNormalized) WHERE IsDeleted = 0 AND Status = 'Active';
    PRINT '✓ Products';
END
GO

-- ── Payments ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payments')
BEGIN
    CREATE TABLE Payments (
        PaymentId       INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId         INT           NOT NULL,
        PaymentMethod   NVARCHAR(50)  NOT NULL,
        Amount          DECIMAL(18,2) NOT NULL,
        TransactionCode NVARCHAR(100) NULL,
        Status          NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
        PaymentDate     DATETIME2     DEFAULT GETDATE(),
        Note            NVARCHAR(500) NULL,
        CONSTRAINT FK_Payments_Orders
            FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    PRINT '✓ Payments';
END
GO

/* =============================================================
   LEVEL 3 — Depends on Level 2
   ============================================================= */

-- ── ProductVariants ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductVariants')
BEGIN
    CREATE TABLE ProductVariants (
        VariantId     INT           IDENTITY(1,1) PRIMARY KEY,
        ProductId     INT           NOT NULL,
        SKU           NVARCHAR(50)  NOT NULL UNIQUE,
        Price         DECIMAL(18,2) NOT NULL,
        StockQuantity INT           NOT NULL DEFAULT 0,
        IsDefault     BIT           NULL DEFAULT 0,
        IsDeleted     BIT           NULL DEFAULT 0,
        DeletedAt     DATETIME2     NULL,
        CONSTRAINT FK_ProductVariants_Products
            FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_ProductVariants_ProductId    ON ProductVariants(ProductId)    WHERE IsDeleted = 0;
    CREATE NONCLUSTERED INDEX IX_ProductVariants_StockQuantity ON ProductVariants(StockQuantity);
    PRINT '✓ ProductVariants';
END
GO

-- ── Carts ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Carts')
BEGIN
    CREATE TABLE Carts (
        CartId    INT           IDENTITY(1,1) PRIMARY KEY,
        UserId    INT           NULL UNIQUE,     -- 1-to-1 with User
        SessionId NVARCHAR(100) NULL,
        CreatedAt DATETIME2     DEFAULT GETDATE(),
        UpdatedAt DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT FK_Carts_Users
            FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
    );
    PRINT '✓ Carts';
END
GO

-- ── OrderItems ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderItems')
BEGIN
    CREATE TABLE OrderItems (
        OrderItemId INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId     INT           NOT NULL,
        VariantId   INT           NULL,
        ProductName NVARCHAR(200) NOT NULL,
        SKU         NVARCHAR(50)  NOT NULL,
        VariantName NVARCHAR(200) NOT NULL,
        UnitPrice   DECIMAL(18,2) NOT NULL,
        Quantity    INT           NOT NULL,
        CONSTRAINT FK_OrderItems_Orders   FOREIGN KEY (OrderId)   REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX IX_OrderItems_OrderId   ON OrderItems(OrderId);
    CREATE NONCLUSTERED INDEX IX_OrderItems_VariantId ON OrderItems(VariantId) WHERE VariantId IS NOT NULL;
    PRINT '✓ OrderItems';
END
GO

-- ── OrderStatusHistory ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderStatusHistory')
BEGIN
    CREATE TABLE OrderStatusHistory (
        OrderStatusHistoryId INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId              INT           NOT NULL,
        OldStatus            NVARCHAR(20)  NULL,
        Status               NVARCHAR(20)  NOT NULL,
        ChangedBy            INT           NULL,
        Note                 NVARCHAR(500) NULL,
        ChangedAt            DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_OrderStatusHistory_Orders
            FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderId           ON OrderStatusHistory(OrderId);
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_OrderId_ChangedAt ON OrderStatusHistory(OrderId, ChangedAt);
    PRINT '✓ OrderStatusHistory';
END
GO

-- ── Shipments ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Shipments')
BEGIN
    CREATE TABLE Shipments (
        ShipmentId        INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId           INT           NOT NULL UNIQUE,
        Carrier           NVARCHAR(100) NULL,
        TrackingNumber    NVARCHAR(100) NULL,
        Eta               DATETIME2     NULL,
        LastKnownLocation NVARCHAR(255) NULL,
        CreatedAt         DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt         DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Shipments_Orders
            FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_Shipments_TrackingNumber ON Shipments(TrackingNumber) WHERE TrackingNumber IS NOT NULL;
    PRINT '✓ Shipments';
END
GO

-- ── OrderReturns ─────────────────────────────────────────────
-- Status: PENDING_APPROVAL | APPROVED | REJECTED | COMPLETED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OrderReturns')
BEGIN
    CREATE TABLE OrderReturns (
        ReturnId    INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId     INT           NOT NULL UNIQUE,
        UserId      INT           NULL,
        Reason      NVARCHAR(500) NOT NULL,
        ProofImages NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        Status      NVARCHAR(30)  NOT NULL DEFAULT 'PENDING_APPROVAL',
        AdminNote   NVARCHAR(500) NULL,
        CreatedAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_OrderReturns_Orders FOREIGN KEY (OrderId) REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_OrderReturns_Users  FOREIGN KEY (UserId)  REFERENCES Users(UserId)   ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX IX_OrderReturns_OrderId ON OrderReturns(OrderId);
    CREATE NONCLUSTERED INDEX IX_OrderReturns_Status  ON OrderReturns(Status);
    CREATE NONCLUSTERED INDEX IX_OrderReturns_UserId  ON OrderReturns(UserId) WHERE UserId IS NOT NULL;
    PRINT '✓ OrderReturns';
END
GO

-- ── Refunds ──────────────────────────────────────────────────
-- type: FULL | PARTIAL
-- method: ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
-- status: PENDING | PROCESSING | SUCCESS | FAILED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Refunds')
BEGIN
    CREATE TABLE Refunds (
        RefundId             INT           IDENTITY(1,1) PRIMARY KEY,
        OrderId              INT           NOT NULL,
        PaymentId            INT           NULL,
        Amount               DECIMAL(18,2) NOT NULL,
        Type                 NVARCHAR(10)  NOT NULL,
        Method               NVARCHAR(25)  NOT NULL,
        Status               NVARCHAR(15)  NOT NULL DEFAULT 'PENDING',
        GatewayTransactionId NVARCHAR(100) NULL,
        Reason               NVARCHAR(500) NOT NULL,
        GatewayError         NVARCHAR(500) NULL,
        CreatedBy            INT           NULL,
        CreatedAt            DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt            DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Refunds_Orders   FOREIGN KEY (OrderId)   REFERENCES Orders(OrderId) ON DELETE CASCADE,
        CONSTRAINT FK_Refunds_Payments FOREIGN KEY (PaymentId) REFERENCES Payments(PaymentId)
    );
    CREATE NONCLUSTERED INDEX IX_Refunds_OrderId ON Refunds(OrderId);
    CREATE NONCLUSTERED INDEX IX_Refunds_Status  ON Refunds(Status);
    PRINT '✓ Refunds';
END
GO

GO

/* =============================================================
   LEVEL 4 — Depends on Level 3
   ============================================================= */

-- ── VariantAttributes ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VariantAttributes')
BEGIN
    CREATE TABLE VariantAttributes (
        VariantId INT NOT NULL,
        ValueId   INT NOT NULL,
        PRIMARY KEY (VariantId, ValueId),
        CONSTRAINT FK_VariantAttributes_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT FK_VariantAttributes_Values   FOREIGN KEY (ValueId)   REFERENCES AttributeValues(ValueId)   ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_ValueId   ON VariantAttributes(ValueId);
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_VariantId ON VariantAttributes(VariantId);
    PRINT '✓ VariantAttributes';
END
GO

-- ── ProductImages ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProductImages')
BEGIN
    CREATE TABLE ProductImages (
        ImageId      INT            IDENTITY(1,1) PRIMARY KEY,
        ProductId    INT            NOT NULL,
        VariantId    INT            NULL,
        ImageUrl     NVARCHAR(1000) NOT NULL,
        ThumbnailUrl NVARCHAR(1000) NULL,
        IsPrimary    BIT            NULL DEFAULT 0,
        CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
        CONSTRAINT FK_ProductImages_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId)
    );
    CREATE NONCLUSTERED INDEX IX_ProductImages_ProductId
        ON ProductImages(ProductId) INCLUDE (ImageUrl, ThumbnailUrl, IsPrimary);
    CREATE NONCLUSTERED INDEX IX_ProductImages_VariantId
        ON ProductImages(VariantId) WHERE VariantId IS NOT NULL;
    PRINT '✓ ProductImages';
END
GO

-- ── CartItems ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CartItems')
BEGIN
    CREATE TABLE CartItems (
        CartItemId INT      IDENTITY(1,1) PRIMARY KEY,
        CartId     INT      NOT NULL,
        VariantId  INT      NOT NULL,
        Quantity   INT      NOT NULL CHECK (Quantity > 0),
        AddedAt    DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_CartItems_Carts    FOREIGN KEY (CartId)    REFERENCES Carts(CartId)           ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT UQ_CartItems_Cart_Variant UNIQUE (CartId, VariantId)
    );
    CREATE NONCLUSTERED INDEX IX_CartItems_CartId    ON CartItems(CartId);
    CREATE NONCLUSTERED INDEX IX_CartItems_VariantId ON CartItems(VariantId);
    PRINT '✓ CartItems';
END
GO

-- ── Reviews ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Reviews')
BEGIN
    CREATE TABLE Reviews (
        ReviewId    INT            IDENTITY(1,1) PRIMARY KEY,
        ProductId   INT            NOT NULL,
        UserId      INT            NOT NULL,
        OrderItemId INT            NULL UNIQUE,   -- one review per purchased item
        Rating      INT            NULL CHECK (Rating >= 1 AND Rating <= 5),
        Comment     NVARCHAR(1000) NULL,
        Images      NVARCHAR(MAX)  DEFAULT '[]',  -- JSON array of Cloudinary URLs
        CreatedAt   DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT FK_Reviews_Products   FOREIGN KEY (ProductId)   REFERENCES Products(ProductId)    ON DELETE CASCADE,
        CONSTRAINT FK_Reviews_Users      FOREIGN KEY (UserId)      REFERENCES Users(UserId),
        CONSTRAINT FK_Reviews_OrderItems FOREIGN KEY (OrderItemId) REFERENCES OrderItems(OrderItemId)
    );
    CREATE NONCLUSTERED INDEX IX_Reviews_ProductId ON Reviews(ProductId);
    CREATE NONCLUSTERED INDEX IX_Reviews_UserId    ON Reviews(UserId);
    PRINT '✓ Reviews';
END
GO

-- ── InventoryLogs ────────────────────────────────────────────
-- Reason: CHECKOUT | RESTOCK | CANCELLED_RESTORE | MANUAL_ADJUST
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryLogs')
BEGIN
    CREATE TABLE InventoryLogs (
        LogId          INT           IDENTITY(1,1) PRIMARY KEY,
        VariantId      INT           NOT NULL,
        OrderId        INT           NULL,
        UserId         INT           NULL,
        ChangeQuantity INT           NOT NULL,   -- negative = deduct, positive = restock
        PreviousStock  INT           NOT NULL,
        NewStock       INT           NOT NULL,
        Reason         NVARCHAR(30)  NOT NULL,
        Note           NVARCHAR(500) NULL,
        CreatedAt      DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_InventoryLogs_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT FK_InventoryLogs_Orders   FOREIGN KEY (OrderId)   REFERENCES Orders(OrderId)   ON DELETE SET NULL,
        CONSTRAINT FK_InventoryLogs_Users    FOREIGN KEY (UserId)    REFERENCES Users(UserId)     ON DELETE SET NULL
    );
    CREATE NONCLUSTERED INDEX IX_InventoryLogs_VariantId ON InventoryLogs(VariantId);
    CREATE NONCLUSTERED INDEX IX_InventoryLogs_OrderId   ON InventoryLogs(OrderId) WHERE OrderId IS NOT NULL;
    PRINT '✓ InventoryLogs';
END
GO

/* =============================================================
   LEVEL 5 — Warehouse / Multi-location Inventory
   ============================================================= */

-- ── Inventory (Warehouse × Variant) ──────────────────────────
-- available_stock (app-layer) = Quantity - ReservedQuantity
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Inventory')
BEGIN
    CREATE TABLE Inventory (
        InventoryId      INT       IDENTITY(1,1) PRIMARY KEY,
        WarehouseId      INT       NOT NULL,
        VariantId        INT       NOT NULL,
        Quantity         INT       NOT NULL DEFAULT 0,
        ReservedQuantity INT       NOT NULL DEFAULT 0,
        CreatedAt        DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt        DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Inventory_Warehouse_Variant UNIQUE (WarehouseId, VariantId),
        CONSTRAINT FK_Inventory_Warehouses FOREIGN KEY (WarehouseId) REFERENCES Warehouses(WarehouseId) ON DELETE CASCADE,
        CONSTRAINT FK_Inventory_Variants   FOREIGN KEY (VariantId)   REFERENCES ProductVariants(VariantId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_Inventory_VariantId   ON Inventory(VariantId);
    CREATE NONCLUSTERED INDEX IX_Inventory_WarehouseId ON Inventory(WarehouseId);
    PRINT '✓ Inventory';
END
GO

-- ── InventoryReservations ─────────────────────────────────────
-- status: ACTIVE | RELEASED | FULFILLED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryReservations')
BEGIN
    CREATE TABLE InventoryReservations (
        ReservationId INT           IDENTITY(1,1) PRIMARY KEY,
        InventoryId   INT           NOT NULL,
        OrderId       INT           NOT NULL,
        Quantity      INT           NOT NULL,
        Status        NVARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
        ExpiresAt     DATETIME2     NOT NULL,
        CreatedAt     DATETIME2     NOT NULL DEFAULT GETDATE(),
        UpdatedAt     DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_InventoryReservations_Inventory FOREIGN KEY (InventoryId) REFERENCES Inventory(InventoryId) ON DELETE CASCADE,
        CONSTRAINT FK_InventoryReservations_Orders    FOREIGN KEY (OrderId)     REFERENCES Orders(OrderId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_InventoryReservations_InventoryId ON InventoryReservations(InventoryId);
    CREATE NONCLUSTERED INDEX IX_InventoryReservations_OrderId     ON InventoryReservations(OrderId);
    CREATE NONCLUSTERED INDEX IX_InventoryReservations_Status      ON InventoryReservations(Status);
    PRINT '✓ InventoryReservations';
END
GO

-- ── InventoryTransactions ────────────────────────────────────
-- type: IN | OUT | ADJUST | TRANSFER_IN | TRANSFER_OUT
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryTransactions')
BEGIN
    CREATE TABLE InventoryTransactions (
        TransactionId INT           IDENTITY(1,1) PRIMARY KEY,
        InventoryId   INT           NOT NULL,
        Type          NVARCHAR(20)  NOT NULL,
        Quantity      INT           NOT NULL,
        Note          NVARCHAR(500) NULL,
        CreatedBy     INT           NULL,
        CreatedAt     DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_InventoryTransactions_Inventory
            FOREIGN KEY (InventoryId) REFERENCES Inventory(InventoryId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_InventoryTransactions_InventoryId ON InventoryTransactions(InventoryId);
    CREATE NONCLUSTERED INDEX IX_InventoryTransactions_Type        ON InventoryTransactions(Type);
    PRINT '✓ InventoryTransactions';
END
GO

-- ── StockAdjustments ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockAdjustments')
BEGIN
    CREATE TABLE StockAdjustments (
        AdjustmentId INT           IDENTITY(1,1) PRIMARY KEY,
        WarehouseId  INT           NOT NULL,
        VariantId    INT           NOT NULL,
        Quantity     INT           NOT NULL,      -- positive = add, negative = remove
        Reason       NVARCHAR(255) NOT NULL,
        AdjustedBy   INT           NULL,
        AdjustedAt   DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StockAdjustments_Warehouses FOREIGN KEY (WarehouseId) REFERENCES Warehouses(WarehouseId) ON DELETE CASCADE,
        CONSTRAINT FK_StockAdjustments_Variants   FOREIGN KEY (VariantId)   REFERENCES ProductVariants(VariantId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_StockAdjustments_WarehouseId ON StockAdjustments(WarehouseId);
    CREATE NONCLUSTERED INDEX IX_StockAdjustments_VariantId   ON StockAdjustments(VariantId);
    PRINT '✓ StockAdjustments';
END
GO

-- ── StockTransfers ───────────────────────────────────────────
-- status: PENDING | COMPLETED | CANCELLED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockTransfers')
BEGIN
    CREATE TABLE StockTransfers (
        TransferId      INT          IDENTITY(1,1) PRIMARY KEY,
        FromWarehouseId INT          NOT NULL,
        ToWarehouseId   INT          NOT NULL,
        VariantId       INT          NOT NULL,
        Quantity        INT          NOT NULL,
        Status          NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
        TransferredBy   INT          NULL,
        CreatedAt       DATETIME2    NOT NULL DEFAULT GETDATE(),
        UpdatedAt       DATETIME2    NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StockTransfers_FromWarehouse FOREIGN KEY (FromWarehouseId) REFERENCES Warehouses(WarehouseId),
        CONSTRAINT FK_StockTransfers_ToWarehouse   FOREIGN KEY (ToWarehouseId)   REFERENCES Warehouses(WarehouseId),
        CONSTRAINT FK_StockTransfers_Variants      FOREIGN KEY (VariantId)       REFERENCES ProductVariants(VariantId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_StockTransfers_FromWarehouse ON StockTransfers(FromWarehouseId);
    CREATE NONCLUSTERED INDEX IX_StockTransfers_ToWarehouse   ON StockTransfers(ToWarehouseId);
    CREATE NONCLUSTERED INDEX IX_StockTransfers_Status        ON StockTransfers(Status);
    PRINT '✓ StockTransfers';
END
GO

-- ── PurchaseOrders ───────────────────────────────────────────
-- status: PENDING | RECEIVED | CANCELLED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrders')
BEGIN
    CREATE TABLE PurchaseOrders (
        PurchaseOrderId INT            IDENTITY(1,1) PRIMARY KEY,
        WarehouseId     INT            NOT NULL,
        Supplier        NVARCHAR(100)  NOT NULL,
        Status          NVARCHAR(20)   NOT NULL DEFAULT 'PENDING',
        TotalCost       DECIMAL(18,2)  NULL,
        Notes           NVARCHAR(1000) NULL,
        OrderedAt       DATETIME2      NOT NULL DEFAULT GETDATE(),
        ReceivedAt      DATETIME2      NULL,
        CreatedBy       INT            NULL,
        UpdatedAt       DATETIME2      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_PurchaseOrders_Warehouses
            FOREIGN KEY (WarehouseId) REFERENCES Warehouses(WarehouseId) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_WarehouseId ON PurchaseOrders(WarehouseId);
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_Status      ON PurchaseOrders(Status);
    PRINT '✓ PurchaseOrders';
END
GO

/* =============================================================
   UNIQUE FILTERED INDEX — ProductImages (one primary per product)
   ============================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ProductImages_Primary' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE UNIQUE INDEX UX_ProductImages_Primary ON ProductImages(ProductId) WHERE IsPrimary = 1;
    PRINT '✓ Index: UX_ProductImages_Primary';
END
GO

/* =============================================================
   SUMMARY
   ============================================================= */
PRINT '';
PRINT '============================================================';
PRINT '  Schema ready — 36 objects created (tables + indexes)';
PRINT '  Synchronized with: server/prisma/schema.prisma';
PRINT '============================================================';
GO

-- Quick verification: list all user tables
SELECT
    t.name                          AS TableName,
    p.rows                          AS TotalRows
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
ORDER BY t.name;
GO
