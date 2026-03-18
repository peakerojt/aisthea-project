import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Simple in-memory cache (TTL: 15 minutes)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
    data: any;
    expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const analyticsCache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
    const entry = analyticsCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        analyticsCache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: any): void {
    analyticsCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

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

const FULFILLED_ORDER_STATUSES = ['Delivered', 'COMPLETED', 'Completed'] as const;

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

        // ── Cache check ────────────────────────────────────────────────────────
        const cacheKey = `analytics_v2_${req.query.startDate ?? 'default'}_${req.query.endDate ?? 'default'}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ ...cached, _cached: true });
        }

        // ── 1. Revenue by Category ─────────────────────────────────────────────
        const revenueByCategory: Array<{
            category: string;
            revenue: number | string;
            orders: number | string;
        }> = await prisma.$queryRaw`
      SELECT
        COALESCE(c.Name, N'Chưa phân loại') AS category,
        SUM(CAST(oi.UnitPrice AS FLOAT) * oi.Quantity) AS revenue,
        COUNT(DISTINCT o.OrderId) AS orders
      FROM OrderItems oi
      INNER JOIN Orders o        ON oi.OrderId    = o.OrderId
      LEFT JOIN ProductVariants pv ON oi.VariantId = pv.VariantId
      LEFT JOIN Products p      ON pv.ProductId  = p.ProductId
      LEFT JOIN Categories c    ON p.CategoryId  = c.CategoryId
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
        AND UPPER(o.Status) IN ('DELIVERED', 'COMPLETED')
      GROUP BY COALESCE(c.Name, N'Chưa phân loại')
      ORDER BY revenue DESC
    `;

        // ── 2. Order Status Funnel ─────────────────────────────────────────────
        const statusGroups = await prisma.order.groupBy({
            by: ['status'],
            where: { createdAt: { gte: start, lte: end } },
            _count: { orderId: true },
        });

        // Normalize DB status to canonical UPPER_SNAKE_CASE key for FE i18n.
        // DB may store mixed-case (e.g. "Cancelled", "Return_Requested") — unify them.
        const normalizeStatus = (s: string | null): string => {
            if (!s) return 'UNKNOWN';
            return s
                .replace(/([a-z])([A-Z])/g, '$1_$2') // CamelCase -> CAMEL_CASE
                .replace(/ /g, '_')                    // spaces -> underscores
                .toUpperCase();                        // -> UPPER_SNAKE_CASE
        };

        const PIE_COLORS = ['#e11d48', '#3b82f6', '#a855f7', '#06b6d4', '#10b981', '#f97316'];
        const statusFunnel = statusGroups.map((g, i) => ({
            // 'status' is the i18n key the FE uses for translation lookup
            status: normalizeStatus(g.status),
            value: g._count.orderId,
            color: PIE_COLORS[i % PIE_COLORS.length],
        }));

        // ── 3. Monthly Revenue vs Orders (Composed Chart) ─────────────────────
        const monthlyTrend: Array<{
            label: string;
            revenue: number | string;
            orders: number | string;
        }> = await prisma.$queryRaw`
      SELECT
        FORMAT(o.CreatedAt, 'yyyy-MM') AS label,
        SUM(CASE WHEN UPPER(o.Status) IN ('DELIVERED', 'COMPLETED') THEN CAST(o.TotalAmount AS FLOAT) ELSE 0 END) AS revenue,
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
        AND UPPER(o.Status) IN ('DELIVERED', 'COMPLETED')
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
        MIN(COALESCE(p.ProductId, -oi.OrderItemId)) AS productId,
        COALESCE(MAX(p.Name), MAX(oi.ProductName)) AS productName,
        COUNT(oi.OrderItemId) AS cancelCount,
        SUM(CAST(oi.UnitPrice AS FLOAT) * oi.Quantity) AS lostRevenue
      FROM OrderItems oi
      INNER JOIN Orders o           ON oi.OrderId   = o.OrderId
      LEFT JOIN ProductVariants pv  ON oi.VariantId = pv.VariantId
      LEFT JOIN Products p          ON pv.ProductId = p.ProductId
      WHERE o.CreatedAt >= ${start}
        AND o.CreatedAt <= ${end}
        AND UPPER(o.Status) IN ('CANCELLED', 'CANCELED')
      GROUP BY COALESCE(CAST(p.ProductId AS NVARCHAR(50)), CONCAT(N'SNAPSHOT:', oi.ProductName))
      ORDER BY cancelCount DESC, productName ASC
    `;

        // ── 6. MoM Revenue Growth ─────────────────────────────────────────────
        const periodMs = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - periodMs);
        const prevEnd = new Date(start.getTime() - 1);

        const [currRev, prevRev] = await Promise.all([
            prisma.order.aggregate({
                where: { status: { in: [...FULFILLED_ORDER_STATUSES] }, createdAt: { gte: start, lte: end } },
                _sum: { totalAmount: true },
            }),
            prisma.order.aggregate({
                where: { status: { in: [...FULFILLED_ORDER_STATUSES] }, createdAt: { gte: prevStart, lte: prevEnd } },
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
        const completedOrders = statusFunnel
            .filter(g => g.status === 'DELIVERED' || g.status === 'COMPLETED')
            .reduce((sum, group) => sum + group.value, 0);
        const avgOrderValue = completedOrders > 0 ? currentRevenue / completedOrders : 0;

        // ── 7. Customer Retention: New vs Returning ───────────────────────────
        // A "Returning Customer" has at least 1 COMPLETED order BEFORE startDate.
        // A "New Customer" has no COMPLETED orders before startDate.
        const retentionRaw: Array<{
            newCustomers: number | bigint;
            returningCustomers: number | bigint;
        }> = await prisma.$queryRaw`
      SELECT
        SUM(CASE WHEN prior.UserId IS NULL THEN 1 ELSE 0 END) AS newCustomers,
        SUM(CASE WHEN prior.UserId IS NOT NULL THEN 1 ELSE 0 END) AS returningCustomers
      FROM (
        SELECT DISTINCT o.UserId
        FROM Orders o
        WHERE o.CreatedAt >= ${start}
          AND o.CreatedAt <= ${end}
          AND UPPER(o.Status) IN ('DELIVERED', 'COMPLETED')
          AND o.UserId IS NOT NULL
      ) AS current_customers
      LEFT JOIN (
        SELECT DISTINCT UserId
        FROM Orders
        WHERE UPPER(Status) IN ('DELIVERED', 'COMPLETED')
          AND CreatedAt < ${start}
          AND UserId IS NOT NULL
      ) AS prior
        ON current_customers.UserId = prior.UserId
    `;

        const retentionRow = retentionRaw[0] ?? { newCustomers: 0, returningCustomers: 0 };
        const customerRetention = {
            newCustomers: Number(retentionRow.newCustomers ?? 0),
            returningCustomers: Number(retentionRow.returningCustomers ?? 0),
        };

        // ── Response ──────────────────────────────────────────────────────────
        const payload = {
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
            customerRetention,
        };

        // Store in cache before responding
        setCache(cacheKey, payload);

        res.json(payload);
    } catch (error: unknown) {
        logger.error('[analyticsController] getAnalyticsSummary failed', { error });
        const e = error as { message?: string };
        res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
    }
};
