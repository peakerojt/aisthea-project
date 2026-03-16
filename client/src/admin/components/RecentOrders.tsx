import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentOrder, formatVND, STATUS_VI } from '@/common/services/dashboard.service';

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
    const navigate = useNavigate();

    return (
        <div className="bg-surface-dark border border-white/5 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Đơn hàng gần đây
                </h3>
                <button
                    onClick={() => navigate('/admin/orders')}
                    className="text-xs text-white/40 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                    Xem tất cả
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">
                                Mã đơn
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-white/30 uppercase tracking-widest">
                                Khách hàng
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">
                                Tổng tiền
                            </th>
                            <th className="px-4 py-3 text-center font-semibold text-white/30 uppercase tracking-widest">
                                Trạng thái
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-white/30 uppercase tracking-widest">
                                Ngày
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-white/20">
                                    Chưa có đơn hàng nào
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const rawStatus = order.status?.toUpperCase() ?? 'PENDING';
                                const statusInfo =
                                    STATUS_VI[rawStatus] ??
                                    { label: order.status ?? 'Không rõ', color: 'text-white/40 bg-white/5 border-white/10' };
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
                            border text-[10px] font-bold uppercase tracking-wider
                            ${statusInfo.color}
                          `}
                                                >
                                                    {statusInfo.label}
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
