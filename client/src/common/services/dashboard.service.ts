// Removed api import for dashboard.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DashboardRange = 'today' | 'week' | 'month' | 'year';

export interface DashboardKPIs {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    lowStockCount: number;
}

export interface RevenueDataPoint {
    label: string;
    revenue: number;
}

export interface TopProduct {
    productId: number;
    name: string;
    totalSold: number;
    imageUrl: string | null;
}

export interface RecentOrder {
    orderId: number;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    status: string | null;
    createdAt: string | null;
    userFullName: string | null;
}

export interface DashboardSummary {
    success: boolean;
    range: DashboardRange;
    period: { start: string; end: string };
    kpis: DashboardKPIs;
    revenueChart: RevenueDataPoint[];
    topProducts: TopProduct[];
    recentOrders: RecentOrder[];
}

import { dashboardApi } from '@/common/api/dashboard.api';

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const fetchDashboardSummary = async (
    range: DashboardRange = 'month'
): Promise<DashboardSummary> => {
    return dashboardApi.fetchSummary(range);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a number as Vietnamese Đồng */
export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
};

/** Short VND — e.g. 25.000.000 ₫ */
export const formatVNDShort = (amount: number): string => {
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)} tỷ ₫`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)} triệu ₫`;
    }
    return formatVND(amount);
};
