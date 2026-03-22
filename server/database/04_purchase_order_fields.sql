/* Patch: PurchaseOrders receiving fields
   Safe to re-run on older databases. Adds columns only if missing. */
IF COL_LENGTH('PurchaseOrders', 'ExpectedReceivedAt') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD ExpectedReceivedAt DATETIME2 NULL;
END;

IF COL_LENGTH('PurchaseOrders', 'InvoiceNumber') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD InvoiceNumber NVARCHAR(100) NULL;
END;

IF COL_LENGTH('PurchaseOrders', 'SupplierContactName') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD SupplierContactName NVARCHAR(100) NULL;
END;

IF COL_LENGTH('PurchaseOrders', 'SupplierPhone') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD SupplierPhone NVARCHAR(20) NULL;
END;

IF COL_LENGTH('PurchaseOrders', 'SupplierEmail') IS NULL
BEGIN
    ALTER TABLE PurchaseOrders ADD SupplierEmail NVARCHAR(100) NULL;
END;