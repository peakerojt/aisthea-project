/* =============================================================
   PROJECT: AISTHEA
   DATABASE: AISTHEA
   TYPE: SQL Server (T-SQL)
   ============================================================= */

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'AISTHEA')
    BEGIN
        ALTER DATABASE AISTHEA SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE AISTHEA;
    END
GO

CREATE DATABASE AISTHEA;
GO

USE AISTHEA;
GO

/* =============================================================
   2. TẠO BẢNG (TABLES)
   ============================================================= */

-- Bảng Roles
CREATE TABLE Roles (
                       RoleId INT IDENTITY(1,1) PRIMARY KEY,
                       RoleName NVARCHAR(50) NOT NULL UNIQUE
);

-- Bảng Users
CREATE TABLE Users (
                       UserId INT IDENTITY(1,1) PRIMARY KEY,
                       Email NVARCHAR(100) NOT NULL UNIQUE,
                       PasswordHash NVARCHAR(255) NULL,
                       FullName NVARCHAR(100) NOT NULL,
                       Phone NVARCHAR(20),
                       AvatarUrl NVARCHAR(500) NULL,
                       Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
                       CreatedAt DATETIME2 DEFAULT GETDATE(),
                       UpdatedAt DATETIME2 DEFAULT GETDATE(),
                       CONSTRAINT CHK_User_Status CHECK (Status IN ('Active', 'Banned'))
);

-- Bảng UserRoles
CREATE TABLE UserRoles (
                           UserId INT NOT NULL,
                           RoleId INT NOT NULL,
                           PRIMARY KEY (UserId, RoleId),
                           CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
                           CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
);

-- Bảng UserLogins
CREATE TABLE UserLogins (
                            LoginProvider NVARCHAR(50) NOT NULL,
                            ProviderKey NVARCHAR(128) NOT NULL,
                            ProviderDisplayName NVARCHAR(100) NULL,
                            UserId INT NOT NULL,
                            PRIMARY KEY (LoginProvider, ProviderKey),
                            CONSTRAINT FK_UserLogins_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);

-- Bảng Addresses
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

-- Bảng Categories
CREATE TABLE Categories (
                            CategoryId INT IDENTITY(1,1) PRIMARY KEY,
                            ParentId INT NULL,
                            Name NVARCHAR(100) NOT NULL,
                            Slug NVARCHAR(100) NOT NULL UNIQUE,
                            Description NVARCHAR(255),
                            CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentId) REFERENCES Categories(CategoryId)
);

-- Bảng Brands
CREATE TABLE Brands (
                        BrandId INT IDENTITY(1,1) PRIMARY KEY,
                        Name NVARCHAR(100) NOT NULL UNIQUE,
                        Description NVARCHAR(255)
);

-- Bảng Products
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

-- Bảng ProductVariants
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

-- Bảng Attributes & Values
CREATE TABLE Attributes (
                            AttributeId INT IDENTITY(1,1) PRIMARY KEY,
                            Name NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE AttributeValues (
                                 ValueId INT IDENTITY(1,1) PRIMARY KEY,
                                 AttributeId INT NOT NULL,
                                 Value NVARCHAR(50) NOT NULL,
                                 CONSTRAINT FK_AttributeValues_Attributes FOREIGN KEY (AttributeId) REFERENCES Attributes(AttributeId) ON DELETE CASCADE
);

-- Bảng VariantAttributes
CREATE TABLE VariantAttributes (
                                   VariantId INT NOT NULL,
                                   ValueId INT NOT NULL,
                                   PRIMARY KEY (VariantId, ValueId),
                                   CONSTRAINT FK_VariantAttributes_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE,
                                   CONSTRAINT FK_VariantAttributes_Values FOREIGN KEY (ValueId) REFERENCES AttributeValues(ValueId) ON DELETE CASCADE
);

-- Bảng ProductImages
CREATE TABLE ProductImages (
                               ImageId INT IDENTITY(1,1) PRIMARY KEY,
                               ProductId INT NOT NULL,
                               VariantId INT NULL,
                               ImageUrl NVARCHAR(500) NOT NULL,
                               IsPrimary BIT DEFAULT 0,
                               CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES Products(ProductId) ON DELETE CASCADE,
                               CONSTRAINT FK_ProductImages_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId)
);

-- Bảng Carts & CartItems
CREATE TABLE Carts (
                       CartId INT IDENTITY(1,1) PRIMARY KEY,
                       UserId INT NULL,
                       SessionId NVARCHAR(100) NULL,
                       CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE CartItems (
                           CartItemId INT IDENTITY(1,1) PRIMARY KEY,
                           CartId INT NOT NULL,
                           VariantId INT NOT NULL,
                           Quantity INT NOT NULL CHECK (Quantity > 0),
                           CONSTRAINT FK_CartItems_Carts FOREIGN KEY (CartId) REFERENCES Carts(CartId) ON DELETE CASCADE,
                           CONSTRAINT FK_CartItems_Variants FOREIGN KEY (VariantId) REFERENCES ProductVariants(VariantId) ON DELETE CASCADE
);

-- Bảng Orders
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

-- Bảng Reviews
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

-- Bảng Payments
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
GO

PRINT 'Database Created Successfully with Named Constraints!';
GO

