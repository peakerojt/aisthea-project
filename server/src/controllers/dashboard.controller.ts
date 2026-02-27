import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'year';

function getDateRange(range: DateRange): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (range) {
        case 'today':
            break;
        case 'week': {
            const day = start.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            start.setDate(start.getDate() + diff);
            break;
        }
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
    }

    return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const rawRange = (req.query.range as string) || 'month';
        const range: DateRange = ['today', 'week', 'month', 'year'].includes(rawRange)
            ? (rawRange as DateRange)
            : 'month';

        const { start, end } = getDateRange(range);

        // ── KPI 1: Total Revenue (COMPLETED orders in range) ──────────────────
        const revenueResult = await prisma.order.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: start, lte: end },
            },
            _sum: { totalAmount: true },
        });

        const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);

        // ── KPI 2: Total Orders in range ─────────────────────────────────────
        const totalOrders = await prisma.order.count({
            where: { createdAt: { gte: start, lte: end } },
        });

        // ── KPI 3: Total Customers (role = Customer) ─────────────────────────
        const totalCustomers = await prisma.userRole.count({
            where: { role: { roleName: 'Customer' } },
        });

        // ── KPI 4: Low Stock Alerts (stockQuantity <= 10, not deleted) ────────
        const lowStockCount = await prisma.productVariant.count({
            where: {
                stockQuantity: { lte: 10 },
                isDeleted: false,
            },
        });

        // ── Revenue Chart Data ────────────────────────────────────────────────
        // For 'year': group by month. For others: group by day.
        // SQL Server: format date with CONVERT
        const isYearRange = range === 'year';

        const chartData: { label: string; revenue: number }[] = await (async () => {
            if (isYearRange) {
                // Group by YYYY-MM
                const rows: Array<{ label: string; revenue: string | number }> = await prisma.$queryRaw`
          SELECT
            FORMAT(CreatedAt, 'yyyy-MM') AS label,
            SUM(CAST(TotalAmount AS FLOAT)) AS revenue
          FROM Orders
          WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
            AND Status = 'COMPLETED'
          GROUP BY FORMAT(CreatedAt, 'yyyy-MM')
          ORDER BY label ASC
        `;
                return rows.map((r) => ({ label: r.label, revenue: Number(r.revenue ?? 0) }));
            } else {
                // Group by YYYY-MM-DD
                const rows: Array<{ label: string; revenue: string | number }> = await prisma.$queryRaw`
          SELECT
            FORMAT(CreatedAt, 'yyyy-MM-dd') AS label,
            SUM(CAST(TotalAmount AS FLOAT)) AS revenue
          FROM Orders
          WHERE CreatedAt >= ${start} AND CreatedAt <= ${end}
            AND Status = 'COMPLETED'
          GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
          ORDER BY label ASC
        `;
                return rows.map((r) => ({ label: r.label, revenue: Number(r.revenue ?? 0) }));
            }
        })();

        // ── Top 5 Selling Products ────────────────────────────────────────────
        const topProducts: Array<{
            productId: number;
            name: string;
            totalSold: number;
            imageUrl: string | null;
        }> = await (async () => {
            const rows: Array<{
                ProductId: number;
                ProductName: string;
                TotalSold: string | number;
                ImageUrl: string | null;
            }> = await prisma.$queryRaw`
        SELECT TOP 5
          p.ProductId,
          p.Name AS ProductName,
          SUM(oi.Quantity) AS TotalSold,
          (
            SELECT TOP 1 pi2.ImageUrl
            FROM ProductImages pi2
            WHERE pi2.ProductId = p.ProductId AND pi2.IsPrimary = 1
          ) AS ImageUrl
        FROM OrderItems oi
        INNER JOIN Orders o ON oi.OrderId = o.OrderId
        INNER JOIN ProductVariants pv ON oi.VariantId = pv.VariantId
        INNER JOIN Products p ON pv.ProductId = p.ProductId
        WHERE o.CreatedAt >= ${start} AND o.CreatedAt <= ${end}
        GROUP BY p.ProductId, p.Name
        ORDER BY TotalSold DESC
      `;
            return rows.map((r) => ({
                productId: r.ProductId,
                name: r.ProductName,
                totalSold: Number(r.TotalSold ?? 0),
                imageUrl: r.ImageUrl ?? null,
            }));
        })();

        // ── Recent 5 Orders ───────────────────────────────────────────────────
        const recentOrders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                orderId: true,
                orderNumber: true,
                customerName: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                user: {
                    select: { fullName: true, email: true },
                },
            },
        });

        const recentOrdersFormatted = recentOrders.map((o) => ({
            orderId: o.orderId,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            totalAmount: Number(o.totalAmount ?? 0),
            status: o.status,
            createdAt: o.createdAt?.toISOString() ?? null,
            userFullName: o.user?.fullName ?? null,
        }));

        // ── Response ──────────────────────────────────────────────────────────
        res.json({
            success: true,
            range,
            period: { start: start.toISOString(), end: end.toISOString() },
            kpis: {
                totalRevenue,
                totalOrders,
                totalCustomers,
                lowStockCount,
            },
            revenueChart: chartData,
            topProducts,
            recentOrders: recentOrdersFormatted,
        });
    } catch (error: any) {
        console.error('[getDashboardSummary] Error:', error?.message ?? error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error?.message });
    }
};
