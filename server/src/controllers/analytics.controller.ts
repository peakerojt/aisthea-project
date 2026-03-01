import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseDate(value: unknown, fallback: Date): Date {
    if (typeof value === 'string' && value) {
        const d = new Date(value);
        return isNaN(d.getTime()) ? fallback : d;
    }
    return fallback;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/summary?startDate=&endDate=
// ─────────────────────────────────────────────────────────────────────────────

export const getAnalyticsSummary = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        // Default: current calendar month
        const defaultStart = startOfMonth(now);
        const defaultEnd = endOfDay(now);

        const start = parseDate(req.query.startDate, defaultStart);
        const end = endOfDay(parseDate(req.query.endDate, defaultEnd));

        // ── 1. Revenue by Category ─────────────────────────────────────────────
        const revenueByCategory: Array<{
            category: string;
            revenue: number | string;
            orders: number | string;
        }> = await prisma.$queryRaw`
      SELECT
        c.Name AS category,
        SUM(CAST(oi.UnitPrice AS FLOAT) * oi.Quantity) AS revenue,
        COUNT(DISTINCT o.OrderId) AS orders
      FROM OrderItems oi
      INNER JOIN Orders o        ON oi.OrderId    = o.OrderId
      INNER JOIN ProductVariants pv ON oi.VariantId = pv.VariantId
      INNER JOIN Products p      ON pv.ProductId  = p.ProductId
      INNER JOIN Categories c    ON p.CategoryId  = c.CategoryId
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
        AND o.Status = 'COMPLETED'
      GROUP BY c.Name
      ORDER BY revenue DESC
    `;

        // ── 2. Order Status Funnel ─────────────────────────────────────────────
        const statusGroups = await prisma.order.groupBy({
            by: ['status'],
            where: { createdAt: { gte: start, lte: end } },
            _count: { orderId: true },
        });

        const STATUS_VI_MAP: Record<string, string> = {
            PENDING: 'Chờ xử lý',
            CONFIRMED: 'Đã xác nhận',
            PROCESSING: 'Đang xử lý',
            SHIPPED: 'Đang giao',
            COMPLETED: 'Hoàn thành',
            CANCELLED: 'Đã hủy',
            Pending: 'Chờ xử lý',
        };

        const PIE_COLORS = ['#e11d48', '#3b82f6', '#a855f7', '#06b6d4', '#10b981', '#f97316'];
        const statusFunnel = statusGroups.map((g, i) => ({
            name: STATUS_VI_MAP[g.status ?? ''] ?? g.status ?? 'Khác',
            value: g._count.orderId,
            color: PIE_COLORS[i % PIE_COLORS.length],
            status: g.status,
        }));

        // ── 3. Monthly Revenue vs Orders (Composed Chart) ─────────────────────
        const monthlyTrend: Array<{
            label: string;
            revenue: number | string;
            orders: number | string;
        }> = await prisma.$queryRaw`
      SELECT
        FORMAT(o.CreatedAt, 'yyyy-MM') AS label,
        SUM(CAST(o.TotalAmount AS FLOAT)) AS revenue,
        COUNT(o.OrderId) AS orders
      FROM Orders o
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
      GROUP BY FORMAT(o.CreatedAt, 'yyyy-MM')
      ORDER BY label ASC
    `;

        // ── 4. Top 5 Customers by Spend ───────────────────────────────────────
        const topCustomers: Array<{
            userId: number;
            fullName: string;
            email: string;
            totalSpent: number | string;
            orderCount: number | string;
        }> = await prisma.$queryRaw`
      SELECT TOP 5
        u.UserId      AS userId,
        u.FullName    AS fullName,
        u.Email       AS email,
        SUM(CAST(o.TotalAmount AS FLOAT)) AS totalSpent,
        COUNT(o.OrderId) AS orderCount
      FROM Orders o
      INNER JOIN Users u ON o.UserId = u.UserId
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
        AND o.Status = 'COMPLETED'
        AND o.UserId IS NOT NULL
      GROUP BY u.UserId, u.FullName, u.Email
      ORDER BY totalSpent DESC
    `;

        // ── 5. Most Cancelled Products ────────────────────────────────────────
        const mostCancelled: Array<{
            productId: number;
            productName: string;
            cancelCount: number | string;
            lostRevenue: number | string;
        }> = await prisma.$queryRaw`
      SELECT TOP 5
        p.ProductId   AS productId,
        p.Name        AS productName,
        COUNT(oi.OrderItemId) AS cancelCount,
        SUM(CAST(oi.UnitPrice AS FLOAT) * oi.Quantity) AS lostRevenue
      FROM OrderItems oi
      INNER JOIN Orders o           ON oi.OrderId   = o.OrderId
      INNER JOIN ProductVariants pv ON oi.VariantId = pv.VariantId
      INNER JOIN Products p         ON pv.ProductId = p.ProductId
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
        AND o.Status = 'CANCELLED'
      GROUP BY p.ProductId, p.Name
      ORDER BY cancelCount DESC
    `;

        // ── 6. MoM Revenue Growth ─────────────────────────────────────────────
        const periodMs = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - periodMs);
        const prevEnd = new Date(start.getTime() - 1);

        const [currRev, prevRev] = await Promise.all([
            prisma.order.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
                _sum: { totalAmount: true },
            }),
            prisma.order.aggregate({
                where: { status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
                _sum: { totalAmount: true },
            }),
        ]);

        const currentRevenue = Number(currRev._sum.totalAmount ?? 0);
        const previousRevenue = Number(prevRev._sum.totalAmount ?? 0);
        const momGrowth = previousRevenue > 0
            ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
            : currentRevenue > 0 ? 100 : 0;

        // Total orders & avg order value
        const totalOrders = statusFunnel.reduce((s, g) => s + g.value, 0);
        const completedOrders = statusFunnel.find(g => g.status === 'COMPLETED')?.value ?? 0;
        const avgOrderValue = completedOrders > 0 ? currentRevenue / completedOrders : 0;

        // ── Response ──────────────────────────────────────────────────────────
        res.json({
            success: true,
            period: { start: start.toISOString(), end: end.toISOString() },
            summary: {
                currentRevenue,
                previousRevenue,
                momGrowth: parseFloat(momGrowth.toFixed(2)),
                totalOrders,
                completedOrders,
                avgOrderValue: parseFloat(avgOrderValue.toFixed(0)),
            },
            revenueByCategory: revenueByCategory.map(r => ({
                category: r.category,
                revenue: Number(r.revenue ?? 0),
                orders: Number(r.orders ?? 0),
            })),
            statusFunnel,
            monthlyTrend: monthlyTrend.map(r => ({
                label: r.label,
                revenue: Number(r.revenue ?? 0),
                orders: Number(r.orders ?? 0),
            })),
            topCustomers: topCustomers.map(r => ({
                userId: r.userId,
                fullName: r.fullName,
                email: r.email,
                totalSpent: Number(r.totalSpent ?? 0),
                orderCount: Number(r.orderCount ?? 0),
            })),
            mostCancelled: mostCancelled.map(r => ({
                productId: r.productId,
                productName: r.productName,
                cancelCount: Number(r.cancelCount ?? 0),
                lostRevenue: Number(r.lostRevenue ?? 0),
            })),
        });
    } catch (error: any) {
        console.error('[getAnalyticsSummary] Error:', error?.message ?? error);
        res.status(500).json({ success: false, error: 'Internal server error', details: error?.message });
    }
};
