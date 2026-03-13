/* =============================================================
   FILE: server/database/01_schema_all.sql
   PROJECT: AISTHEA
   DATABASE: AISTHEA (SQL Server / T-SQL)
   DESCRIPTION: Full schema â€” synchronized with prisma/schema.prisma
   
   TABLES (31):
     Users, EmailVerificationTokens, PasswordResetTokens,
     Roles, UserRoles, Permissions, RolePermissions, UserLogins,
     Addresses, Brands, Categories, Attributes, AttributeValues,
     Products, ProductVariants, VariantAttributes, ProductImages,
     Carts, CartItems,
     Coupons, Orders, OrderItems, OrderStatusHistory,
     Shipments, Payments, Refunds,
     Reviews, InventoryLogs, OrderReturns,
     PurchaseOrders, PurchaseOrderItems
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
   LEVEL 0 â€” No Dependencies
   ============================================================= */

-- â”€â”€ Roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        RoleId   INT           IDENTITY(1,1) PRIMARY KEY,
        RoleName NVARCHAR(50)  NOT NULL UNIQUE
    );
    PRINT 'âœ“ Roles';
END
GO

-- â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ Users';
END
GO

-- â”€â”€ Permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Permissions')
BEGIN
    CREATE TABLE Permissions (
        PermissionId INT           IDENTITY(1,1) PRIMARY KEY,
        Code         NVARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'CREATE_PRODUCT'
        Module       NVARCHAR(50)  NOT NULL,           -- e.g. 'PRODUCT'
        Description  NVARCHAR(255) NOT NULL
    );
    CREATE NONCLUSTERED INDEX IX_Permissions_Module ON Permissions(Module);
    PRINT 'âœ“ Permissions';
END
GO

-- â”€â”€ Brands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Brands')
BEGIN
    CREATE TABLE Brands (
        BrandId     INT           IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(255) NULL
    );
    PRINT 'âœ“ Brands';
END
GO

-- â”€â”€ Attributes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Attributes')
BEGIN
    CREATE TABLE Attributes (
        AttributeId INT          IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(50) NOT NULL UNIQUE
    );
    PRINT 'âœ“ Attributes';
END
GO

-- â”€â”€ Coupons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_Coupons_IsActive ON Coupons(IsActive);
    PRINT 'âœ“ Coupons';
END
GO

/* =============================================================
   LEVEL 1 â€” Depends on Level 0
   ============================================================= */

-- â”€â”€ EmailVerificationTokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_EmailVerificationTokens_UserId ON EmailVerificationTokens(UserId);
    PRINT 'âœ“ EmailVerificationTokens';
END
GO

-- â”€â”€ PasswordResetTokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_PasswordResetTokens_UserId ON PasswordResetTokens(UserId);
    PRINT 'âœ“ PasswordResetTokens';
END
GO

-- â”€â”€ UserRoles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserRoles')
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
    );
    PRINT 'âœ“ UserRoles';
END
GO

-- â”€â”€ RolePermissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ RolePermissions';
END
GO

-- â”€â”€ UserLogins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ UserLogins';
END
GO

-- â”€â”€ Addresses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_Addresses_UserId_IsDefault ON Addresses(UserId, IsDefault);
    PRINT 'âœ“ Addresses';
END
GO

-- â”€â”€ Categories (self-referencing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_Categories_ParentId ON Categories(ParentId) WHERE ParentId IS NOT NULL;
    PRINT 'âœ“ Categories';
END
GO

-- â”€â”€ AttributeValues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AttributeValues')
BEGIN
    CREATE TABLE AttributeValues (
        ValueId     INT          IDENTITY(1,1) PRIMARY KEY,
        AttributeId INT          NOT NULL,
        Value       NVARCHAR(50) NOT NULL,
        CONSTRAINT FK_AttributeValues_Attributes
            FOREIGN KEY (AttributeId) REFERENCES Attributes(AttributeId) ON DELETE CASCADE
    );
    PRINT 'âœ“ AttributeValues';
END
GO

-- â”€â”€ Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Valid Status: Pending | Processing | Shipping | Delivered | Cancelled
--               Return_Requested | Returned
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        OrderId               INT           IDENTITY(1,1) PRIMARY KEY,
        UserId                INT           NULL,
        OrderNumber           NVARCHAR(50)  NOT NULL UNIQUE,
        CustomerName          NVARCHAR(100) NOT NULL,
        CustomerEmail         NVARCHAR(100) NULL,
        CustomerPhone         NVARCHAR(20)  NOT NULL,
        ShippingCity          NVARCHAR(50)  NOT NULL,
        ShippingDistrict      NVARCHAR(50)  NOT NULL,
        ShippingWard          NVARCHAR(50)  NULL,
        ShippingAddressDetail NVARCHAR(200) NOT NULL,
        TotalAmount           DECIMAL(18,2) NOT NULL,
        DiscountAmount        DECIMAL(18,2) NULL DEFAULT 0,
        CouponId              INT           NULL,
        Status                NVARCHAR(20)  DEFAULT 'Pending',
        PaymentMethod         NVARCHAR(50)  DEFAULT 'COD',
        Note                  NVARCHAR(500) NULL,
        CreatedAt             DATETIME2     DEFAULT GETDATE(),
        UpdatedAt             DATETIME2     DEFAULT GETDATE(),
        CONSTRAINT FK_Orders_Users   FOREIGN KEY (UserId)   REFERENCES Users(UserId),
        CONSTRAINT FK_Orders_Coupons FOREIGN KEY (CouponId) REFERENCES Coupons(CouponId)
    );
    CREATE NONCLUSTERED INDEX IX_Orders_CreatedAt   ON Orders(CreatedAt);
    CREATE NONCLUSTERED INDEX IX_Orders_Status      ON Orders(Status);
    CREATE NONCLUSTERED INDEX IX_Orders_UserId      ON Orders(UserId) WHERE UserId IS NOT NULL;
    PRINT 'âœ“ Orders';
END
GO

/* =============================================================
   LEVEL 2 â€” Depends on Level 1
   ============================================================= */

-- â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId),
        CONSTRAINT FK_Products_Brands     FOREIGN KEY (BrandId)    REFERENCES Brands(BrandId)
    );
    CREATE NONCLUSTERED INDEX IX_Products_CategoryId     ON Products(CategoryId) WHERE IsDeleted = 0;
    CREATE NONCLUSTERED INDEX IX_Products_BrandId        ON Products(BrandId)    WHERE IsDeleted = 0 AND BrandId IS NOT NULL;
    CREATE NONCLUSTERED INDEX IX_Products_BasePrice      ON Products(BasePrice);
    CREATE NONCLUSTERED INDEX IX_Products_Name           ON Products(Name);
    CREATE NONCLUSTERED INDEX IX_Products_Status         ON Products(Status);
    PRINT 'âœ“ Products';
END
GO

-- â”€â”€ Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_Payments_OrderId ON Payments(OrderId);
    PRINT 'âœ“ Payments';
END
GO

/* =============================================================
   LEVEL 3 â€” Depends on Level 2
   ============================================================= */

-- â”€â”€ ProductVariants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ ProductVariants';
END
GO

-- â”€â”€ Carts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ Carts';
END
GO

-- â”€â”€ OrderItems â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ OrderItems';
END
GO

-- â”€â”€ OrderStatusHistory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ OrderStatusHistory';
END
GO

-- â”€â”€ Shipments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ Shipments';
END
GO

-- â”€â”€ OrderReturns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_OrderReturns_Status  ON OrderReturns(Status);
    CREATE NONCLUSTERED INDEX IX_OrderReturns_UserId  ON OrderReturns(UserId) WHERE UserId IS NOT NULL;
    PRINT 'âœ“ OrderReturns';
END
GO

-- â”€â”€ Refunds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ Refunds';
END
GO

GO

/* =============================================================
   LEVEL 4 â€” Depends on Level 3
   ============================================================= */

-- â”€â”€ VariantAttributes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VariantAttributes')
BEGIN
    CREATE TABLE VariantAttributes (
        VariantId INT NOT NULL,
        ValueId   INT NOT NULL,
        PRIMARY KEY (VariantId, ValueId),
        CONSTRAINT FK_VariantAttributes_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
        CONSTRAINT FK_VariantAttributes_Values   FOREIGN KEY (ValueId)   REFERENCES AttributeValues(ValueId)   ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_VariantAttributes_ValueId ON VariantAttributes(ValueId);
    PRINT 'âœ“ VariantAttributes';
END
GO

-- â”€â”€ ProductImages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ ProductImages';
END
GO

-- â”€â”€ CartItems â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    CREATE NONCLUSTERED INDEX IX_CartItems_VariantId ON CartItems(VariantId);
    PRINT 'âœ“ CartItems';
END
GO

-- â”€â”€ Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    PRINT 'âœ“ Reviews';
END
GO

-- â”€â”€ InventoryLogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Reason: CHECKOUT | PURCHASE_RECEIPT | RETURN_RESTORE | MANUAL_ADJUST
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventoryLogs')
BEGIN
    CREATE TABLE InventoryLogs (
        LogId          INT           IDENTITY(1,1) PRIMARY KEY,
        VariantId      INT           NOT NULL,
        OrderId        INT           NULL,
        UserId         INT           NULL,
        ChangeQuantity INT           NOT NULL,   -- negative = deduct, positive = receipt/restore
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
    PRINT 'âœ“ InventoryLogs';
END
GO

/* =============================================================
   LEVEL 5 - Single-store procurement
   ============================================================= */

-- PurchaseOrders
-- status: PENDING | PARTIALLY_RECEIVED | RECEIVED | CANCELLED
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrders')
BEGIN
    CREATE TABLE PurchaseOrders (
        PurchaseOrderId     INT            IDENTITY(1,1) PRIMARY KEY,
        PurchaseOrderNumber NVARCHAR(50)   NOT NULL UNIQUE,
        Supplier            NVARCHAR(100)  NOT NULL,
        Status              NVARCHAR(20)   NOT NULL DEFAULT 'PENDING',
        Notes               NVARCHAR(1000) NULL,
        OrderedAt           DATETIME2      NOT NULL DEFAULT GETDATE(),
        ReceivedAt          DATETIME2      NULL,
        CreatedBy           INT            NULL,
        UpdatedAt           DATETIME2      NOT NULL DEFAULT GETDATE()
    );
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_OrderedAt ON PurchaseOrders(OrderedAt);
    CREATE NONCLUSTERED INDEX IX_PurchaseOrders_Status    ON PurchaseOrders(Status);
    PRINT 'PurchaseOrders created';
END
GO

-- PurchaseOrderItems
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrderItems')
BEGIN
    CREATE TABLE PurchaseOrderItems (
        PurchaseOrderItemId INT           IDENTITY(1,1) PRIMARY KEY,
        PurchaseOrderId     INT           NOT NULL,
        VariantId           INT           NOT NULL,
        OrderedQty          INT           NOT NULL,
        ReceivedQty         INT           NOT NULL DEFAULT 0,
        UnitCost            DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_PurchaseOrderItems_PurchaseOrders
            FOREIGN KEY (PurchaseOrderId) REFERENCES PurchaseOrders(PurchaseOrderId) ON DELETE CASCADE,
        CONSTRAINT FK_PurchaseOrderItems_ProductVariants
            FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId)
    );
    CREATE UNIQUE INDEX UQ_PurchaseOrderItems_Order_Variant
        ON PurchaseOrderItems(PurchaseOrderId, VariantId);
    CREATE NONCLUSTERED INDEX IX_PurchaseOrderItems_VariantId ON PurchaseOrderItems(VariantId);
    PRINT 'PurchaseOrderItems created';
END
GO

/* =============================================================
   UNIQUE FILTERED INDEX â€” ProductImages (one primary per product)
   ============================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ProductImages_Primary' AND object_id = OBJECT_ID('ProductImages'))
BEGIN
    CREATE UNIQUE INDEX UX_ProductImages_Primary ON ProductImages(ProductId) WHERE IsPrimary = 1;
    PRINT 'âœ“ Index: UX_ProductImages_Primary';
END
GO

/* =============================================================
   SUMMARY
   ============================================================= */
PRINT '';
PRINT '============================================================';
PRINT '  Schema ready - simplified single-store schema';
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
