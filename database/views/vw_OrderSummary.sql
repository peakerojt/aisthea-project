/* =============================================================
   DATABASE VIEW: vw_OrderSummary
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Analytics view for admin dashboard.
                Aggregates orders by date with revenue and counts.
   USAGE: SELECT * FROM vw_OrderSummary WHERE orderDate >= '2026-01-01';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('vw_OrderSummary', 'V') IS NOT NULL
    DROP VIEW vw_OrderSummary;
GO

CREATE VIEW vw_OrderSummary
AS
SELECT 
    CAST(o.CreatedAt AS DATE) AS orderDate,
    COUNT(DISTINCT o.OrderId) AS totalOrders,
    SUM(o.TotalAmount) AS totalRevenue,
    SUM(CASE WHEN o.Status = 'Pending' THEN 1 ELSE 0 END) AS pendingOrders,
    SUM(CASE WHEN o.Status = 'Processing' THEN 1 ELSE 0 END) AS processingOrders,
    SUM(CASE WHEN o.Status = 'Completed' THEN 1 ELSE 0 END) AS completedOrders,
    SUM(CASE WHEN o.Status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
    COUNT(DISTINCT o.UserId) AS uniqueCustomers
FROM Orders o
GROUP BY CAST(o.CreatedAt AS DATE);

GO

PRINT 'Created view vw_OrderSummary';
GO
