import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    ComposedChart, Area, Line,
} from 'recharts';
import { motion } from 'framer-motion';
import {
    Download, TrendingUp, TrendingDown,
    DollarSign, ShoppingCart, Users, AlertTriangle, Calendar, Sparkles, MessageCircleMore,
} from 'lucide-react';
import {
    fetchAnalyticsSummary, exportToCSV, formatVND, formatVNDShort,
    formatMonthLabel, firstOfMonthStr, todayStr,
    AnalyticsSummary,
} from '@/common/services/analytics.service';
import { fetchChatTelemetrySummary, type ChatTelemetrySummaryPayload } from '@/common/services/chat.service';

// ─────────────────────────────────────────────────────────────────────────────
// Shared tooltip
// ─────────────────────────────────────────────────────────────────────────────

const VNDTooltip = ({ active, payload, label }: any) => {
    const { t } = useTranslation('analytics');
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1a1a2e] border border-white/10 rounded-sm px-3 py-2 shadow-xl text-xs">
            <p className="text-white/40 font-medium mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} className="font-bold" style={{ color: p.color ?? '#e11d48' }}>
                    {p.name === 'revenue' || p.name === t('charts.revenue', { defaultValue: 'Doanh thu' })
                        ? formatVNDShort(p.value)
                        : `${p.value.toLocaleString('vi-VN')} ${t('charts.orderUnit', { defaultValue: 'đơn' })}`}
                </p>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton helpers
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonChart: React.FC<{ height?: string }> = ({ height = 'h-64' }) => (
    <div className={`w-full ${height} bg-white/5 rounded-sm animate-pulse flex items-end gap-1 px-4 pb-4`}>
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-sm bg-white/10"
                style={{ height: `${25 + Math.random() * 55}%` }} />
        ))}
    </div>
);

const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
    <tr className="animate-pulse">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <div className="h-3 bg-white/10 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
            </td>
        ))}
    </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: string;
    sub?: string;
    icon: React.FC<{ className?: string }>;
    positive?: boolean | null;
    accentColor: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon: Icon, positive, accentColor }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-dark border border-white/15 p-5 rounded-sm relative overflow-hidden group hover:border-white/10 transition-all"
    >
        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${accentColor.replace('text-', 'bg-')}`} />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</p>
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${accentColor.replace('text-', 'bg-')}/10 border ${accentColor.replace('text-', 'border-')}/20`}>
                    <Icon className={`w-4 h-4 ${accentColor}`} />
                </div>
            </div>
            <p className="text-2xl font-black text-white tracking-tight mb-1.5">{value}</p>
            {sub && (
                <div className="flex items-center gap-1">
                    {positive === true && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                    {positive === false && <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className={`text-xs font-semibold ${positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-white/30'}`}>
                        {sub}
                    </span>
                </div>
            )}
        </div>
    </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AI Insights Card
// ─────────────────────────────────────────────────────────────────────────────

const AI_INSIGHT_TEXT =
    'Doanh thu tăng trưởng tốt. Đề nghị kiểm tra tỷ lệ hủy đơn của nhóm sản phẩm có lượng tồn kho thấp.';

const AIInsightsCard: React.FC = () => {
    const { t } = useTranslation('analytics');
    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-sm border border-sky-500/30 bg-[#0d0f1e] overflow-hidden"
            style={{
                boxShadow: '0 0 28px rgba(99,102,241,0.30), 0 0 8px rgba(99,102,241,0.15) inset',
            }}
        >
            {/* Animated shimmer overlay */}
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                    background:
                        'linear-gradient(115deg, transparent 40%, rgba(139,92,246,0.6) 50%, transparent 60%)',
                    backgroundSize: '200% 200%',
                    animation: 'shimmerMove 4s linear infinite',
                }}
            />

            <div className="relative z-10 flex items-start gap-4 px-6 py-4">
                {/* Icon */}
                <div className="shrink-0 mt-0.5 w-9 h-9 rounded-sm bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                </div>

                <div>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.18em] mb-1">
                        {t('aiInsights.badge')}
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed font-medium">
                        {t('aiInsights.message', { defaultValue: AI_INSIGHT_TEXT })}
                    </p>
                </div>

                {/* Live badge */}
                <div className="ml-auto shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-sky-400 border border-sky-500/30 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    {t('aiInsights.live')}
                </div>
            </div>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Customer Retention Donut Chart
// ─────────────────────────────────────────────────────────────────────────────

const RETENTION_COLORS = ['#10b981', '#3b82f6'] as const;

interface RetentionChartProps {
    newCustomers: number;
    returningCustomers: number;
    loading: boolean;
}

const RetentionChart: React.FC<RetentionChartProps> = ({ newCustomers, returningCustomers, loading }) => {
    const { t } = useTranslation('analytics');
    const total = newCustomers + returningCustomers;
    const chartData = [
        { name: t('retention.newCustomers', { defaultValue: 'Khách mới' }), value: newCustomers },
        { name: t('retention.returningCustomers', { defaultValue: 'Khách quay lại' }), value: returningCustomers },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-surface-dark border border-white/15 rounded-sm p-6 flex flex-col"
        >
            <div className="mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {t('retention.title', { defaultValue: 'Tỷ Lệ Khách Hàng Mới / Cũ' })}
                </h3>
                <p className="text-xs text-white/30 mt-1">{t('retention.subtitle', { defaultValue: 'Phân loại khách trong kỳ báo cáo' })}</p>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-36 h-36 rounded-full border-4 border-white/10 animate-pulse" />
                </div>
            ) : total === 0 ? (
                <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                    {t('retention.noData', { defaultValue: 'Không có dữ liệu' })}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Donut chart */}
                    <div className="h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={52}
                                    outerRadius={76}
                                    paddingAngle={4}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={RETENTION_COLORS[i]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1a2e',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [
                                        `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Centre label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-xl font-black text-white">{total}</p>
                            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wide">Tổng</p>
                        </div>
                    </div>

                    {/* Legend rows */}
                    <div className="grid grid-cols-2 gap-3">
                        {chartData.map((item, i) => (
                            <div key={item.name} className="flex flex-col gap-0.5 bg-white/[0.03] rounded-sm p-3 border border-white/15">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RETENTION_COLORS[i] }} />
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{item.name}</span>
                                </div>
                                <p className="text-xl font-black text-white ml-4">{item.value}</p>
                                <p className="text-[10px] text-white/30 ml-4">
                                    {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
    const { t: _t } = useTranslation('analytics');
    const t = _t as (key: string, options?: any) => string;
    const [startDate, setStartDate] = useState(firstOfMonthStr());
    const [endDate, setEndDate] = useState(todayStr());
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [chatData, setChatData] = useState<ChatTelemetrySummaryPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (sd: string, ed: string) => {
        setLoading(true);
        setError(null);
        try {
            const [analyticsResult, chatTelemetryResult] = await Promise.all([
                fetchAnalyticsSummary(sd, ed),
                fetchChatTelemetrySummary(sd, ed),
            ]);
            setData(analyticsResult);
            setChatData(chatTelemetryResult);
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e?.message ?? t('feedback.loadError'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(startDate, endDate); }, []);

    const handleApply = () => load(startDate, endDate);

    const handleExport = () => {
        if (data) exportToCSV(data, startDate, endDate);
    };

    const mom = data?.summary.momGrowth ?? 0;
    const momPositive = mom >= 0;

    return (
        <div className="p-6 xl:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/15">
                <div>
                    <p className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-1.5">
                        {t('page.subtitle')}
                    </p>
                    <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tighter uppercase">
                        {t('page.title')}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Date range inputs */}
                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-sm px-3 py-2">
                        <Calendar className="w-4 h-4 text-white/30 shrink-0" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent text-xs text-white/70 outline-none w-32 cursor-pointer"
                        />
                        <span className="text-white/20 text-xs">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent text-xs text-white/70 outline-none w-32 cursor-pointer"
                        />
                        <button
                            onClick={handleApply}
                            className="ml-1 px-3 py-1 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/80 transition-colors cursor-pointer"
                        >{t('page.apply')}
                        </button>
                    </div>

                    {/* Export CSV */}
                    <button
                        onClick={handleExport}
                        disabled={!data}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-sm text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        {t('page.exportCSV')}
                    </button>
                </div>
            </header>

            {/* ── AI Insights Card ─────────────────────────────────────────────── */}
            <AIInsightsCard />

            {/* ── Error ────────────────────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3 text-sm text-red-400">
                    ⚠ {error}
                </div>
            )}

            {/* ── KPI Strip ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard
                    label={t('kpi.revenue')}
                    value={formatVNDShort(data?.summary.currentRevenue ?? 0)}
                    sub={`${momPositive ? '+' : ''}${mom.toFixed(1)}% ${t('kpi.revenueGrowth', { sign: '', value: '' }).replace('', '').trim()}`}
                    positive={momPositive}
                    icon={DollarSign}
                    accentColor="text-emerald-400"
                />
                <KPICard
                    label={t('kpi.totalOrders')}
                    value={(data?.summary.totalOrders ?? 0).toLocaleString('vi-VN')}
                    sub={`${data?.summary.completedOrders ?? 0} ${t('kpi.completedOrders', { count: '' }).split(' ')[1] ?? 'đơn hoàn thành'}`}
                    positive={null}
                    icon={ShoppingCart}
                    accentColor="text-primary"
                />
                <KPICard
                    label={t('kpi.avgOrderValue')}
                    value={formatVNDShort(data?.summary.avgOrderValue ?? 0)}
                    sub={t('kpi.avgOrderSub')}
                    positive={null}
                    icon={TrendingUp}
                    accentColor="text-blue-400"
                />
                <KPICard
                    label={t('kpi.topCustomers')}
                    value={(data?.topCustomers.length ?? 0).toLocaleString('vi-VN')}
                    sub={t('kpi.topCustomersSub')}
                    positive={null}
                    icon={Users}
                    accentColor="text-teal-400"
                />
            </div>

            {/* ── Chat Assistant Funnel ───────────────────────────────────────── */} 
            <section className="space-y-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold text-sky-400 tracking-[0.18em] uppercase">
                        {t('chatFunnel.eyebrow')}
                    </p>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {t('chatFunnel.title')}
                    </h3>
                    <p className="text-xs text-white/35">
                        {t('chatFunnel.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <KPICard
                        label={t('chatFunnel.opens')}
                        value={(chatData?.overview.opens ?? 0).toLocaleString('vi-VN')}
                        sub={t('chatFunnel.sessions', { count: (chatData?.overview.uniqueSessions ?? 0).toLocaleString('vi-VN') })}
                        positive={null}
                        icon={MessageCircleMore}
                        accentColor="text-sky-400"
                    />
                    <KPICard
                        label={t('chatFunnel.messagesSent')}
                        value={(chatData?.overview.sends ?? 0).toLocaleString('vi-VN')}
                        sub={t('chatFunnel.openToSend', { value: (chatData?.overview.sendRate ?? 0).toFixed(1) })}
                        positive={chatData ? chatData.overview.sendRate > 0 : null}
                        icon={Sparkles}
                        accentColor="text-fuchsia-400"
                    />
                    <KPICard
                        label={t('chatFunnel.ctaClicks')}
                        value={(chatData?.overview.ctaClicks ?? 0).toLocaleString('vi-VN')}
                        sub={t('chatFunnel.sendToClick', { value: (chatData?.overview.clickRate ?? 0).toFixed(1) })}
                        positive={chatData ? chatData.overview.clickRate > 0 : null}
                        icon={ShoppingCart}
                        accentColor="text-amber-400"
                    />
                    <KPICard
                        label={t('chatFunnel.productClicks')}
                        value={(chatData?.overview.productClicks ?? 0).toLocaleString('vi-VN')}
                        sub={t('chatFunnel.recommendationCard')}
                        positive={null}
                        icon={Users}
                        accentColor="text-emerald-400"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[6fr_6fr] gap-5">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-surface-dark border border-white/15 rounded-sm overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-white/15">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                {t('chatFunnel.byPageTitle')}
                            </h3>
                            <p className="text-[10px] text-white/30 mt-0.5">
                                {t('chatFunnel.byPageSub')}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/15">
                                        <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.page')}</th>
                                        <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.opens')}</th>
                                        <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.messages')}</th>
                                        <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">CTA</th>
                                        <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.products')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                                    ) : !chatData?.byPage.length ? (
                                        <tr><td colSpan={5} className="px-4 py-10 text-center text-white/20">{t('chatFunnel.noData')}</td></tr>
                                    ) : (
                                        chatData.byPage.map((row) => (
                                            <tr key={row.page} className="hover:bg-white/[0.025] transition-colors">
                                                <td className="px-4 py-3 font-semibold uppercase text-white/75">{row.page}</td>
                                                <td className="px-4 py-3 text-right text-white/60">{row.opens.toLocaleString('vi-VN')}</td>
                                                <td className="px-4 py-3 text-right text-white/60">{row.sends.toLocaleString('vi-VN')}</td>
                                                <td className="px-4 py-3 text-right text-amber-400 font-bold">{row.ctaClicks.toLocaleString('vi-VN')}</td>
                                                <td className="px-4 py-3 text-right text-emerald-400 font-bold">{row.productClicks.toLocaleString('vi-VN')}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-surface-dark border border-white/15 rounded-sm overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-white/15">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                {t('chatFunnel.topTargetsTitle')}
                            </h3>
                            <p className="text-[10px] text-white/30 mt-0.5">
                                {t('chatFunnel.topTargetsSub')}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/15">
                                        <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.label')}</th>
                                        <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.target')}</th>
                                        <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('chatFunnel.columns.clicks')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
                                    ) : !chatData?.topTargets.length ? (
                                        <tr><td colSpan={3} className="px-4 py-10 text-center text-white/20">{t('chatFunnel.noTargets')}</td></tr>
                                    ) : (
                                        chatData.topTargets.map((row) => (
                                            <tr key={row.target} className="hover:bg-white/[0.025] transition-colors">
                                                <td className="px-4 py-3 font-semibold text-white/80">{row.label ?? 'Direct navigation'}</td>
                                                <td className="px-4 py-3 text-white/45 font-mono">{row.target}</td>
                                                <td className="px-4 py-3 text-right font-bold text-sky-400">{row.clicks.toLocaleString('vi-VN')}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Charts Row 1: Bar + Pie + Retention Donut ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* Chart 1: Revenue by Category (BarChart) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="lg:col-span-5 bg-surface-dark border border-white/15 rounded-sm p-6 flex flex-col"
                >
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {t('charts.revenueByCategory')}
                        </h3>
                        <p className="text-xs text-white/30 mt-1">{t('charts.revenueByCategorySub')}</p>
                    </div>
                    {loading ? (
                        <SkeletonChart height="h-72" />
                    ) : !data?.revenueByCategory.length ? (
                        <div className="h-72 flex items-center justify-center text-white/20 text-sm">{t('charts.noData')}</div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.revenueByCategory}
                                    layout="vertical"
                                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                                >
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#be185d" stopOpacity={0.7} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                                        axisLine={false} tickLine={false}
                                        tickFormatter={(v: number) => formatVNDShort(v).replace(' ₫', '')}
                                    />
                                    <YAxis
                                        type="category" dataKey="category"
                                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                                        axisLine={false} tickLine={false} width={120}
                                    />
                                    <Tooltip content={<VNDTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="revenue" name={t('charts.revenue', { defaultValue: 'Doanh thu' })} fill="url(#barGrad)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>

                {/* Chart 2: Order Status Funnel (PieChart) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="lg:col-span-4 bg-surface-dark border border-white/15 rounded-sm p-6 flex flex-col"
                >
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            {t('charts.statusFunnel')}
                        </h3>
                        <p className="text-xs text-white/30 mt-1">{t('charts.statusFunnelSub')}</p>
                    </div>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-40 h-40 rounded-full border-4 border-white/10 animate-pulse" />
                        </div>
                    ) : !data?.statusFunnel.length ? (
                        <div className="flex-1 flex items-center justify-center text-white/20 text-sm">{t('charts.noData')}</div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.statusFunnel} cx="50%" cy="50%"
                                            innerRadius={52} outerRadius={76}
                                            paddingAngle={3} dataKey="value"
                                        >
                                            {data.statusFunnel.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Legend */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {data.statusFunnel.map((item) => (
                                    <div key={item.status} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-[11px] text-white/50 truncate">
                                            {t(`orderStatuses.${item.status}`, { defaultValue: item.status })}
                                        </span>
                                        <span className="text-[11px] font-bold text-white ml-auto">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Chart 3: Customer Retention Donut */}
                <div className="lg:col-span-3">
                    <RetentionChart
                        newCustomers={data?.customerRetention?.newCustomers ?? 0}
                        returningCustomers={data?.customerRetention?.returningCustomers ?? 0}
                        loading={loading}
                    />
                </div>
            </div>

            {/* ── Chart Row 2: Composed Chart (Revenue + Orders) ───────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-surface-dark border border-white/15 rounded-sm p-6"
            >
                <div className="mb-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        {t('charts.monthlyTrend')}
                    </h3>
                    <p className="text-xs text-white/30 mt-1">{t('charts.monthlyTrendSub')}</p>
                </div>
                {loading ? (
                    <SkeletonChart height="h-64" />
                ) : !data?.monthlyTrend.length ? (
                    <div className="h-64 flex items-center justify-center text-white/20 text-sm">{t('charts.noMonthlyData')}</div>
                ) : (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={data.monthlyTrend.map(d => ({ ...d, label: formatMonthLabel(d.label) }))}
                                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="composedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                />
                                <YAxis
                                    yAxisId="revenue" orientation="left"
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={(v: number) => formatVNDShort(v).replace(' ₫', '')}
                                />
                                <YAxis
                                    yAxisId="orders" orientation="right"
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                />
                                <Tooltip content={<VNDTooltip />} />
                                <Area
                                    yAxisId="revenue" type="monotone" dataKey="revenue" name={t('charts.revenue', { defaultValue: 'Doanh thu' })}
                                    stroke="#e11d48" strokeWidth={2} fill="url(#composedGrad)"
                                    dot={false} activeDot={{ r: 4, fill: '#e11d48', strokeWidth: 0 }}
                                />
                                <Bar
                                    yAxisId="orders" dataKey="orders" name={t('charts.orders', { defaultValue: 'Đơn hàng' })}
                                    fill="rgba(99,102,241,0.6)" radius={[4, 4, 0, 0]} barSize={20}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </motion.div>

            {/* ── Data Tables Row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-5">

                {/* Table 1: Top Customers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-surface-dark border border-white/15 rounded-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-white/15">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {t('tables.topCustomersTitle')}
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/15">
                                    <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">#</th>
                                    <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">{t('tables.topCustomersName')}</th>
                                    <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('tables.topCustomersSpent')}</th>
                                    <th className="px-4 py-3 text-center font-semibold text-white/30 uppercase tracking-widest">{t('tables.topCustomersOrders')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                ) : !data?.topCustomers.length ? (
                                    <tr><td colSpan={4} className="px-4 py-10 text-center text-white/20">{t('tables.noData')}</td></tr>
                                ) : (
                                    data.topCustomers.map((c, i) => (
                                        <tr key={c.userId} className="hover:bg-white/[0.025] transition-colors group">
                                            <td className="px-4 py-3 text-white/20 font-bold">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-white/80 group-hover:text-white transition-colors truncate max-w-[140px]">
                                                    {c.fullName}
                                                </p>
                                                <p className="text-white/30 truncate max-w-[140px]">{c.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                                {formatVNDShort(c.totalSpent)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400 font-bold text-[10px]">
                                                    {c.orderCount}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Table 2: Most Cancelled Products */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="bg-surface-dark border border-white/15 rounded-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-white/15">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            {t('tables.cancelledTitle')}
                        </h3>
                        <p className="text-[10px] text-white/30 mt-0.5">{t('tables.cancelledSub')}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/15">
                                    <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">#</th>
                                    <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">{t('tables.cancelledProduct')}</th>
                                    <th className="px-4 py-3 text-center font-semibold text-white/30 uppercase tracking-widest">{t('tables.cancelledCount')}</th>
                                    <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">{t('tables.cancelledLost')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                                ) : !data?.mostCancelled.length ? (
                                    <tr><td colSpan={4} className="px-4 py-10 text-center text-white/20">{t('tables.noCancelled')}</td></tr>
                                ) : (
                                    data.mostCancelled.map((p, i) => (
                                        <tr key={p.productId} className="hover:bg-white/[0.025] transition-colors group">
                                            <td className="px-4 py-3 text-white/20 font-bold">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-white/80 group-hover:text-white transition-colors truncate max-w-[160px]">
                                                    {p.productName}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-[10px]">
                                                    {t('tables.cancelTimes', { count: p.cancelCount })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-red-400">
                                                -{formatVNDShort(p.lostRevenue)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

        </div>
    );
};
