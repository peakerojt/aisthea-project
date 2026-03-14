import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { RevenueDataPoint, DashboardRange } from '@/common/services/dashboard.service';

interface RevenueChartProps {
    data: RevenueDataPoint[];
    isLoading: boolean;
    range: DashboardRange;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<{
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
}> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const value = payload[0].value;
    const vnd = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);

    return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
            <p className="text-xs text-white/40 font-medium mb-1">{label}</p>
            <p className="text-sm font-bold text-primary">{vnd}</p>
        </div>
    );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ChartSkeleton: React.FC = () => (
    <div className="w-full h-72 bg-white/5 rounded-lg animate-pulse flex items-end gap-1 px-4 pb-4">
        {Array.from({ length: 14 }).map((_, i) => (
            <div
                key={i}
                className="flex-1 rounded-sm bg-white/10"
                style={{ height: `${20 + Math.random() * 60}%` }}
            />
        ))}
    </div>
);

// ─── Range label helper ───────────────────────────────────────────────────────

const rangeLabel: Record<DashboardRange, string> = {
    today: 'hôm nay',
    week: 'tuần này',
    month: 'tháng này',
    year: 'năm này',
};

// ─── Format x-axis ticks ─────────────────────────────────────────────────────

function formatXTick(label: string, range: DashboardRange): string {
    if (range === 'year') {
        // yyyy-MM → Th. MM
        const [, month] = label.split('-');
        return `Th. ${parseInt(month, 10)}`;
    }
    // yyyy-MM-dd → dd/MM
    const parts = label.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return label;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, isLoading, range }) => {
    const hasData = data && data.length > 0;

    const formatted = (data ?? []).map((d) => ({
        ...d,
        tick: formatXTick(d.label, range),
    }));

    return (
        <div className="bg-surface-dark border border-white/5 rounded-lg p-6 flex flex-col h-full">
            {/* Title row */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Biểu đồ doanh thu
                    </h3>
                    <p className="text-xs text-white/30 mt-1">
                        Doanh thu {rangeLabel[range]} (đơn hoàn thành)
                    </p>
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <ChartSkeleton />
            ) : !hasData ? (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                    Chưa có dữ liệu cho khoảng thời gian này
                </div>
            ) : (
                <div className="flex-1 min-h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={formatted}
                            margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.05)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="tick"
                                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v: number) => {
                                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}tr`;
                                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                                    return `${v}`;
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#e11d48"
                                strokeWidth={2}
                                fill="url(#revenueGradient)"
                                dot={false}
                                activeDot={{ r: 5, fill: '#e11d48', strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
