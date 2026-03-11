// Removed api import for analytics.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsSummaryKPIs {
    currentRevenue: number;
    previousRevenue: number;
    momGrowth: number;
    totalOrders: number;
    completedOrders: number;
    avgOrderValue: number;
}

export interface RevenueByCategoryItem {
    category: string;
    revenue: number;
    orders: number;
}

export interface StatusFunnelItem {
    /** Canonical UPPER_SNAKE_CASE key — used as i18n lookup on the FE */
    status: string;
    value: number;
    color: string;
}

export interface MonthlyTrendItem {
    label: string;
    revenue: number;
    orders: number;
}

export interface TopCustomer {
    userId: number;
    fullName: string;
    email: string;
    totalSpent: number;
    orderCount: number;
}

export interface CancelledProduct {
    productId: number;
    productName: string;
    cancelCount: number;
    lostRevenue: number;
}

export interface CustomerRetention {
    newCustomers: number;
    returningCustomers: number;
}

export interface AnalyticsSummary {
    success: boolean;
    period: { start: string; end: string };
    summary: AnalyticsSummaryKPIs;
    revenueByCategory: RevenueByCategoryItem[];
    statusFunnel: StatusFunnelItem[];
    monthlyTrend: MonthlyTrendItem[];
    topCustomers: TopCustomer[];
    mostCancelled: CancelledProduct[];
    customerRetention: CustomerRetention;
    _cached?: boolean;
}

import { analyticsApi } from '@/common/api/analytics.api';

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export const fetchAnalyticsSummary = async (
    startDate?: string,
    endDate?: string
): Promise<AnalyticsSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return analyticsApi.fetchSummary(qs);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const formatVND = (amount: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);

export const formatVNDShort = (amount: number): string => {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ ₫`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr ₫`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k ₫`;
    return formatVND(amount);
};

/** Get today's date as YYYY-MM-DD string */
export const todayStr = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Get first day of current month as YYYY-MM-DD */
export const firstOfMonthStr = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Format YYYY-MM label to "Th. M/YYYY" */
export const formatMonthLabel = (label: string): string => {
    const [year, month] = label.split('-');
    return `Th. ${parseInt(month, 10)}/${year}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────────────────────

export function exportToCSV(data: AnalyticsSummary, startDate: string, endDate: string): void {
    const rows: string[] = [];

    // Summary
    rows.push('BÁO CÁO PHÂN TÍCH KINH DOANH - AISTHEA');
    rows.push(`Kỳ báo cáo: ${startDate} đến ${endDate}`);
    rows.push('');

    rows.push('--- TỔNG QUAN ---');
    rows.push(`Doanh thu hiện tại,${data.summary.currentRevenue}`);
    rows.push(`Doanh thu kỳ trước,${data.summary.previousRevenue}`);
    rows.push(`Tăng trưởng MoM,${data.summary.momGrowth}%`);
    rows.push(`Tổng đơn hàng,${data.summary.totalOrders}`);
    rows.push(`Giá trị đơn trung bình,${data.summary.avgOrderValue}`);
    rows.push('');

    rows.push('--- DOANH THU THEO DANH MỤC ---');
    rows.push('Danh mục,Doanh thu,Số đơn');
    data.revenueByCategory.forEach(r => rows.push(`${r.category},${r.revenue},${r.orders}`));
    rows.push('');

    rows.push('--- PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG ---');
    rows.push('Trạng thái,Số lượng');
    data.statusFunnel.forEach(r => rows.push(`${r.status},${r.value}`));
    rows.push('');

    rows.push('--- KHÁCH HÀNG CHI TIÊU NHIỀU NHẤT ---');
    rows.push('Họ tên,Email,Tổng chi tiêu,Số đơn');
    data.topCustomers.forEach(r => rows.push(`${r.fullName},${r.email},${r.totalSpent},${r.orderCount}`));
    rows.push('');

    rows.push('--- SẢN PHẨM BỊ HỦY NHIỀU NHẤT ---');
    rows.push('Sản phẩm,Số lần hủy,Doanh thu mất');
    data.mostCancelled.forEach(r => rows.push(`${r.productName},${r.cancelCount},${r.lostRevenue}`));

    const bom = '\uFEFF'; // BOM for Excel UTF-8 compatibility
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
