import React, { useState, useRef, useEffect } from 'react';
import { Bell, Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventoryAlerts } from '@/common/hooks/useInventoryAlerts';
import { AdminBadge, AdminIconButton, AdminSectionCard } from '@/admin/components/AdminUI';

export const NotificationBell: React.FC = () => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { data, isLoading } = useInventoryAlerts();
    const navigate = useNavigate();

    const totalLowStock = data?.totalLowStock ?? 0;
    const topItems = (data?.items ?? []).slice(0, 5);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            {/* Bell Button */}
            <AdminIconButton
                onClick={() => setOpen((p) => !p)}
                className="relative rounded-full bg-[#111318] hover:bg-white/[0.08]"
                aria-label="Thông báo tồn kho"
            >
                <Bell size={18} className="text-white/70" />
                {!isLoading && totalLowStock > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg-dark animate-pulse" />
                )}
            </AdminIconButton>

            {/* Dropdown */}
            {open && (
                <AdminSectionCard
                    className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl animate-fade-in"
                    bodyClassName="p-0"
                    title={(
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400" />
                            <span>Cảnh báo tồn kho</span>
                        </div>
                    )}
                    actions={totalLowStock > 0 ? <AdminBadge tone="danger">{totalLowStock} sản phẩm</AdminBadge> : undefined}
                    headerClassName="bg-white/[0.02]"
                >

                    {/* Items */}
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-10 rounded bg-white/[0.06] animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-2.5 bg-white/[0.06] rounded animate-pulse w-3/4" />
                                        <div className="h-2 bg-white/[0.04] rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : totalLowStock === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                                <span className="text-emerald-400 text-lg">✓</span>
                            </div>
                            <p className="text-xs text-emerald-400 font-medium">Tuyệt vời! Kho hàng đang ổn định.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-white/[0.04]">
                            {topItems.map((item) => (
                                <li key={item.variantId} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
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
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-white truncate">{item.product.name}</p>
                                        <p className="text-[10px] text-white/40 truncate">
                                            {item.variantLabel || 'Mặc định'}
                                        </p>
                                    </div>
                                    {/* Badge */}
                                    {item.stockQuantity === 0 ? (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                                            Đã hết hàng
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0 whitespace-nowrap">
                                            Còn {item.stockQuantity}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Footer */}
                    {totalLowStock > 0 && (
                        <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.015]">
                            <button
                                onClick={() => { setOpen(false); navigate('/admin/restock'); }}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                            >
                                Xem tất cả ({totalLowStock})
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </AdminSectionCard>
            )}
        </div>
    );
};
