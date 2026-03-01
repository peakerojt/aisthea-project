import React from 'react';
import { DollarSign, ShoppingCart, Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardKPIs, formatVNDShort } from '../../services/dashboard.service';

interface DashboardCardsProps {
    kpis: DashboardKPIs | null;
    isLoading: boolean;
}

interface KPICardConfig {
    key: keyof DashboardKPIs;
    label: string;
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    shadowColor: string;
    format: (v: number) => string;
    changeText: string;
    changeType: 'positive' | 'negative' | 'neutral';
}

const CARDS: KPICardConfig[] = [
    {
        key: 'totalRevenue',
        label: 'Tổng doanh thu',
        icon: DollarSign,
        accentColor: 'text-emerald-400',
        shadowColor: 'shadow-emerald-500/10',
        format: formatVNDShort,
        changeText: '+12% so với tháng trước',
        changeType: 'positive',
    },
    {
        key: 'totalOrders',
        label: 'Đơn hàng mới',
        icon: ShoppingCart,
        accentColor: 'text-primary',
        shadowColor: 'shadow-red-500/10',
        format: (v) => v.toLocaleString('vi-VN'),
        changeText: '+8% so với tháng trước',
        changeType: 'positive',
    },
    {
        key: 'totalCustomers',
        label: 'Khách hàng',
        icon: Users,
        accentColor: 'text-blue-400',
        shadowColor: 'shadow-blue-500/10',
        format: (v) => v.toLocaleString('vi-VN'),
        changeText: '+58 trong tuần này',
        changeType: 'positive',
    },
    {
        key: 'lowStockCount',
        label: 'Cảnh báo tồn kho',
        icon: AlertTriangle,
        accentColor: 'text-amber-400',
        shadowColor: 'shadow-amber-500/10',
        format: (v) => `${v} mặt hàng`,
        changeText: 'Cần bổ sung hàng',
        changeType: 'negative',
    },
];

// Skeleton card
const SkeletonCard: React.FC = () => (
    <div className="bg-surface-dark border border-white/5 p-6 rounded-lg animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="h-3 bg-white/10 rounded w-28" />
            <div className="w-10 h-10 bg-white/10 rounded-lg" />
        </div>
        <div className="h-8 bg-white/10 rounded w-36 mb-3" />
        <div className="h-3 bg-white/10 rounded w-40" />
    </div>
);

// Single KPI card
const KPICard: React.FC<{ config: KPICardConfig; value: number }> = ({ config, value }) => {
    const Icon = config.icon;
    const isPositive = config.changeType === 'positive';

    return (
        <div
            className={`
        relative bg-surface-dark border border-white/5 p-6 rounded-lg
        hover:border-white/10 transition-all duration-200 cursor-default group
        overflow-hidden ${config.shadowColor} shadow-lg
      `}
        >
            {/* Decorative bg glow */}
            <div
                className={`
          absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-5
          group-hover:opacity-10 transition-opacity duration-300
          ${config.accentColor.replace('text-', 'bg-')}
        `}
            />

            <div className="relative z-10">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-bold text-white/40 tracking-[0.15em] uppercase">
                        {config.label}
                    </p>
                    <div
                        className={`
              w-10 h-10 rounded-lg flex items-center justify-center border
              ${config.accentColor.replace('text-', 'bg-')}/10
              ${config.accentColor.replace('text-', 'border-')}/20
            `}
                    >
                        <Icon className={`w-5 h-5 ${config.accentColor}`} />
                    </div>
                </div>

                {/* Value */}
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                    {config.format(value)}
                </h3>

                {/* Change indicator */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold`}>
                    {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span className={isPositive ? 'text-emerald-400' : 'text-amber-400'}>
                        {config.changeText}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const DashboardCards: React.FC<DashboardCardsProps> = ({ kpis, isLoading }) => {
    if (isLoading || !kpis) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {CARDS.map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {CARDS.map((config) => (
                <KPICard key={config.key} config={config} value={kpis[config.key]} />
            ))}
        </div>
    );
};
