IF COL_LENGTH('Orders', 'ShippingFee') IS NULL
BEGIN
    ALTER TABLE Orders ADD ShippingFee DECIMAL(18,2) NOT NULL CONSTRAINT DF_Orders_ShippingFee DEFAULT 0;
END;

IF COL_LENGTH('Orders', 'ShippingMethod') IS NULL
BEGIN
    ALTER TABLE Orders ADD ShippingMethod NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_ShippingMethod DEFAULT 'STANDARD';
END;

IF COL_LENGTH('Orders', 'ShippingCityCode') IS NULL
BEGIN
    ALTER TABLE Orders ADD ShippingCityCode NVARCHAR(10) NULL;
END;
