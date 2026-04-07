-- CreateTable
CREATE TABLE `Users` (
    `UserId` INTEGER NOT NULL AUTO_INCREMENT,
    `Email` VARCHAR(100) NOT NULL,
    `PasswordHash` VARCHAR(255) NULL,
    `FullName` VARCHAR(100) NOT NULL,
    `Phone` VARCHAR(20) NULL,
    `AvatarUrl` VARCHAR(1000) NULL,
    `GoogleId` VARCHAR(255) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__Users__A9D10534FE2330F2`(`Email`),
    UNIQUE INDEX `UQ_Users_GoogleId`(`GoogleId`),
    INDEX `IX_Users_Email_Status`(`Email`, `Status`),
    INDEX `IX_Users_Phone`(`Phone`),
    INDEX `IX_Users_Status`(`Status`),
    PRIMARY KEY (`UserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificationTokens` (
    `TokenId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `Token` VARCHAR(255) NOT NULL,
    `ExpiresAt` DATETIME(0) NOT NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__EmailVer__1EB4F817BF263B03`(`Token`),
    INDEX `IX_EmailVerificationTokens_UserId`(`UserId`),
    PRIMARY KEY (`TokenId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetTokens` (
    `TokenId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `Token` VARCHAR(255) NOT NULL,
    `ExpiresAt` DATETIME(0) NOT NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__Password__1EB4F81743DB65F8`(`Token`),
    INDEX `IX_PasswordResetTokens_UserId`(`UserId`),
    PRIMARY KEY (`TokenId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Roles` (
    `RoleId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoleName` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `UQ__Roles__8A2B6160E2CD5E04`(`RoleName`),
    PRIMARY KEY (`RoleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRoles` (
    `UserId` INTEGER NOT NULL,
    `RoleId` INTEGER NOT NULL,

    INDEX `FK_UserRoles_Roles`(`RoleId`),
    PRIMARY KEY (`UserId`, `RoleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permissions` (
    `PermissionId` INTEGER NOT NULL AUTO_INCREMENT,
    `Code` VARCHAR(100) NOT NULL,
    `Module` VARCHAR(50) NOT NULL,
    `Description` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `UQ__Permissi__A25C5AA7565D773B`(`Code`),
    INDEX `IX_Permissions_Module`(`Module`),
    PRIMARY KEY (`PermissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermissions` (
    `RoleId` INTEGER NOT NULL,
    `PermissionId` INTEGER NOT NULL,

    INDEX `FK_RolePermissions_Permissions`(`PermissionId`),
    PRIMARY KEY (`RoleId`, `PermissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLogins` (
    `LoginProvider` VARCHAR(50) NOT NULL,
    `ProviderKey` VARCHAR(128) NOT NULL,
    `ProviderDisplayName` VARCHAR(100) NULL,
    `UserId` INTEGER NOT NULL,
    `AccessToken` LONGTEXT NULL,
    `RefreshToken` LONGTEXT NULL,
    `TokenExpiry` DATETIME(0) NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_UserLogins_UserId`(`UserId`),
    PRIMARY KEY (`LoginProvider`, `ProviderKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Addresses` (
    `AddressId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `RecipientName` VARCHAR(100) NOT NULL,
    `Phone` VARCHAR(20) NOT NULL,
    `AddressLine` VARCHAR(255) NOT NULL,
    `City` VARCHAR(50) NOT NULL,
    `District` VARCHAR(50) NULL,
    `IsDefault` BOOLEAN NULL DEFAULT false,
    `Ward` VARCHAR(50) NULL,

    INDEX `IX_Addresses_UserId_IsDefault`(`UserId`, `IsDefault`),
    PRIMARY KEY (`AddressId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categories` (
    `CategoryId` INTEGER NOT NULL AUTO_INCREMENT,
    `ParentId` INTEGER NULL,
    `Name` VARCHAR(100) NOT NULL,
    `Slug` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(255) NULL,
    `ImageUrl` VARCHAR(1000) NULL,

    UNIQUE INDEX `UQ__Categori__BC7B5FB63FB08662`(`Slug`),
    INDEX `IX_Categories_ParentId`(`ParentId`),
    PRIMARY KEY (`CategoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Brands` (
    `BrandId` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(255) NULL,

    UNIQUE INDEX `UQ__Brands__737584F69E5ADB5A`(`Name`),
    PRIMARY KEY (`BrandId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Products` (
    `ProductId` INTEGER NOT NULL AUTO_INCREMENT,
    `CategoryId` INTEGER NOT NULL,
    `BrandId` INTEGER NULL,
    `Name` VARCHAR(200) NOT NULL,
    `Slug` VARCHAR(200) NOT NULL,
    `Description` LONGTEXT NULL,
    `BasePrice` DECIMAL(18, 2) NOT NULL,
    `Status` VARCHAR(20) NULL DEFAULT 'Active',
    `IsDeleted` BOOLEAN NULL DEFAULT false,
    `DeletedAt` DATETIME(0) NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__Products__BC7B5FB67719B0A8`(`Slug`),
    INDEX `IX_Products_BasePrice`(`BasePrice`),
    INDEX `IX_Products_BrandId`(`BrandId`),
    INDEX `IX_Products_CategoryId`(`CategoryId`),
    INDEX `IX_Products_Name`(`Name`),
    INDEX `IX_Products_Status`(`Status`),
    PRIMARY KEY (`ProductId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariants` (
    `VariantId` INTEGER NOT NULL AUTO_INCREMENT,
    `ProductId` INTEGER NOT NULL,
    `SKU` VARCHAR(50) NOT NULL,
    `Price` DECIMAL(18, 2) NOT NULL,
    `StockQuantity` INTEGER NOT NULL DEFAULT 0,
    `IsDefault` BOOLEAN NULL DEFAULT false,
    `IsDeleted` BOOLEAN NULL DEFAULT false,
    `DeletedAt` DATETIME(0) NULL,

    UNIQUE INDEX `UQ__ProductV__CA1ECF0D2467B19F`(`SKU`),
    INDEX `IX_ProductVariants_ProductId`(`ProductId`),
    INDEX `IX_ProductVariants_StockQuantity`(`StockQuantity`),
    PRIMARY KEY (`VariantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attributes` (
    `AttributeId` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `UQ__Attribut__737584F62D7060DB`(`Name`),
    PRIMARY KEY (`AttributeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeValues` (
    `ValueId` INTEGER NOT NULL AUTO_INCREMENT,
    `AttributeId` INTEGER NOT NULL,
    `Value` VARCHAR(50) NOT NULL,

    INDEX `FK_AttributeValues_Attributes`(`AttributeId`),
    PRIMARY KEY (`ValueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariantAttributes` (
    `VariantId` INTEGER NOT NULL,
    `ValueId` INTEGER NOT NULL,

    INDEX `IX_VariantAttributes_ValueId`(`ValueId`),
    PRIMARY KEY (`VariantId`, `ValueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImages` (
    `ImageId` INTEGER NOT NULL AUTO_INCREMENT,
    `ProductId` INTEGER NOT NULL,
    `VariantId` INTEGER NULL,
    `ImageUrl` VARCHAR(1000) NOT NULL,
    `ThumbnailUrl` VARCHAR(1000) NULL,
    `IsPrimary` BOOLEAN NULL DEFAULT false,

    INDEX `IX_ProductImages_ProductId`(`ProductId`),
    INDEX `IX_ProductImages_ProductId_IsPrimary`(`ProductId`, `IsPrimary`),
    INDEX `IX_ProductImages_VariantId`(`VariantId`),
    PRIMARY KEY (`ImageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Carts` (
    `CartId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NULL,
    `SessionId` VARCHAR(100) NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__Carts__1788CC4D7551E656`(`UserId`),
    PRIMARY KEY (`CartId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CartItems` (
    `CartItemId` INTEGER NOT NULL AUTO_INCREMENT,
    `CartId` INTEGER NOT NULL,
    `VariantId` INTEGER NOT NULL,
    `Quantity` INTEGER NOT NULL,
    `AddedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_CartItems_VariantId`(`VariantId`),
    UNIQUE INDEX `UQ_CartItems_Cart_Variant`(`CartId`, `VariantId`),
    PRIMARY KEY (`CartItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Orders` (
    `OrderId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NULL,
    `OrderNumber` VARCHAR(50) NOT NULL,
    `CustomerName` VARCHAR(100) NOT NULL,
    `CustomerEmail` VARCHAR(100) NULL,
    `CustomerPhone` VARCHAR(20) NOT NULL,
    `ShippingCity` VARCHAR(50) NOT NULL,
    `ShippingDistrict` VARCHAR(50) NOT NULL,
    `ShippingWard` VARCHAR(50) NULL,
    `ShippingAddressDetail` VARCHAR(200) NOT NULL,
    `TotalAmount` DECIMAL(18, 2) NOT NULL,
    `DiscountAmount` DECIMAL(18, 2) NULL DEFAULT 0.00,
    `CouponId` INTEGER NULL,
    `Status` VARCHAR(20) NULL DEFAULT 'Pending',
    `PaymentMethod` VARCHAR(50) NULL DEFAULT 'COD',
    `Note` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ShippingFee` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `ShippingMethod` VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    `ShippingCityCode` VARCHAR(10) NULL,

    UNIQUE INDEX `UQ__Orders__CAC5E743893BAC47`(`OrderNumber`),
    INDEX `IX_Orders_CreatedAt`(`CreatedAt`),
    INDEX `IX_Orders_Status`(`Status`),
    INDEX `IX_Orders_UserId`(`UserId`),
    INDEX `FK_Orders_Coupons`(`CouponId`),
    PRIMARY KEY (`OrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderStatusHistory` (
    `OrderStatusHistoryId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `OldStatus` VARCHAR(20) NULL,
    `Status` VARCHAR(20) NOT NULL,
    `ChangedBy` INTEGER NULL,
    `Note` VARCHAR(500) NULL,
    `ChangedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_OrderStatusHistory_OrderId`(`OrderId`),
    INDEX `IX_OrderStatusHistory_OrderId_ChangedAt`(`OrderId`, `ChangedAt`),
    PRIMARY KEY (`OrderStatusHistoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shipments` (
    `ShipmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `Carrier` VARCHAR(100) NULL,
    `TrackingNumber` VARCHAR(100) NULL,
    `Eta` DATETIME(0) NULL,
    `LastKnownLocation` VARCHAR(255) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ShippingMode` VARCHAR(20) NOT NULL DEFAULT 'manual',
    `Provider` VARCHAR(50) NULL,
    `ProviderOrderCode` VARCHAR(100) NULL,
    `ProviderStatus` VARCHAR(50) NULL,
    `DeliveryProofImages` LONGTEXT NOT NULL,
    `DeliveryProofReviewed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `UQ__Shipment__C3905BCE52634EB7`(`OrderId`),
    INDEX `IX_Shipments_TrackingNumber`(`TrackingNumber`),
    INDEX `IX_Shipments_ProviderOrderCode`(`ProviderOrderCode`),
    PRIMARY KEY (`ShipmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItems` (
    `OrderItemId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `VariantId` INTEGER NULL,
    `ProductName` VARCHAR(200) NOT NULL,
    `SKU` VARCHAR(50) NOT NULL,
    `VariantName` VARCHAR(200) NOT NULL,
    `UnitPrice` DECIMAL(18, 2) NOT NULL,
    `Quantity` INTEGER NOT NULL,
    `GrossItemAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `AllocatedDiscountAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `NetItemPaidAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,

    INDEX `IX_OrderItems_OrderId`(`OrderId`),
    INDEX `IX_OrderItems_VariantId`(`VariantId`),
    PRIMARY KEY (`OrderItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payments` (
    `PaymentId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `PaymentMethod` VARCHAR(50) NOT NULL,
    `Amount` DECIMAL(18, 2) NOT NULL,
    `TransactionCode` VARCHAR(100) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `PaymentDate` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `Note` VARCHAR(500) NULL,

    INDEX `IX_Payments_OrderId`(`OrderId`),
    PRIMARY KEY (`PaymentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reviews` (
    `ReviewId` INTEGER NOT NULL AUTO_INCREMENT,
    `ProductId` INTEGER NOT NULL,
    `UserId` INTEGER NOT NULL,
    `OrderItemId` INTEGER NULL,
    `Rating` INTEGER NULL,
    `Comment` VARCHAR(1000) NULL,
    `Images` LONGTEXT NULL,
    `CreatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__Reviews__57ED068076086186`(`OrderItemId`),
    INDEX `IX_Reviews_ProductId`(`ProductId`),
    INDEX `IX_Reviews_UserId`(`UserId`),
    PRIMARY KEY (`ReviewId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLogs` (
    `LogId` INTEGER NOT NULL AUTO_INCREMENT,
    `VariantId` INTEGER NOT NULL,
    `OrderId` INTEGER NULL,
    `UserId` INTEGER NULL,
    `ChangeQuantity` INTEGER NOT NULL,
    `PreviousStock` INTEGER NOT NULL,
    `NewStock` INTEGER NOT NULL,
    `Reason` VARCHAR(30) NOT NULL,
    `Note` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_InventoryLogs_VariantId`(`VariantId`),
    INDEX `IX_InventoryLogs_OrderId`(`OrderId`),
    INDEX `FK_InventoryLogs_Users`(`UserId`),
    PRIMARY KEY (`LogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderReturns` (
    `ReturnId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `UserId` INTEGER NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `ProofImages` LONGTEXT NOT NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    `AdminNote` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__OrderRet__C3905BCE786116EB`(`OrderId`),
    INDEX `IX_OrderReturns_Status`(`Status`),
    INDEX `IX_OrderReturns_UserId`(`UserId`),
    PRIMARY KEY (`ReturnId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequests` (
    `ReturnRequestId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `UserId` INTEGER NOT NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `Note` VARCHAR(1000) NULL,
    `DeliveredAt` DATETIME(0) NULL,
    `TotalRefundAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `RefundStatus` VARCHAR(50) NULL DEFAULT 'NOT_APPLICABLE',
    `FinanceNote` VARCHAR(1000) NULL,
    `BankInfoRequestedAt` DATETIME(0) NULL,
    `BankInfoSubmittedAt` DATETIME(0) NULL,
    `RefundCompletedAt` DATETIME(0) NULL,

    INDEX `IX_ReturnRequests_OrderId`(`OrderId`),
    INDEX `IX_ReturnRequests_Status`(`Status`),
    INDEX `IX_ReturnRequests_UserId`(`UserId`),
    INDEX `IX_ReturnRequests_CreatedAt`(`CreatedAt`),
    INDEX `IX_ReturnRequests_RefundStatus`(`RefundStatus`),
    PRIMARY KEY (`ReturnRequestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequestItems` (
    `ReturnRequestItemId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `OrderItemId` INTEGER NOT NULL,
    `Quantity` INTEGER NOT NULL,
    `UnitPrice` DECIMAL(18, 2) NOT NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ReasonText` VARCHAR(200) NULL,

    INDEX `IX_ReturnRequestItems_OrderItemId`(`OrderItemId`),
    INDEX `IX_ReturnRequestItems_ReturnRequestId`(`ReturnRequestId`),
    PRIMARY KEY (`ReturnRequestItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequestAttachments` (
    `AttachmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `FileUrl` VARCHAR(1000) NOT NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ReturnRequestItemId` INTEGER NULL,

    INDEX `IX_ReturnRequestAttachments_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_ReturnRequestAttachments_ReturnRequestItemId`(`ReturnRequestItemId`),
    PRIMARY KEY (`AttachmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnRequestStatusLogs` (
    `ReturnRequestStatusLogId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `FromStatus` VARCHAR(50) NULL,
    `ToStatus` VARCHAR(50) NOT NULL,
    `ChangedBy` INTEGER NULL,
    `Comment` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_ReturnRequestStatusLogs_CreatedAt`(`CreatedAt`),
    INDEX `IX_ReturnRequestStatusLogs_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_ReturnRequestStatusLogs_ChangedBy`(`ChangedBy`),
    PRIMARY KEY (`ReturnRequestStatusLogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundTransactions` (
    `RefundTransactionId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `Amount` DECIMAL(18, 2) NOT NULL,
    `Method` VARCHAR(30) NOT NULL,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `IdempotencyKey` VARCHAR(100) NOT NULL,
    `TransactionRef` VARCHAR(100) NULL,
    `ProcessedBy` INTEGER NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ_RefundTransactions_IdempotencyKey`(`IdempotencyKey`),
    INDEX `IX_RefundTransactions_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_RefundTransactions_Status`(`Status`),
    INDEX `IX_RefundTransactions_ProcessedBy`(`ProcessedBy`),
    PRIMARY KEY (`RefundTransactionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupons` (
    `CouponId` INTEGER NOT NULL AUTO_INCREMENT,
    `Code` VARCHAR(50) NOT NULL,
    `Type` VARCHAR(20) NOT NULL,
    `Value` DECIMAL(18, 2) NOT NULL,
    `MaxDiscountAmount` DECIMAL(18, 2) NULL,
    `MinOrderValue` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `StartDate` DATETIME(0) NOT NULL,
    `EndDate` DATETIME(0) NOT NULL,
    `UsageLimit` INTEGER NOT NULL,
    `UsedCount` INTEGER NOT NULL DEFAULT 0,
    `UsagePerUser` INTEGER NOT NULL DEFAULT 1,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `IsHidden` BOOLEAN NOT NULL DEFAULT false,
    `Source` VARCHAR(30) NULL,
    `VisibleInPublicList` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `UQ__Coupons__A25C5AA747E73C3C`(`Code`),
    INDEX `IX_Coupons_IsActive`(`IsActive`),
    INDEX `IX_Coupons_Source`(`Source`),
    PRIMARY KEY (`CouponId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerBankAccounts` (
    `BankAccountId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `BankName` VARCHAR(120) NOT NULL,
    `BankCode` VARCHAR(50) NULL,
    `AccountNumber` VARCHAR(50) NOT NULL,
    `AccountHolder` VARCHAR(120) NOT NULL,
    `QrImageUrl` VARCHAR(1000) NULL,
    `InputMethod` VARCHAR(20) NOT NULL,
    `IsDefault` BOOLEAN NOT NULL DEFAULT true,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_CustomerBankAccounts_UserId`(`UserId`),
    INDEX `IX_CustomerBankAccounts_UserId_IsDefault`(`UserId`, `IsDefault`),
    INDEX `IX_CustomerBankAccounts_UserId_IsDefault_IsActive`(`UserId`, `IsDefault`, `IsActive`),
    PRIMARY KEY (`BankAccountId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundBankSnapshots` (
    `RefundBankSnapshotId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `BankAccountId` INTEGER NULL,
    `BankName` VARCHAR(120) NOT NULL,
    `BankCode` VARCHAR(50) NULL,
    `AccountNumberMasked` VARCHAR(50) NOT NULL,
    `AccountHolder` VARCHAR(120) NOT NULL,
    `QrImageUrl` VARCHAR(1000) NULL,
    `InputMethod` VARCHAR(20) NOT NULL,
    `CapturedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_RefundBankSnapshots_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_RefundBankSnapshots_ReturnRequestId_CapturedAt`(`ReturnRequestId`, `CapturedAt`),
    INDEX `FK_RefundBankSnapshots_CustomerBankAccounts`(`BankAccountId`),
    PRIMARY KEY (`RefundBankSnapshotId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundPayoutProofs` (
    `RefundPayoutProofId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `RefundTransactionId` INTEGER NULL,
    `UploadedBy` INTEGER NOT NULL,
    `FileUrl` VARCHAR(1000) NOT NULL,
    `FileName` VARCHAR(255) NULL,
    `MimeType` VARCHAR(100) NULL,
    `Note` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_RefundPayoutProofs_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_RefundPayoutProofs_ReturnRequestId_CreatedAt`(`ReturnRequestId`, `CreatedAt`),
    INDEX `FK_RefundPayoutProofs_RefundTransactions`(`RefundTransactionId`),
    INDEX `FK_RefundPayoutProofs_Users`(`UploadedBy`),
    PRIMARY KEY (`RefundPayoutProofId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundBenefits` (
    `RefundBenefitId` INTEGER NOT NULL AUTO_INCREMENT,
    `ReturnRequestId` INTEGER NOT NULL,
    `OrderId` INTEGER NOT NULL,
    `UserId` INTEGER NOT NULL,
    `BenefitType` VARCHAR(20) NOT NULL,
    `PercentValue` DECIMAL(5, 2) NULL,
    `MaxDiscountAmount` DECIMAL(18, 2) NULL,
    `MinOrderValue` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `CouponId` INTEGER NULL,
    `Status` VARCHAR(20) NOT NULL,
    `ValidFrom` DATETIME(0) NOT NULL,
    `ValidUntil` DATETIME(0) NOT NULL,
    `IssuedAt` DATETIME(0) NULL,
    `UsedAt` DATETIME(0) NULL,
    `RuleVersion` VARCHAR(30) NOT NULL,
    `Source` VARCHAR(30) NOT NULL DEFAULT 'REFUND',
    `MetadataJson` LONGTEXT NULL,

    UNIQUE INDEX `UQ_RefundBenefits_ReturnRequestId`(`ReturnRequestId`),
    INDEX `IX_RefundBenefits_UserId_Status_ValidUntil`(`UserId`, `Status`, `ValidUntil`),
    INDEX `FK_RefundBenefits_Coupons`(`CouponId`),
    INDEX `FK_RefundBenefits_Orders`(`OrderId`),
    PRIMARY KEY (`RefundBenefitId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Refunds` (
    `RefundId` INTEGER NOT NULL AUTO_INCREMENT,
    `OrderId` INTEGER NOT NULL,
    `PaymentId` INTEGER NULL,
    `Amount` DECIMAL(18, 2) NOT NULL,
    `Type` VARCHAR(10) NOT NULL,
    `Method` VARCHAR(25) NOT NULL,
    `Status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    `GatewayTransactionId` VARCHAR(100) NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `GatewayError` VARCHAR(500) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_Refunds_OrderId`(`OrderId`),
    INDEX `IX_Refunds_Status`(`Status`),
    INDEX `FK_Refunds_Payments`(`PaymentId`),
    PRIMARY KEY (`RefundId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrders` (
    `PurchaseOrderId` INTEGER NOT NULL AUTO_INCREMENT,
    `PurchaseOrderNumber` VARCHAR(50) NOT NULL,
    `Supplier` VARCHAR(100) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `Notes` VARCHAR(1000) NULL,
    `OrderedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ReceivedAt` DATETIME(0) NULL,
    `CreatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ExpectedReceivedAt` DATETIME(0) NULL,
    `InvoiceNumber` VARCHAR(100) NULL,
    `SupplierContactName` VARCHAR(100) NULL,
    `SupplierPhone` VARCHAR(20) NULL,
    `SupplierEmail` VARCHAR(100) NULL,

    UNIQUE INDEX `UQ__Purchase__96241948CDB791D1`(`PurchaseOrderNumber`),
    INDEX `IX_PurchaseOrders_OrderedAt`(`OrderedAt`),
    INDEX `IX_PurchaseOrders_Status`(`Status`),
    PRIMARY KEY (`PurchaseOrderId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItems` (
    `PurchaseOrderItemId` INTEGER NOT NULL AUTO_INCREMENT,
    `PurchaseOrderId` INTEGER NOT NULL,
    `VariantId` INTEGER NOT NULL,
    `OrderedQty` INTEGER NOT NULL,
    `ReceivedQty` INTEGER NOT NULL DEFAULT 0,
    `UnitCost` DECIMAL(18, 2) NOT NULL,

    INDEX `IX_PurchaseOrderItems_VariantId`(`VariantId`),
    UNIQUE INDEX `UQ_PurchaseOrderItems_Order_Variant`(`PurchaseOrderId`, `VariantId`),
    PRIMARY KEY (`PurchaseOrderItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `VariantId` INTEGER NOT NULL,
    `AvailableQuantity` INTEGER NOT NULL DEFAULT 0,
    `ReservedQuantity` INTEGER NOT NULL DEFAULT 0,
    `IncomingQuantity` INTEGER NOT NULL DEFAULT 0,
    `UpdatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_Inventory_AvailableQuantity`(`AvailableQuantity`),
    PRIMARY KEY (`VariantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovements` (
    `StockMovementId` INTEGER NOT NULL AUTO_INCREMENT,
    `VariantId` INTEGER NOT NULL,
    `Type` VARCHAR(20) NOT NULL,
    `Quantity` INTEGER NOT NULL,
    `ReferenceType` VARCHAR(30) NULL,
    `ReferenceId` INTEGER NULL,
    `Note` VARCHAR(500) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `IX_StockMovements_Variant_CreatedAt`(`VariantId`, `CreatedAt`),
    INDEX `IX_StockMovements_Reference`(`ReferenceType`, `ReferenceId`),
    INDEX `FK_StockMovements_Users`(`CreatedBy`),
    PRIMARY KEY (`StockMovementId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoodsReceipts` (
    `GoodsReceiptId` INTEGER NOT NULL AUTO_INCREMENT,
    `PurchaseOrderId` INTEGER NOT NULL,
    `ReceiptNumber` VARCHAR(60) NOT NULL,
    `Notes` VARCHAR(1000) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `UQ__GoodsRec__C08AFDABFAE9F30F`(`ReceiptNumber`),
    INDEX `IX_GoodsReceipts_PurchaseOrder_CreatedAt`(`PurchaseOrderId`, `CreatedAt`),
    INDEX `FK_GoodsReceipts_Users`(`CreatedBy`),
    PRIMARY KEY (`GoodsReceiptId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoodsReceiptItems` (
    `GoodsReceiptItemId` INTEGER NOT NULL AUTO_INCREMENT,
    `GoodsReceiptId` INTEGER NOT NULL,
    `PurchaseOrderItemId` INTEGER NULL,
    `VariantId` INTEGER NOT NULL,
    `QuantityReceived` INTEGER NOT NULL,
    `UnitCost` DECIMAL(18, 2) NOT NULL,

    INDEX `IX_GoodsReceiptItems_GoodsReceiptId`(`GoodsReceiptId`),
    INDEX `IX_GoodsReceiptItems_VariantId`(`VariantId`),
    INDEX `FK_GoodsReceiptItems_PurchaseOrderItems`(`PurchaseOrderItemId`),
    PRIMARY KEY (`GoodsReceiptItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatTelemetryEvents` (
    `ChatTelemetryEventId` INTEGER NOT NULL AUTO_INCREMENT,
    `Event` VARCHAR(40) NOT NULL,
    `Page` VARCHAR(20) NOT NULL,
    `SessionId` VARCHAR(64) NOT NULL,
    `ProductId` INTEGER NULL,
    `MessageLength` INTEGER NULL,
    `ConversationLength` INTEGER NULL,
    `Target` VARCHAR(200) NULL,
    `Label` VARCHAR(80) NULL,
    `Placement` VARCHAR(30) NULL,
    `HasContextSummary` BOOLEAN NOT NULL DEFAULT false,
    `IpAddress` VARCHAR(64) NULL,
    `UserAgent` VARCHAR(200) NULL,
    `CreatedAt` DATETIME(0) NOT NULL,

    INDEX `IX_ChatTelemetryEvents_CreatedAt`(`CreatedAt`),
    INDEX `IX_ChatTelemetryEvents_EventPage`(`Event`, `Page`),
    PRIMARY KEY (`ChatTelemetryEventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailVerificationTokens` ADD CONSTRAINT `FK_EmailVerificationTokens_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `PasswordResetTokens` ADD CONSTRAINT `FK_PasswordResetTokens_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `UserRoles` ADD CONSTRAINT `FK_UserRoles_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles`(`RoleId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `UserRoles` ADD CONSTRAINT `FK_UserRoles_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RolePermissions` ADD CONSTRAINT `FK_RolePermissions_Permissions` FOREIGN KEY (`PermissionId`) REFERENCES `Permissions`(`PermissionId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RolePermissions` ADD CONSTRAINT `FK_RolePermissions_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles`(`RoleId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `UserLogins` ADD CONSTRAINT `FK_UserLogins_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Addresses` ADD CONSTRAINT `FK_Addresses_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Categories` ADD CONSTRAINT `FK_Categories_Parent` FOREIGN KEY (`ParentId`) REFERENCES `Categories`(`CategoryId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Products` ADD CONSTRAINT `FK_Products_Brands` FOREIGN KEY (`BrandId`) REFERENCES `Brands`(`BrandId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Products` ADD CONSTRAINT `FK_Products_Categories` FOREIGN KEY (`CategoryId`) REFERENCES `Categories`(`CategoryId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ProductVariants` ADD CONSTRAINT `FK_ProductVariants_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products`(`ProductId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `AttributeValues` ADD CONSTRAINT `FK_AttributeValues_Attributes` FOREIGN KEY (`AttributeId`) REFERENCES `Attributes`(`AttributeId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `VariantAttributes` ADD CONSTRAINT `FK_VariantAttributes_Values` FOREIGN KEY (`ValueId`) REFERENCES `AttributeValues`(`ValueId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `VariantAttributes` ADD CONSTRAINT `FK_VariantAttributes_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ProductImages` ADD CONSTRAINT `FK_ProductImages_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products`(`ProductId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Carts` ADD CONSTRAINT `FK_Carts_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `CartItems` ADD CONSTRAINT `FK_CartItems_Carts` FOREIGN KEY (`CartId`) REFERENCES `Carts`(`CartId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `CartItems` ADD CONSTRAINT `FK_CartItems_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Orders` ADD CONSTRAINT `FK_Orders_Coupons` FOREIGN KEY (`CouponId`) REFERENCES `Coupons`(`CouponId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Orders` ADD CONSTRAINT `FK_Orders_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderStatusHistory` ADD CONSTRAINT `FK_OrderStatusHistory_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Shipments` ADD CONSTRAINT `FK_Shipments_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderItems` ADD CONSTRAINT `FK_OrderItems_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderItems` ADD CONSTRAINT `FK_OrderItems_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Payments` ADD CONSTRAINT `FK_Payments_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Reviews` ADD CONSTRAINT `FK_Reviews_OrderItems` FOREIGN KEY (`OrderItemId`) REFERENCES `OrderItems`(`OrderItemId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Reviews` ADD CONSTRAINT `FK_Reviews_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products`(`ProductId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Reviews` ADD CONSTRAINT `FK_Reviews_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `InventoryLogs` ADD CONSTRAINT `FK_InventoryLogs_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `InventoryLogs` ADD CONSTRAINT `FK_InventoryLogs_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `InventoryLogs` ADD CONSTRAINT `FK_InventoryLogs_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderReturns` ADD CONSTRAINT `FK_OrderReturns_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderReturns` ADD CONSTRAINT `FK_OrderReturns_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequests` ADD CONSTRAINT `FK_ReturnRequests_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequests` ADD CONSTRAINT `FK_ReturnRequests_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestItems` ADD CONSTRAINT `FK_ReturnRequestItems_OrderItems` FOREIGN KEY (`OrderItemId`) REFERENCES `OrderItems`(`OrderItemId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestItems` ADD CONSTRAINT `FK_ReturnRequestItems_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestAttachments` ADD CONSTRAINT `FK_ReturnRequestAttachments_ReturnRequestItems` FOREIGN KEY (`ReturnRequestItemId`) REFERENCES `ReturnRequestItems`(`ReturnRequestItemId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestAttachments` ADD CONSTRAINT `FK_ReturnRequestAttachments_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestStatusLogs` ADD CONSTRAINT `FK_ReturnRequestStatusLogs_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ReturnRequestStatusLogs` ADD CONSTRAINT `FK_ReturnRequestStatusLogs_Users` FOREIGN KEY (`ChangedBy`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundTransactions` ADD CONSTRAINT `FK_RefundTransactions_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundTransactions` ADD CONSTRAINT `FK_RefundTransactions_Users` FOREIGN KEY (`ProcessedBy`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `CustomerBankAccounts` ADD CONSTRAINT `FK_CustomerBankAccounts_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBankSnapshots` ADD CONSTRAINT `FK_RefundBankSnapshots_CustomerBankAccounts` FOREIGN KEY (`BankAccountId`) REFERENCES `CustomerBankAccounts`(`BankAccountId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBankSnapshots` ADD CONSTRAINT `FK_RefundBankSnapshots_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundPayoutProofs` ADD CONSTRAINT `FK_RefundPayoutProofs_RefundTransactions` FOREIGN KEY (`RefundTransactionId`) REFERENCES `RefundTransactions`(`RefundTransactionId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundPayoutProofs` ADD CONSTRAINT `FK_RefundPayoutProofs_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundPayoutProofs` ADD CONSTRAINT `FK_RefundPayoutProofs_Users` FOREIGN KEY (`UploadedBy`) REFERENCES `Users`(`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBenefits` ADD CONSTRAINT `FK_RefundBenefits_Coupons` FOREIGN KEY (`CouponId`) REFERENCES `Coupons`(`CouponId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBenefits` ADD CONSTRAINT `FK_RefundBenefits_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBenefits` ADD CONSTRAINT `FK_RefundBenefits_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests`(`ReturnRequestId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `RefundBenefits` ADD CONSTRAINT `FK_RefundBenefits_Users` FOREIGN KEY (`UserId`) REFERENCES `Users`(`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Refunds` ADD CONSTRAINT `FK_Refunds_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders`(`OrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Refunds` ADD CONSTRAINT `FK_Refunds_Payments` FOREIGN KEY (`PaymentId`) REFERENCES `Payments`(`PaymentId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItems` ADD CONSTRAINT `FK_PurchaseOrderItems_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItems` ADD CONSTRAINT `FK_PurchaseOrderItems_PurchaseOrders` FOREIGN KEY (`PurchaseOrderId`) REFERENCES `PurchaseOrders`(`PurchaseOrderId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `FK_Inventory_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `StockMovements` ADD CONSTRAINT `FK_StockMovements_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `StockMovements` ADD CONSTRAINT `FK_StockMovements_Users` FOREIGN KEY (`CreatedBy`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GoodsReceipts` ADD CONSTRAINT `FK_GoodsReceipts_PurchaseOrders` FOREIGN KEY (`PurchaseOrderId`) REFERENCES `PurchaseOrders`(`PurchaseOrderId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GoodsReceipts` ADD CONSTRAINT `FK_GoodsReceipts_Users` FOREIGN KEY (`CreatedBy`) REFERENCES `Users`(`UserId`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItems` ADD CONSTRAINT `FK_GoodsReceiptItems_GoodsReceipts` FOREIGN KEY (`GoodsReceiptId`) REFERENCES `GoodsReceipts`(`GoodsReceiptId`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItems` ADD CONSTRAINT `FK_GoodsReceiptItems_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants`(`VariantId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItems` ADD CONSTRAINT `FK_GoodsReceiptItems_PurchaseOrderItems` FOREIGN KEY (`PurchaseOrderItemId`) REFERENCES `PurchaseOrderItems`(`PurchaseOrderItemId`) ON DELETE SET NULL ON UPDATE NO ACTION;

