-- AISTHEA-ready import target: use the existing schema provisioned by AISTHEA.
USE `AISTHEA`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: AISTHEA
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `UserId` int NOT NULL AUTO_INCREMENT,
  `Email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `PasswordHash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `FullName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `AvatarUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `GoogleId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Pending',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `UQ__Users__A9D10534FE2330F2` (`Email`),
  UNIQUE KEY `UQ_Users_GoogleId` (`GoogleId`),
  KEY `IX_Users_Email_Status` (`Email`,`Status`),
  KEY `IX_Users_Phone` (`Phone`),
  KEY `IX_Users_Status` (`Status`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Roles`
--

DROP TABLE IF EXISTS `Roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Roles` (
  `RoleId` int NOT NULL AUTO_INCREMENT,
  `RoleName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`RoleId`),
  UNIQUE KEY `UQ__Roles__8A2B6160E2CD5E04` (`RoleName`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Permissions`
--

DROP TABLE IF EXISTS `Permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Permissions` (
  `PermissionId` int NOT NULL AUTO_INCREMENT,
  `Code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`PermissionId`),
  UNIQUE KEY `UQ__Permissi__A25C5AA7565D773B` (`Code`),
  KEY `IX_Permissions_Module` (`Module`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Brands`
--

DROP TABLE IF EXISTS `Brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Brands` (
  `BrandId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`BrandId`),
  UNIQUE KEY `UQ__Brands__737584F69E5ADB5A` (`Name`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Attributes`
--

DROP TABLE IF EXISTS `Attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Attributes` (
  `AttributeId` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`AttributeId`),
  UNIQUE KEY `UQ__Attribut__737584F62D7060DB` (`Name`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AttributeValues`
--

DROP TABLE IF EXISTS `AttributeValues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AttributeValues` (
  `ValueId` int NOT NULL AUTO_INCREMENT,
  `AttributeId` int NOT NULL,
  `Value` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`ValueId`),
  KEY `FK_AttributeValues_Attributes` (`AttributeId`),
  CONSTRAINT `FK_AttributeValues_Attributes` FOREIGN KEY (`AttributeId`) REFERENCES `Attributes` (`AttributeId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Categories`
--

DROP TABLE IF EXISTS `Categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Categories` (
  `CategoryId` int NOT NULL AUTO_INCREMENT,
  `ParentId` int DEFAULT NULL,
  `Name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ImageUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`CategoryId`),
  UNIQUE KEY `UQ__Categori__BC7B5FB63FB08662` (`Slug`),
  KEY `IX_Categories_ParentId` (`ParentId`),
  CONSTRAINT `FK_Categories_Parent` FOREIGN KEY (`ParentId`) REFERENCES `Categories` (`CategoryId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Coupons`
--

DROP TABLE IF EXISTS `Coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Coupons` (
  `CouponId` int NOT NULL AUTO_INCREMENT,
  `Code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Value` decimal(18,2) NOT NULL,
  `MaxDiscountAmount` decimal(18,2) DEFAULT NULL,
  `MinOrderValue` decimal(18,2) NOT NULL DEFAULT 0,
  `StartDate` datetime NOT NULL,
  `EndDate` datetime NOT NULL,
  `UsageLimit` int NOT NULL,
  `UsedCount` int NOT NULL DEFAULT 0,
  `UsagePerUser` int NOT NULL DEFAULT 1,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `IsHidden` tinyint(1) NOT NULL DEFAULT 0,
  `Source` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `VisibleInPublicList` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`CouponId`),
  UNIQUE KEY `UQ__Coupons__A25C5AA747E73C3C` (`Code`),
  KEY `IX_Coupons_IsActive` (`IsActive`),
  KEY `IX_Coupons_Source` (`Source`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ChatTelemetryEvents`
--

DROP TABLE IF EXISTS `ChatTelemetryEvents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ChatTelemetryEvents` (
  `ChatTelemetryEventId` int NOT NULL AUTO_INCREMENT,
  `Event` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Page` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `SessionId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProductId` int DEFAULT NULL,
  `MessageLength` int DEFAULT NULL,
  `ConversationLength` int DEFAULT NULL,
  `Target` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Label` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Placement` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `HasContextSummary` tinyint(1) NOT NULL DEFAULT '0',
  `IpAddress` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `UserAgent` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL,
  PRIMARY KEY (`ChatTelemetryEventId`),
  KEY `IX_ChatTelemetryEvents_CreatedAt` (`CreatedAt`),
  KEY `IX_ChatTelemetryEvents_EventPage` (`Event`,`Page`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PurchaseOrders`
--

DROP TABLE IF EXISTS `PurchaseOrders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PurchaseOrders` (
  `PurchaseOrderId` int NOT NULL AUTO_INCREMENT,
  `PurchaseOrderNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Supplier` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'PENDING',
  `Notes` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `OrderedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ReceivedAt` datetime DEFAULT NULL,
  `CreatedBy` int DEFAULT NULL,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ExpectedReceivedAt` datetime DEFAULT NULL,
  `InvoiceNumber` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `SupplierContactName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `SupplierPhone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `SupplierEmail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`PurchaseOrderId`),
  UNIQUE KEY `UQ__Purchase__96241948CDB791D1` (`PurchaseOrderNumber`),
  KEY `IX_PurchaseOrders_OrderedAt` (`OrderedAt`),
  KEY `IX_PurchaseOrders_Status` (`Status`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserRoles`
--

DROP TABLE IF EXISTS `UserRoles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserRoles` (
  `UserId` int NOT NULL,
  `RoleId` int NOT NULL,
  PRIMARY KEY (`UserId`,`RoleId`),
  KEY `FK_UserRoles_Roles` (`RoleId`),
  CONSTRAINT `FK_UserRoles_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE,
  CONSTRAINT `FK_UserRoles_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RolePermissions`
--

DROP TABLE IF EXISTS `RolePermissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RolePermissions` (
  `RoleId` int NOT NULL,
  `PermissionId` int NOT NULL,
  PRIMARY KEY (`RoleId`,`PermissionId`),
  KEY `FK_RolePermissions_Permissions` (`PermissionId`),
  CONSTRAINT `FK_RolePermissions_Permissions` FOREIGN KEY (`PermissionId`) REFERENCES `Permissions` (`PermissionId`) ON DELETE CASCADE,
  CONSTRAINT `FK_RolePermissions_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `UserLogins`
--

DROP TABLE IF EXISTS `UserLogins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserLogins` (
  `LoginProvider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProviderKey` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProviderDisplayName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `UserId` int NOT NULL,
  `AccessToken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `RefreshToken` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `TokenExpiry` datetime DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`LoginProvider`,`ProviderKey`),
  KEY `IX_UserLogins_UserId` (`UserId`),
  CONSTRAINT `FK_UserLogins_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Addresses`
--

DROP TABLE IF EXISTS `Addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Addresses` (
  `AddressId` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `RecipientName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `AddressLine` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `City` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `District` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `IsDefault` tinyint(1) DEFAULT 0,
  `Ward` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`AddressId`),
  KEY `IX_Addresses_UserId_IsDefault` (`UserId`,`IsDefault`),
  CONSTRAINT `FK_Addresses_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `EmailVerificationTokens`
--

DROP TABLE IF EXISTS `EmailVerificationTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmailVerificationTokens` (
  `TokenId` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `Token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ExpiresAt` datetime NOT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`TokenId`),
  UNIQUE KEY `UQ__EmailVer__1EB4F817BF263B03` (`Token`),
  KEY `IX_EmailVerificationTokens_UserId` (`UserId`),
  CONSTRAINT `FK_EmailVerificationTokens_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PasswordResetTokens`
--

DROP TABLE IF EXISTS `PasswordResetTokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PasswordResetTokens` (
  `TokenId` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `Token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ExpiresAt` datetime NOT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`TokenId`),
  UNIQUE KEY `UQ__Password__1EB4F81743DB65F8` (`Token`),
  KEY `IX_PasswordResetTokens_UserId` (`UserId`),
  CONSTRAINT `FK_PasswordResetTokens_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CustomerBankAccounts`
--

DROP TABLE IF EXISTS `CustomerBankAccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CustomerBankAccounts` (
  `BankAccountId` int NOT NULL AUTO_INCREMENT,
  `UserId` int NOT NULL,
  `BankName` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `BankCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `AccountNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `AccountHolder` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `QrImageUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `InputMethod` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `IsDefault` tinyint(1) NOT NULL DEFAULT 1,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`BankAccountId`),
  KEY `IX_CustomerBankAccounts_UserId` (`UserId`),
  KEY `IX_CustomerBankAccounts_UserId_IsDefault` (`UserId`,`IsDefault`),
  KEY `IX_CustomerBankAccounts_UserId_IsDefault_IsActive` (`UserId`,`IsDefault`,`IsActive`),
  CONSTRAINT `FK_CustomerBankAccounts_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Orders`
--

DROP TABLE IF EXISTS `Orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Orders` (
  `OrderId` int NOT NULL AUTO_INCREMENT,
  `UserId` int DEFAULT NULL,
  `OrderNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CustomerName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CustomerEmail` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CustomerPhone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ShippingCity` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ShippingDistrict` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ShippingWard` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ShippingAddressDetail` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `TotalAmount` decimal(18,2) NOT NULL,
  `DiscountAmount` decimal(18,2) DEFAULT 0,
  `CouponId` int DEFAULT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'Pending',
  `PaymentMethod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'COD',
  `Note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ShippingFee` decimal(18,2) NOT NULL DEFAULT 0,
  `ShippingMethod` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'STANDARD',
  `ShippingCityCode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`OrderId`),
  UNIQUE KEY `UQ__Orders__CAC5E743893BAC47` (`OrderNumber`),
  KEY `IX_Orders_CreatedAt` (`CreatedAt`),
  KEY `IX_Orders_Status` (`Status`),
  KEY `IX_Orders_UserId` (`UserId`),
  KEY `FK_Orders_Coupons` (`CouponId`),
  CONSTRAINT `FK_Orders_Coupons` FOREIGN KEY (`CouponId`) REFERENCES `Coupons` (`CouponId`),
  CONSTRAINT `FK_Orders_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Products`
--

DROP TABLE IF EXISTS `Products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Products` (
  `ProductId` int NOT NULL AUTO_INCREMENT,
  `CategoryId` int NOT NULL,
  `BrandId` int DEFAULT NULL,
  `Name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Slug` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `BasePrice` decimal(18,2) NOT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'Active',
  `IsDeleted` tinyint(1) DEFAULT 0,
  `DeletedAt` datetime DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProductId`),
  UNIQUE KEY `UQ__Products__BC7B5FB67719B0A8` (`Slug`),
  KEY `IX_Products_CategoryId` (`CategoryId`),
  KEY `IX_Products_BrandId` (`BrandId`),
  KEY `IX_Products_BasePrice` (`BasePrice`),
  KEY `IX_Products_Name` (`Name`),
  KEY `IX_Products_Status` (`Status`),
  CONSTRAINT `FK_Products_Brands` FOREIGN KEY (`BrandId`) REFERENCES `Brands` (`BrandId`),
  CONSTRAINT `FK_Products_Categories` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`CategoryId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ProductVariants`
--

DROP TABLE IF EXISTS `ProductVariants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ProductVariants` (
  `VariantId` int NOT NULL AUTO_INCREMENT,
  `ProductId` int NOT NULL,
  `SKU` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Price` decimal(18,2) NOT NULL,
  `StockQuantity` int NOT NULL DEFAULT 0,
  `IsDefault` tinyint(1) DEFAULT 0,
  `IsDeleted` tinyint(1) DEFAULT 0,
  `DeletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`VariantId`),
  UNIQUE KEY `UQ__ProductV__CA1ECF0D2467B19F` (`SKU`),
  KEY `IX_ProductVariants_ProductId` (`ProductId`),
  KEY `IX_ProductVariants_StockQuantity` (`StockQuantity`),
  CONSTRAINT `FK_ProductVariants_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`ProductId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Carts`
--

DROP TABLE IF EXISTS `Carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Carts` (
  `CartId` int NOT NULL AUTO_INCREMENT,
  `UserId` int DEFAULT NULL,
  `SessionId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`CartId`),
  UNIQUE KEY `UQ__Carts__1788CC4D7551E656` (`UserId`),
  CONSTRAINT `FK_Carts_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Payments`
--

DROP TABLE IF EXISTS `Payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Payments` (
  `PaymentId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `PaymentMethod` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `TransactionCode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Pending',
  `PaymentDate` datetime DEFAULT CURRENT_TIMESTAMP,
  `Note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`PaymentId`),
  KEY `IX_Payments_OrderId` (`OrderId`),
  CONSTRAINT `FK_Payments_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrderStatusHistory`
--

DROP TABLE IF EXISTS `OrderStatusHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderStatusHistory` (
  `OrderStatusHistoryId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `OldStatus` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ChangedBy` int DEFAULT NULL,
  `Note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ChangedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`OrderStatusHistoryId`),
  KEY `IX_OrderStatusHistory_OrderId` (`OrderId`),
  KEY `IX_OrderStatusHistory_OrderId_ChangedAt` (`OrderId`,`ChangedAt`),
  CONSTRAINT `FK_OrderStatusHistory_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Shipments`
--

DROP TABLE IF EXISTS `Shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Shipments` (
  `ShipmentId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `Carrier` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `TrackingNumber` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Eta` datetime DEFAULT NULL,
  `LastKnownLocation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ShippingMode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'manual',
  `Provider` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ProviderOrderCode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ProviderStatus` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `DeliveryProofImages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DeliveryProofReviewed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ShipmentId`),
  UNIQUE KEY `UQ__Shipment__C3905BCE52634EB7` (`OrderId`),
  KEY `IX_Shipments_TrackingNumber` (`TrackingNumber`),
  KEY `IX_Shipments_ProviderOrderCode` (`ProviderOrderCode`),
  CONSTRAINT `FK_Shipments_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrderItems`
--

DROP TABLE IF EXISTS `OrderItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderItems` (
  `OrderItemId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `VariantId` int DEFAULT NULL,
  `ProductName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `SKU` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `VariantName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `UnitPrice` decimal(18,2) NOT NULL,
  `Quantity` int NOT NULL,
  `GrossItemAmount` decimal(18,2) NOT NULL DEFAULT 0,
  `AllocatedDiscountAmount` decimal(18,2) NOT NULL DEFAULT 0,
  `NetItemPaidAmount` decimal(18,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`OrderItemId`),
  KEY `IX_OrderItems_OrderId` (`OrderId`),
  KEY `IX_OrderItems_VariantId` (`VariantId`),
  CONSTRAINT `FK_OrderItems_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE,
  CONSTRAINT `FK_OrderItems_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VariantAttributes`
--

DROP TABLE IF EXISTS `VariantAttributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VariantAttributes` (
  `VariantId` int NOT NULL,
  `ValueId` int NOT NULL,
  PRIMARY KEY (`VariantId`,`ValueId`),
  KEY `IX_VariantAttributes_ValueId` (`ValueId`),
  CONSTRAINT `FK_VariantAttributes_Values` FOREIGN KEY (`ValueId`) REFERENCES `AttributeValues` (`ValueId`) ON DELETE CASCADE,
  CONSTRAINT `FK_VariantAttributes_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ProductImages`
--

DROP TABLE IF EXISTS `ProductImages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ProductImages` (
  `ImageId` int NOT NULL AUTO_INCREMENT,
  `ProductId` int NOT NULL,
  `VariantId` int DEFAULT NULL,
  `ImageUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ThumbnailUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `IsPrimary` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`ImageId`),
  KEY `IX_ProductImages_ProductId` (`ProductId`),
  KEY `IX_ProductImages_ProductId_IsPrimary` (`ProductId`,`IsPrimary`),
  KEY `IX_ProductImages_VariantId` (`VariantId`),
  CONSTRAINT `FK_ProductImages_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`ProductId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CartItems`
--

DROP TABLE IF EXISTS `CartItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CartItems` (
  `CartItemId` int NOT NULL AUTO_INCREMENT,
  `CartId` int NOT NULL,
  `VariantId` int NOT NULL,
  `Quantity` int NOT NULL,
  `AddedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`CartItemId`),
  UNIQUE KEY `UQ_CartItems_Cart_Variant` (`CartId`,`VariantId`),
  KEY `IX_CartItems_VariantId` (`VariantId`),
  CONSTRAINT `FK_CartItems_Carts` FOREIGN KEY (`CartId`) REFERENCES `Carts` (`CartId`) ON DELETE CASCADE,
  CONSTRAINT `FK_CartItems_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Reviews`
--

DROP TABLE IF EXISTS `Reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Reviews` (
  `ReviewId` int NOT NULL AUTO_INCREMENT,
  `ProductId` int NOT NULL,
  `UserId` int NOT NULL,
  `OrderItemId` int DEFAULT NULL,
  `Rating` int DEFAULT NULL,
  `Comment` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ReviewId`),
  UNIQUE KEY `UQ__Reviews__57ED068076086186` (`OrderItemId`),
  KEY `IX_Reviews_ProductId` (`ProductId`),
  KEY `IX_Reviews_UserId` (`UserId`),
  CONSTRAINT `FK_Reviews_OrderItems` FOREIGN KEY (`OrderItemId`) REFERENCES `OrderItems` (`OrderItemId`),
  CONSTRAINT `FK_Reviews_Products` FOREIGN KEY (`ProductId`) REFERENCES `Products` (`ProductId`) ON DELETE CASCADE,
  CONSTRAINT `FK_Reviews_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `InventoryLogs`
--

DROP TABLE IF EXISTS `InventoryLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InventoryLogs` (
  `LogId` int NOT NULL AUTO_INCREMENT,
  `VariantId` int NOT NULL,
  `OrderId` int DEFAULT NULL,
  `UserId` int DEFAULT NULL,
  `ChangeQuantity` int NOT NULL,
  `PreviousStock` int NOT NULL,
  `NewStock` int NOT NULL,
  `Reason` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LogId`),
  KEY `IX_InventoryLogs_VariantId` (`VariantId`),
  KEY `IX_InventoryLogs_OrderId` (`OrderId`),
  KEY `FK_InventoryLogs_Users` (`UserId`),
  CONSTRAINT `FK_InventoryLogs_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE SET NULL,
  CONSTRAINT `FK_InventoryLogs_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL,
  CONSTRAINT `FK_InventoryLogs_Variants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `OrderReturns`
--

DROP TABLE IF EXISTS `OrderReturns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderReturns` (
  `ReturnId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `UserId` int DEFAULT NULL,
  `Reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProofImages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'PENDING_APPROVAL',
  `AdminNote` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ReturnId`),
  UNIQUE KEY `UQ__OrderRet__C3905BCE786116EB` (`OrderId`),
  KEY `IX_OrderReturns_Status` (`Status`),
  KEY `IX_OrderReturns_UserId` (`UserId`),
  CONSTRAINT `FK_OrderReturns_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE,
  CONSTRAINT `FK_OrderReturns_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PurchaseOrderItems`
--

DROP TABLE IF EXISTS `PurchaseOrderItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PurchaseOrderItems` (
  `PurchaseOrderItemId` int NOT NULL AUTO_INCREMENT,
  `PurchaseOrderId` int NOT NULL,
  `VariantId` int NOT NULL,
  `OrderedQty` int NOT NULL,
  `ReceivedQty` int NOT NULL DEFAULT 0,
  `UnitCost` decimal(18,2) NOT NULL,
  PRIMARY KEY (`PurchaseOrderItemId`),
  UNIQUE KEY `UQ_PurchaseOrderItems_Order_Variant` (`PurchaseOrderId`,`VariantId`),
  KEY `IX_PurchaseOrderItems_VariantId` (`VariantId`),
  CONSTRAINT `FK_PurchaseOrderItems_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`),
  CONSTRAINT `FK_PurchaseOrderItems_PurchaseOrders` FOREIGN KEY (`PurchaseOrderId`) REFERENCES `PurchaseOrders` (`PurchaseOrderId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Inventory`
--

DROP TABLE IF EXISTS `Inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Inventory` (
  `VariantId` int NOT NULL,
  `AvailableQuantity` int NOT NULL DEFAULT 0,
  `ReservedQuantity` int NOT NULL DEFAULT 0,
  `IncomingQuantity` int NOT NULL DEFAULT 0,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`VariantId`),
  KEY `IX_Inventory_AvailableQuantity` (`AvailableQuantity`),
  CONSTRAINT `FK_Inventory_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `StockMovements`
--

DROP TABLE IF EXISTS `StockMovements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StockMovements` (
  `StockMovementId` int NOT NULL AUTO_INCREMENT,
  `VariantId` int NOT NULL,
  `Type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Quantity` int NOT NULL,
  `ReferenceType` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ReferenceId` int DEFAULT NULL,
  `Note` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedBy` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`StockMovementId`),
  KEY `IX_StockMovements_Variant_CreatedAt` (`VariantId`,`CreatedAt`),
  KEY `IX_StockMovements_Reference` (`ReferenceType`,`ReferenceId`),
  KEY `FK_StockMovements_Users` (`CreatedBy`),
  CONSTRAINT `FK_StockMovements_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`) ON DELETE CASCADE,
  CONSTRAINT `FK_StockMovements_Users` FOREIGN KEY (`CreatedBy`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GoodsReceipts`
--

DROP TABLE IF EXISTS `GoodsReceipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GoodsReceipts` (
  `GoodsReceiptId` int NOT NULL AUTO_INCREMENT,
  `PurchaseOrderId` int NOT NULL,
  `ReceiptNumber` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Notes` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedBy` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`GoodsReceiptId`),
  UNIQUE KEY `UQ__GoodsRec__C08AFDABFAE9F30F` (`ReceiptNumber`),
  KEY `IX_GoodsReceipts_PurchaseOrder_CreatedAt` (`PurchaseOrderId`,`CreatedAt`),
  KEY `FK_GoodsReceipts_Users` (`CreatedBy`),
  CONSTRAINT `FK_GoodsReceipts_PurchaseOrders` FOREIGN KEY (`PurchaseOrderId`) REFERENCES `PurchaseOrders` (`PurchaseOrderId`),
  CONSTRAINT `FK_GoodsReceipts_Users` FOREIGN KEY (`CreatedBy`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GoodsReceiptItems`
--

DROP TABLE IF EXISTS `GoodsReceiptItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GoodsReceiptItems` (
  `GoodsReceiptItemId` int NOT NULL AUTO_INCREMENT,
  `GoodsReceiptId` int NOT NULL,
  `PurchaseOrderItemId` int DEFAULT NULL,
  `VariantId` int NOT NULL,
  `QuantityReceived` int NOT NULL,
  `UnitCost` decimal(18,2) NOT NULL,
  PRIMARY KEY (`GoodsReceiptItemId`),
  KEY `IX_GoodsReceiptItems_GoodsReceiptId` (`GoodsReceiptId`),
  KEY `IX_GoodsReceiptItems_VariantId` (`VariantId`),
  KEY `FK_GoodsReceiptItems_PurchaseOrderItems` (`PurchaseOrderItemId`),
  CONSTRAINT `FK_GoodsReceiptItems_GoodsReceipts` FOREIGN KEY (`GoodsReceiptId`) REFERENCES `GoodsReceipts` (`GoodsReceiptId`) ON DELETE CASCADE,
  CONSTRAINT `FK_GoodsReceiptItems_ProductVariants` FOREIGN KEY (`VariantId`) REFERENCES `ProductVariants` (`VariantId`),
  CONSTRAINT `FK_GoodsReceiptItems_PurchaseOrderItems` FOREIGN KEY (`PurchaseOrderItemId`) REFERENCES `PurchaseOrderItems` (`PurchaseOrderItemId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ReturnRequests`
--

DROP TABLE IF EXISTS `ReturnRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReturnRequests` (
  `ReturnRequestId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `UserId` int NOT NULL,
  `Reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Note` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `DeliveredAt` datetime DEFAULT NULL,
  `TotalRefundAmount` decimal(18,2) NOT NULL DEFAULT 0,
  `Status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'REQUESTED',
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `RefundStatus` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'NOT_APPLICABLE',
  `FinanceNote` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `BankInfoRequestedAt` datetime DEFAULT NULL,
  `BankInfoSubmittedAt` datetime DEFAULT NULL,
  `RefundCompletedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`ReturnRequestId`),
  KEY `IX_ReturnRequests_OrderId` (`OrderId`),
  KEY `IX_ReturnRequests_Status` (`Status`),
  KEY `IX_ReturnRequests_UserId` (`UserId`),
  KEY `IX_ReturnRequests_CreatedAt` (`CreatedAt`),
  KEY `IX_ReturnRequests_RefundStatus` (`RefundStatus`),
  CONSTRAINT `FK_ReturnRequests_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE,
  CONSTRAINT `FK_ReturnRequests_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ReturnRequestItems`
--

DROP TABLE IF EXISTS `ReturnRequestItems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReturnRequestItems` (
  `ReturnRequestItemId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `OrderItemId` int NOT NULL,
  `Quantity` int NOT NULL,
  `UnitPrice` decimal(18,2) NOT NULL,
  `Reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ReasonText` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`ReturnRequestItemId`),
  KEY `IX_ReturnRequestItems_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_ReturnRequestItems_OrderItemId` (`OrderItemId`),
  CONSTRAINT `FK_ReturnRequestItems_OrderItems` FOREIGN KEY (`OrderItemId`) REFERENCES `OrderItems` (`OrderItemId`),
  CONSTRAINT `FK_ReturnRequestItems_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ReturnRequestAttachments`
--

DROP TABLE IF EXISTS `ReturnRequestAttachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReturnRequestAttachments` (
  `AttachmentId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `FileUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ReturnRequestItemId` int DEFAULT NULL,
  PRIMARY KEY (`AttachmentId`),
  KEY `IX_ReturnRequestAttachments_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_ReturnRequestAttachments_ReturnRequestItemId` (`ReturnRequestItemId`),
  CONSTRAINT `FK_ReturnRequestAttachments_ReturnRequestItems` FOREIGN KEY (`ReturnRequestItemId`) REFERENCES `ReturnRequestItems` (`ReturnRequestItemId`),
  CONSTRAINT `FK_ReturnRequestAttachments_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ReturnRequestStatusLogs`
--

DROP TABLE IF EXISTS `ReturnRequestStatusLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReturnRequestStatusLogs` (
  `ReturnRequestStatusLogId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `FromStatus` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ToStatus` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ChangedBy` int DEFAULT NULL,
  `Comment` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ReturnRequestStatusLogId`),
  KEY `IX_ReturnRequestStatusLogs_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_ReturnRequestStatusLogs_ChangedBy` (`ChangedBy`),
  KEY `IX_ReturnRequestStatusLogs_CreatedAt` (`CreatedAt`),
  CONSTRAINT `FK_ReturnRequestStatusLogs_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`) ON DELETE CASCADE,
  CONSTRAINT `FK_ReturnRequestStatusLogs_Users` FOREIGN KEY (`ChangedBy`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RefundTransactions`
--

DROP TABLE IF EXISTS `RefundTransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefundTransactions` (
  `RefundTransactionId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `Method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'PENDING',
  `IdempotencyKey` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `TransactionRef` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `ProcessedBy` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`RefundTransactionId`),
  UNIQUE KEY `UQ_RefundTransactions_IdempotencyKey` (`IdempotencyKey`),
  KEY `IX_RefundTransactions_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_RefundTransactions_Status` (`Status`),
  KEY `IX_RefundTransactions_ProcessedBy` (`ProcessedBy`),
  CONSTRAINT `FK_RefundTransactions_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`) ON DELETE CASCADE,
  CONSTRAINT `FK_RefundTransactions_Users` FOREIGN KEY (`ProcessedBy`) REFERENCES `Users` (`UserId`) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RefundBankSnapshots`
--

DROP TABLE IF EXISTS `RefundBankSnapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefundBankSnapshots` (
  `RefundBankSnapshotId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `BankAccountId` int DEFAULT NULL,
  `BankName` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `BankCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `AccountNumberMasked` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `AccountHolder` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `QrImageUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `InputMethod` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CapturedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RefundBankSnapshotId`),
  KEY `IX_RefundBankSnapshots_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_RefundBankSnapshots_ReturnRequestId_CapturedAt` (`ReturnRequestId`,`CapturedAt`),
  KEY `FK_RefundBankSnapshots_CustomerBankAccounts` (`BankAccountId`),
  CONSTRAINT `FK_RefundBankSnapshots_CustomerBankAccounts` FOREIGN KEY (`BankAccountId`) REFERENCES `CustomerBankAccounts` (`BankAccountId`) ON DELETE SET NULL,
  CONSTRAINT `FK_RefundBankSnapshots_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RefundBenefits`
--

DROP TABLE IF EXISTS `RefundBenefits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefundBenefits` (
  `RefundBenefitId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `OrderId` int NOT NULL,
  `UserId` int NOT NULL,
  `BenefitType` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `PercentValue` decimal(5,2) DEFAULT NULL,
  `MaxDiscountAmount` decimal(18,2) DEFAULT NULL,
  `MinOrderValue` decimal(18,2) NOT NULL DEFAULT 0,
  `CouponId` int DEFAULT NULL,
  `Status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ValidFrom` datetime NOT NULL,
  `ValidUntil` datetime NOT NULL,
  `IssuedAt` datetime DEFAULT NULL,
  `UsedAt` datetime DEFAULT NULL,
  `RuleVersion` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Source` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'REFUND',
  `MetadataJson` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`RefundBenefitId`),
  UNIQUE KEY `UQ_RefundBenefits_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_RefundBenefits_UserId_Status_ValidUntil` (`UserId`,`Status`,`ValidUntil`),
  KEY `FK_RefundBenefits_Orders` (`OrderId`),
  KEY `FK_RefundBenefits_Coupons` (`CouponId`),
  CONSTRAINT `FK_RefundBenefits_Coupons` FOREIGN KEY (`CouponId`) REFERENCES `Coupons` (`CouponId`) ON DELETE SET NULL,
  CONSTRAINT `FK_RefundBenefits_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`),
  CONSTRAINT `FK_RefundBenefits_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`),
  CONSTRAINT `FK_RefundBenefits_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RefundPayoutProofs`
--

DROP TABLE IF EXISTS `RefundPayoutProofs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RefundPayoutProofs` (
  `RefundPayoutProofId` int NOT NULL AUTO_INCREMENT,
  `ReturnRequestId` int NOT NULL,
  `RefundTransactionId` int DEFAULT NULL,
  `UploadedBy` int NOT NULL,
  `FileUrl` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `FileName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `MimeType` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Note` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RefundPayoutProofId`),
  KEY `IX_RefundPayoutProofs_ReturnRequestId` (`ReturnRequestId`),
  KEY `IX_RefundPayoutProofs_ReturnRequestId_CreatedAt` (`ReturnRequestId`,`CreatedAt`),
  KEY `FK_RefundPayoutProofs_RefundTransactions` (`RefundTransactionId`),
  KEY `FK_RefundPayoutProofs_Users` (`UploadedBy`),
  CONSTRAINT `FK_RefundPayoutProofs_RefundTransactions` FOREIGN KEY (`RefundTransactionId`) REFERENCES `RefundTransactions` (`RefundTransactionId`) ON DELETE SET NULL,
  CONSTRAINT `FK_RefundPayoutProofs_ReturnRequests` FOREIGN KEY (`ReturnRequestId`) REFERENCES `ReturnRequests` (`ReturnRequestId`),
  CONSTRAINT `FK_RefundPayoutProofs_Users` FOREIGN KEY (`UploadedBy`) REFERENCES `Users` (`UserId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Refunds`
--

DROP TABLE IF EXISTS `Refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Refunds` (
  `RefundId` int NOT NULL AUTO_INCREMENT,
  `OrderId` int NOT NULL,
  `PaymentId` int DEFAULT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `Type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Method` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'PENDING',
  `GatewayTransactionId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `GatewayError` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `CreatedBy` int DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`RefundId`),
  KEY `IX_Refunds_OrderId` (`OrderId`),
  KEY `IX_Refunds_Status` (`Status`),
  KEY `FK_Refunds_Payments` (`PaymentId`),
  CONSTRAINT `FK_Refunds_Orders` FOREIGN KEY (`OrderId`) REFERENCES `Orders` (`OrderId`) ON DELETE CASCADE,
  CONSTRAINT `FK_Refunds_Payments` FOREIGN KEY (`PaymentId`) REFERENCES `Payments` (`PaymentId`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'aisthea'
--

--
-- Dumping routines for database 'aisthea'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-06 16:08:29
