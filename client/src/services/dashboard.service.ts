import { api } from '../utils/api';

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

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const fetchDashboardSummary = async (
    range: DashboardRange = 'month'
): Promise<DashboardSummary> => {
    return api.get<DashboardSummary>(`/api/dashboard/summary?range=${range}`);
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
    PROCESSING: { label: 'Đang xử lý', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    SHIPPED: { label: 'Đang giao', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    COMPLETED: { label: 'Hoàn thành', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    CANCELLED: { label: 'Đã hủy', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
    Pending: { label: 'Chờ xử lý', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
};
