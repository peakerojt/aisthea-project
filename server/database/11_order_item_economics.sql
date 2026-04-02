/* =============================================================
   Patch OrderItems economics snapshot fields for refund accuracy
   ============================================================= */

IF OBJECT_ID('OrderItems', 'U') IS NOT NULL
   AND COL_LENGTH('OrderItems', 'GrossItemAmount') IS NULL
BEGIN
    ALTER TABLE OrderItems
        ADD GrossItemAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OrderItems_GrossItemAmount DEFAULT 0;

    PRINT 'OK: OrderItems.GrossItemAmount column added';
END
ELSE
BEGIN
    PRINT 'SKIP: OrderItems.GrossItemAmount already exists or OrderItems table missing';
END
GO

IF OBJECT_ID('OrderItems', 'U') IS NOT NULL
   AND COL_LENGTH('OrderItems', 'AllocatedDiscountAmount') IS NULL
BEGIN
    ALTER TABLE OrderItems
        ADD AllocatedDiscountAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OrderItems_AllocatedDiscountAmount DEFAULT 0;

    PRINT 'OK: OrderItems.AllocatedDiscountAmount column added';
END
ELSE
BEGIN
    PRINT 'SKIP: OrderItems.AllocatedDiscountAmount already exists or OrderItems table missing';
END
GO

IF OBJECT_ID('OrderItems', 'U') IS NOT NULL
   AND COL_LENGTH('OrderItems', 'NetItemPaidAmount') IS NULL
BEGIN
    ALTER TABLE OrderItems
        ADD NetItemPaidAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OrderItems_NetItemPaidAmount DEFAULT 0;

    PRINT 'OK: OrderItems.NetItemPaidAmount column added';
END
ELSE
BEGIN
    PRINT 'SKIP: OrderItems.NetItemPaidAmount already exists or OrderItems table missing';
END
GO

IF OBJECT_ID('OrderItems', 'U') IS NOT NULL
BEGIN
    ;WITH ItemBase AS (
        SELECT
            oi.OrderItemId,
            oi.OrderId,
            CAST(oi.UnitPrice * oi.Quantity AS DECIMAL(18,2)) AS GrossAmount,
            ROW_NUMBER() OVER (PARTITION BY oi.OrderId ORDER BY oi.OrderItemId DESC) AS ReverseRowNum,
            SUM(CAST(oi.UnitPrice * oi.Quantity AS DECIMAL(18,2))) OVER (PARTITION BY oi.OrderId) AS OrderItemsSubtotal,
            CAST(ISNULL(o.DiscountAmount, 0) AS DECIMAL(18,2)) AS OrderDiscountAmount
        FROM OrderItems oi
        INNER JOIN Orders o ON o.OrderId = oi.OrderId
    ),
    DiscountAlloc AS (
        SELECT
            ItemBase.OrderItemId,
            ItemBase.GrossAmount,
            CASE
                WHEN ItemBase.OrderItemsSubtotal <= 0 OR ItemBase.OrderDiscountAmount <= 0 THEN CAST(0 AS DECIMAL(18,2))
                WHEN ItemBase.ReverseRowNum = 1 THEN
                    ItemBase.OrderDiscountAmount -
                    ISNULL((
                        SELECT SUM(
                            ROUND(
                                CASE
                                    WHEN sibling.OrderItemsSubtotal <= 0 OR sibling.OrderDiscountAmount <= 0 THEN 0
                                    ELSE (sibling.OrderDiscountAmount * sibling.GrossAmount) / sibling.OrderItemsSubtotal
                                END,
                                2
                            )
                        )
                        FROM ItemBase sibling
                        WHERE sibling.OrderId = ItemBase.OrderId
                          AND sibling.OrderItemId <> ItemBase.OrderItemId
                    ), 0)
                ELSE
                    ROUND((ItemBase.OrderDiscountAmount * ItemBase.GrossAmount) / ItemBase.OrderItemsSubtotal, 2)
            END AS AllocatedDiscountAmount
        FROM ItemBase
    )
    UPDATE oi
    SET
        GrossItemAmount = DiscountAlloc.GrossAmount,
        AllocatedDiscountAmount = CASE
            WHEN DiscountAlloc.AllocatedDiscountAmount < 0 THEN 0
            ELSE DiscountAlloc.AllocatedDiscountAmount
        END,
        NetItemPaidAmount = CASE
            WHEN DiscountAlloc.GrossAmount - DiscountAlloc.AllocatedDiscountAmount < 0 THEN 0
            ELSE DiscountAlloc.GrossAmount - DiscountAlloc.AllocatedDiscountAmount
        END
    FROM OrderItems oi
    INNER JOIN DiscountAlloc ON DiscountAlloc.OrderItemId = oi.OrderItemId
    WHERE
        ISNULL(oi.GrossItemAmount, 0) = 0
        OR ISNULL(oi.NetItemPaidAmount, 0) = 0
        OR ISNULL(oi.GrossItemAmount, 0) <> DiscountAlloc.GrossAmount
        OR ISNULL(oi.AllocatedDiscountAmount, 0) <> CASE
            WHEN DiscountAlloc.AllocatedDiscountAmount < 0 THEN 0
            ELSE DiscountAlloc.AllocatedDiscountAmount
        END
        OR ISNULL(oi.NetItemPaidAmount, 0) <> CASE
            WHEN DiscountAlloc.GrossAmount - DiscountAlloc.AllocatedDiscountAmount < 0 THEN 0
            ELSE DiscountAlloc.GrossAmount - DiscountAlloc.AllocatedDiscountAmount
        END;

    PRINT 'OK: OrderItems economics snapshot backfilled';
END
ELSE
BEGIN
    PRINT 'SKIP: OrderItems table missing';
END
GO
