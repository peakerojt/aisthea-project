import React from 'react';
import { DollarSign, ShoppingCart, Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardKPIs, formatVNDShort } from '@/common/services/dashboard.service';
import { AdminEmptyState, AdminStatCards, type AdminStatCardItem } from '@/admin/components/AdminUI';

interface DashboardCardsProps {
    kpis: DashboardKPIs | null;
    isLoading: boolean;
}

interface KPICardConfig {
    key: keyof DashboardKPIs;
    label: string;
    icon: React.FC<{ className?: string }>;
    format: (v: number) => string;
    changeText: string;
    changeType: 'positive' | 'negative' | 'neutral';
    tone: AdminStatCardItem['tone'];
}

const CARDS: KPICardConfig[] = [
    {
        key: 'totalRevenue',
        label: 'Tổng doanh thu',
        icon: DollarSign,
        format: formatVNDShort,
        changeText: '+12% so với tháng trước',
        changeType: 'positive',
        tone: 'success',
    },
    {
        key: 'totalOrders',
        label: 'Đơn hàng mới',
        icon: ShoppingCart,
        format: (v) => v.toLocaleString('vi-VN'),
        changeText: '+8% so với tháng trước',
        changeType: 'positive',
        tone: 'primary',
    },
    {
        key: 'totalCustomers',
        label: 'Khách hàng',
        icon: Users,
        format: (v) => v.toLocaleString('vi-VN'),
        changeText: '+58 trong tuần này',
        changeType: 'positive',
        tone: 'info',
    },
    {
        key: 'lowStockCount',
        label: 'Cảnh báo tồn kho',
        icon: AlertTriangle,
        format: (v) => `${v} mặt hàng`,
        changeText: 'Cần bổ sung hàng',
        changeType: 'negative',
        tone: 'warning',
    },
];

// Skeleton card
const SkeletonCard: React.FC = () => (
    <div className="min-h-[148px] animate-pulse rounded-2xl border border-white/[0.06] bg-[#14161b] px-5 py-4">
        <div className="mb-4 flex items-start justify-between">
            <div className="h-3 w-28 rounded bg-white/10" />
            <div className="h-11 w-11 rounded-2xl bg-white/10" />
        </div>
        <div className="mb-3 h-10 w-36 rounded bg-white/10" />
        <div className="h-3 w-40 rounded bg-white/10" />
    </div>
);

export const DashboardCards: React.FC<DashboardCardsProps> = ({ kpis, isLoading }) => {
    if (isLoading || !kpis) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {CARDS.map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    const items: AdminStatCardItem[] = CARDS.map((config) => {
        const isPositive = config.changeType === 'positive';
        const delta = config.changeType === 'neutral'
            ? <span className="text-white/45">{config.changeText}</span>
            : (
                <span className={`inline-flex items-center gap-1.5 ${isPositive ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{config.changeText}</span>
                </span>
            );

        return {
            key: config.key,
            label: config.label,
            value: config.format(kpis[config.key]),
            hint: delta,
            icon: config.icon,
            tone: config.tone,
            variant: 'highlight',
        };
    });

    return <AdminStatCards items={items} />;
};
