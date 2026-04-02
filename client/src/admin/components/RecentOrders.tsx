import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RecentOrder, formatVND } from '@/common/services/dashboard.service';
import { getOrderStatusDisplayMeta, toCompactStatusKey } from '@/common/utils/orderUiStatus';

interface RecentOrdersProps {
    orders: RecentOrder[];
    isLoading: boolean;
}

const SkeletonRow: React.FC = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-3"><div className="h-3 bg-white/10 rounded w-24" /></td>
        <td className="px-4 py-3"><div className="h-3 bg-white/10 rounded w-32" /></td>
        <td className="px-4 py-3"><div className="h-3 bg-white/10 rounded w-20" /></td>
        <td className="px-4 py-3"><div className="h-5 bg-white/10 rounded-full w-20" /></td>
        <td className="px-4 py-3"><div className="h-3 bg-white/10 rounded w-6 ml-auto" /></td>
    </tr>
);

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, isLoading }) => {
    const { t } = useTranslation(['dashboard', 'orders']);
    const navigate = useNavigate();
    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };
    const titleLabel = resolveText('recentOrders.title', 'Đơn hàng gần đây');
    const viewAllLabel = resolveText('recentOrders.viewAll', 'Xem tất cả');
    const emptyLabel = resolveText('recentOrders.empty', 'Chưa có đơn hàng nào');
    const orderIdLabel = resolveText('orders:table.orderId', 'Mã đơn');
    const customerLabel = resolveText('orders:table.customer', 'Khách hàng');
    const totalLabel = resolveText('orders:table.total', 'Tổng tiền');
    const statusHeaderLabel = resolveText('orders:table.status', 'Trạng thái');
    const dateLabel = resolveText('orders:table.date', 'Ngày đặt');

    return (
        <div className="bg-surface-dark border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {titleLabel}
                </h3>
                <button
                    onClick={() => navigate('/admin/orders')}
                    className="text-xs text-white/40 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                    {viewAllLabel}
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">
                                {orderIdLabel}
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">
                                {customerLabel}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">
                                {totalLabel}
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-white/30 uppercase tracking-widest">
                                {statusHeaderLabel}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">
                                {dateLabel}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-white/20">
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const { canonical, meta } = getOrderStatusDisplayMeta(order.status);
                                const rawStatus = canonical
                                    ? canonical.toUpperCase()
                                    : toCompactStatusKey(order.status) || 'PENDING';
                                const fallbackStatusLabel =
                                    meta.label ||
                                    order.status ||
                                    resolveText('orders:status.other', 'Khác');
                                const statusLabel = resolveText(
                                    `orders:status.${rawStatus}`,
                                    fallbackStatusLabel,
                                );
                                const dateStr = order.createdAt
                                    ? new Date(order.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                    })
                                    : '--';

                                return (
                                    <tr
                                        key={order.orderId}
                                        className="hover:bg-white/[0.025] transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-semibold text-white/70 group-hover:text-white transition-colors">
                                                #{order.orderNumber}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-white/60 max-w-[160px] truncate">
                                            {order.userFullName || order.customerName}
                                        </td>

                                        <td className="px-4 py-3 text-right font-semibold text-white/80">
                                            {formatVND(order.totalAmount)}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <span
                                                    className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full
                            border text-[10px] font-bold uppercase tracking-wider shadow-sm
                            ${meta.badgeClass} ${meta.textClass}
                          `}
                                                >
                                                    {statusLabel}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-right text-white/30">
                                            {dateStr}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
