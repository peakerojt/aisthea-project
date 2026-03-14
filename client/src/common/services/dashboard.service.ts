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

export const STATUS_VI: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ xử lý', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    PROCESSING: { label: 'Đang xử lý', color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
    SHIPPING: { label: 'Đang giao', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    SHIPPED: { label: 'Đang giao', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    COMPLETED: { label: 'Hoàn thành', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    DELIVERED: { label: 'Đã giao', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    CANCELLED: { label: 'Đã hủy', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
    RETURN_REQUESTED: { label: 'Yêu cầu trả hàng', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    RETURNED: { label: 'Đã trả hàng', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
    Pending: { label: 'Chờ xử lý', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
};
