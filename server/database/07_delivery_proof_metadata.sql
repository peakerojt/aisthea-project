IF COL_LENGTH('Shipments', 'DeliveryProofImages') IS NULL
BEGIN
    ALTER TABLE Shipments ADD DeliveryProofImages NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Shipments_DeliveryProofImages DEFAULT '[]';
END;

IF COL_LENGTH('Shipments', 'DeliveryProofReviewed') IS NULL
BEGIN
    ALTER TABLE Shipments ADD DeliveryProofReviewed BIT NOT NULL CONSTRAINT DF_Shipments_DeliveryProofReviewed DEFAULT 0;
END;
