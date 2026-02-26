import React from 'react';
import { AlertTriangle, Package, CheckCircle2, ArrowRight, Warehouse } from 'lucide-react';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import { ViewState } from '../../types';

interface LowStockWidgetProps {
    setView: (view: ViewState) => void;
}

// Skeleton row for loading state
const SkeletonRow: React.FC = () => (
    <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-10 rounded bg-white/[0.06] animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-white/[0.06] rounded animate-pulse w-3/4" />
            <div className="h-2 bg-white/[0.04] rounded animate-pulse w-1/2" />
        </div>
        <div className="h-5 w-16 bg-white/[0.05] rounded-full animate-pulse shrink-0" />
    </div>
);

export const LowStockWidget: React.FC<LowStockWidgetProps> = ({ setView }) => {
    const { data, isLoading, isError, refetch } = useInventoryAlerts();

    const totalLowStock = data?.totalLowStock ?? 0;
    const topItems = (data?.items ?? []).slice(0, 5);

    return (
        <div
            className="bg-surface-dark border border-white/[0.06] rounded-xl overflow-hidden flex flex-col"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');`}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <AlertTriangle size={15} className="text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">Cảnh báo tồn kho</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Cần nhập hàng ngay</p>
                    </div>
                </div>
                {!isLoading && totalLowStock > 0 && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                        {totalLowStock} mục
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="divide-y divide-white/[0.04]">
                        {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <AlertTriangle size={28} className="text-red-400/50 mb-2" />
                        <p className="text-xs text-white/40">Không thể tải dữ liệu.</p>
                        <button
                            onClick={() => refetch()}
                            className="mt-2 text-[11px] text-primary hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : totalLowStock === 0 ? (
                    // Empty state – all good
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                            <CheckCircle2 size={22} className="text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-400">Tuyệt vời!</p>
                        <p className="text-xs text-white/40 mt-1">Kho hàng đang ổn định.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-white/[0.04]">
                        {topItems.map((item) => (
                            <li
                                key={item.variantId}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025] ${item.stockQuantity === 0 ? 'bg-red-500/[0.03]' : ''
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="w-8 h-10 rounded overflow-hidden bg-white/5 border border-white/5 shrink-0">
                                    {item.product.primaryImageUrl ? (
                                        <img
                                            src={item.product.primaryImageUrl}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package size={12} className="text-white/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Name + variant */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white truncate leading-snug">
                                        {item.product.name}
                                    </p>
                                    <p className="text-[10px] text-white/40 truncate">
                                        {item.variantLabel || 'Mặc định'}
                                    </p>
                                </div>

                                {/* Stock badge */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.stockQuantity === 0 ? (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 whitespace-nowrap">
                                            Đã hết hàng
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                            Chỉ còn {item.stockQuantity}
                                        </span>
                                    )}

                                    {/* Quick action */}
                                    <button
                                        onClick={() => setView('ADMIN_RESTOCK')}
                                        title="Nhập kho ngay"
                                        className="w-6 h-6 rounded bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 flex items-center justify-center transition-all group"
                                    >
                                        <Warehouse size={11} className="text-white/40 group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            {!isLoading && totalLowStock > 0 && (
                <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.015]">
                    <button
                        onClick={() => setView('ADMIN_RESTOCK')}
                        className="w-full flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        <span>Xem tất cả ({totalLowStock})</span>
                        <ArrowRight size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};
