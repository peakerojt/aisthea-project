import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Package, MapPin, CreditCard, User, Clock,
    CheckCircle2, XCircle, Truck, ShoppingBag, Loader2, AlertCircle,
    ChevronRight, Copy, Check, RotateCcw,
} from 'lucide-react';
import { adminOrderService, AdminOrderDetail as OrderDetailType } from '@/common/services/order.service';
import { formatVND, getOrderStatusColor } from '@/admin/pages/Orders';
import { OrderActionPanel } from '@/admin/components/OrderActionPanel';
import { OrderTimeline } from '@/admin/components/OrderTimeline';
import { OrderStatusBadge } from '@/admin/components/OrderStatusBadge';
import { getStatusMeta, normalizeStatus } from '@/config/orderStatus.config';
import { RefundDialog } from '@/admin/components/RefundDialog';
import { OrderFinancials } from '@/admin/components/OrderFinancials';
import { adminRefundService, RefundRecord } from '@/admin/services/refund.service';
import { getImageUrl } from '@/common/utils/cloudinary';

// ─────────────────────────────────────────────────────────────────────────────
// Design System (ui-ux-pro-max: luxury dark ecommerce admin)
// Palette: #0A0A0C bg · #111114 surface · #1A1A1F card · primary=#E31837
// Font: Be Vietnam Pro | Status config now lives in orderStatus.config.ts
// ─────────────────────────────────────────────────────────────────────────────

const cfg = (s?: string | null) => getStatusMeta(normalizeStatus(s) ?? s ?? '');

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// StatusPill delegates to the reusable OrderStatusBadge (FSM-driven)
const StatusPill: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => (
    <OrderStatusBadge status={status} size={size} />
);

/* Glassmorphic card wrapper */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/[0.025] border border-white/[0.07] rounded-2xl backdrop-blur-sm ${className}`}>
        {children}
    </div>
);

/* Section heading inside a card */
const SectionTitle: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon size={13} className="text-primary" />
        </div>
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.12em]">{title}</span>
    </div>
);

/* Copy button for order number */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 transition-all text-[10px]"
        >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Đã copy' : 'Copy'}
        </button>
    );
};

// Legacy StatusTimeline, CancelModal, ActionBar — removed.
// All action logic is now encapsulated in <OrderActionPanel />.
// All history display is encapsulated in <OrderTimeline />.

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

const Toast: React.FC<{ toast: ToastState | null }> = ({ toast }) => {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${isError
                ? 'bg-red-950/90 border-red-500/30 shadow-red-900/20'
                : 'bg-[#0d1f18]/90 border-emerald-500/25 shadow-emerald-900/10'
                }`}>
                {isError
                    ? <AlertCircle size={15} className="text-red-400 shrink-0" />
                    : <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                <span className="text-sm font-medium text-white">{toast.message}</span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

interface AdminOrderDetailProps {
    orderId?: number | null;
}

export const OrderDetail: React.FC<AdminOrderDetailProps> = ({ orderId }) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const routeId = id ? Number(id) : null;
    const [order, setOrder] = useState<OrderDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);

    // ── Refund state ─────────────────────────────────────────────────────────
    const [showRefundDialog, setShowRefundDialog] = useState(false);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [refundsLoading, setRefundsLoading] = useState(false);

    const loadRefunds = useCallback(async (oId: number) => {
        setRefundsLoading(true);
        try { setRefunds(await adminRefundService.list(oId)); }
        catch { setRefunds([]); }
        finally { setRefundsLoading(false); }
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadOrder = useCallback(async () => {
        const effectiveId = routeId ?? orderId;
        if (!effectiveId) { setError('Không tìm thấy mã đơn.'); setLoading(false); return; }
        setLoading(true); setError(null);
        try {
            const o = await adminOrderService.getDetail(effectiveId);
            setOrder(o);
            loadRefunds(effectiveId);
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown }; setError(e.message || 'Không thể tải chi tiết đơn hàng.');
        }
        finally { setLoading(false); }
    }, [orderId, routeId, loadRefunds]);

    useEffect(() => { loadOrder(); }, [loadOrder]);

    const fmt = (iso?: string) => iso
        ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
        : '—';

    // ── Loading ─────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="h-full flex items-center justify-center" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            <div className="flex flex-col items-center gap-5">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-white/[0.05]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-l-transparent border-r-transparent border-b-transparent animate-spin" />
                </div>
                <p className="text-sm text-white/40 font-medium">Đang tải chi tiết đơn hàng...</p>
            </div>
        </div>
    );

    if (error || !order) return (
        <div className="h-full flex items-center justify-center" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            <div className="text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                    <p className="text-base font-bold text-white mb-1">Không tìm thấy đơn hàng</p>
                    <p className="text-sm text-white/50">{error}</p>
                </div>
                <button onClick={() => navigate('/admin/orders')} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline cursor-pointer">
                    Quay lại danh sách
                </button>
            </div>
        </div>
    );

    const status = order.status ?? 'PENDING';
    const c = cfg(status);
    const statusHistory = (order as any).statusHistory ?? [];

    return (
        <>
            <div className="min-h-full" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                <Toast toast={toast} />

                {/* ── Sticky Navigation Bar ──────────────────────────────────────── */}
                <div className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#0A0A0C]/90 backdrop-blur-xl">
                    <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/admin/orders')}
                                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors cursor-pointer group"
                            >
                                <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                                Đơn hàng
                            </button>
                            <ChevronRight size={13} className="text-white/20" />
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white font-mono tracking-wide">
                                    {order.orderNumber}
                                </span>
                                <CopyButton text={order.orderNumber} />
                            </div>
                        </div>

                        {/* Status + Actions */}
                        <div className="flex items-center gap-3">
                            <StatusPill status={status} />
                            <div className="w-px h-5 bg-white/10" />

                            {/* Hoàn tiền button — only when Paid or Partially Refunded */}
                            {(['Paid', 'PAID', 'Partially_Refunded', 'PARTIALLY_REFUNDED'].includes(order.paymentStatus ?? '')) && (
                                <button
                                    onClick={() => setShowRefundDialog(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                                >
                                    <RotateCcw size={11} />
                                    Hoàn tiền
                                </button>
                            )}

                            <div className="w-px h-5 bg-white/10" />
                            <OrderActionPanel
                                orderId={order.orderId}
                                currentStatus={status}
                                onStatusUpdated={loadOrder}
                                onError={(msg) => showToast(msg, 'error')}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Page Body ─────────────────────────────────────────────────── */}
                <div className="max-w-[1400px] mx-auto px-6 py-7">
                    {/* Order metadata row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-6 text-[11px] text-white/35 font-mono">
                        <span>Đặt lúc {fmt(order.createdAt)}</span>
                        {order.trackingNumber && (
                            <>
                                <span className="text-white/15">·</span>
                                <span>{order.carrier ?? 'Vận chuyển'}: <span className="text-white/60">{order.trackingNumber}</span></span>
                            </>
                        )}
                        <span className="text-white/15">·</span>
                        <span className={c.textClass}>{c.label}</span>
                    </div>

                    {/* Two-column Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

                        {/* ══ LEFT COLUMN ═══════════════════════════════════════════════ */}
                        <div className="space-y-5">

                            {/* ── Product Items Card ─────────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={ShoppingBag} title={`Sản phẩm · ${order.items.length} mặt hàng`} />

                                <div className="divide-y divide-white/[0.04]">
                                    {order.items.map((item) => (
                                        <div key={item.orderItemId} className="flex gap-4 p-5 hover:bg-white/[0.018] transition-colors cursor-default">

                                            {/* Product image */}
                                            <div className="w-[72px] h-[90px] rounded-xl overflow-hidden shrink-0 bg-white/[0.04] border border-white/[0.07] relative">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.productName} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={22} className="text-white/15" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <p className="text-[13px] font-bold text-white/90 leading-snug line-clamp-2 mb-1.5">
                                                        {item.productName}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="inline-block text-[10px] bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-0.5 text-white/50 font-mono">
                                                            {item.sku}
                                                        </span>
                                                        <span className="inline-block text-[10px] bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-0.5 text-white/60">
                                                            {item.variantName}
                                                        </span>
                                                        <span className="inline-block text-[10px] bg-primary/8 border border-primary/15 rounded-md px-2 py-0.5 text-primary/80">
                                                            × {item.quantity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-white/35 mt-1">
                                                    Đơn giá: {formatVND(item.unitPrice)}
                                                </p>
                                            </div>

                                            {/* Line total */}
                                            <div className="text-right shrink-0 flex flex-col justify-between py-0.5">
                                                <p className="text-sm font-bold text-white">{formatVND(item.lineTotal)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Order total */}
                                <div className="px-5 py-4 border-t border-white/[0.06] bg-white/[0.015] rounded-b-2xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Tổng đơn hàng</span>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white tracking-tight">{formatVND(order.totalAmount)}</p>
                                            <p className={`text-[11px] font-semibold mt-0.5 ${order.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'
                                                }`}>
                                                {order.paymentStatus === 'Paid' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* ── Note card ─────────────────────────────────────────── */}
                            {order.note && (
                                <Card>
                                    <div className="px-5 py-4 flex items-start gap-3">
                                        <div className="w-1 h-full min-h-[40px] rounded-full bg-amber-500/50 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-1.5">Ghi chú đơn hàng</p>
                                            <p className="text-sm text-white/70 leading-relaxed">{order.note}</p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* ── Payment details ────────────────────────────────────── */}
                            {order.payments && order.payments.length > 0 && (
                                <Card>
                                    <SectionTitle icon={CreditCard} title="Chi tiết thanh toán" />
                                    <div className="p-5 space-y-3">
                                        {order.payments.map((p) => (
                                            <div key={p.paymentId} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-none">
                                                <div>
                                                    <p className="text-sm text-white/80 font-medium">{p.method}</p>
                                                    {p.paidAt && <p className="text-[11px] text-white/35 font-mono mt-0.5">{fmt(p.paidAt)}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-white">{formatVND(p.amount)}</p>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${p.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'
                                                        }`}>{p.status === 'Completed' ? 'Thành công' : p.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* ══ RIGHT COLUMN ═══════════════════════════════════════════════ */}
                        <div className="space-y-4">

                            {/* ── Customer card ─────────────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={User} title="Khách hàng" />
                                <div className="p-5">
                                    {order.user ? (
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            {order.user.avatarUrl ? (
                                                <img src={getImageUrl(order.user.avatarUrl)} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary shrink-0">
                                                    {order.user.fullName?.charAt(0) ?? '?'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white">{order.user.fullName}</p>
                                                <p className="text-[11px] text-white/40 truncate">{order.user.email}</p>
                                                {order.user.phone && <p className="text-[11px] text-white/40">{order.user.phone}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-bold text-white">{order.shippingAddress.recipientName}</p>
                                            <p className="text-[11px] text-white/40 mt-0.5">{order.shippingAddress.phone}</p>
                                            <p className="text-[11px] text-white/35 mt-0.5">Khách lẻ (không có tài khoản)</p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* ── Shipping address card ─────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={MapPin} title="Địa chỉ giao hàng" />
                                <div className="p-5 space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-white">{order.shippingAddress.recipientName}</p>
                                        <p className="text-[11px] text-white/50 mt-0.5">{order.shippingAddress.phone}</p>
                                    </div>
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                        <p className="text-[12px] text-white/65 leading-relaxed">
                                            {order.shippingAddress.addressDetail}
                                            {order.shippingAddress.district && `, ${order.shippingAddress.district}`}
                                            {`, ${order.shippingAddress.city}`}
                                        </p>
                                    </div>
                                    {order.trackingNumber && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <Truck size={12} className="text-cyan-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-white/35 uppercase tracking-wider">{order.carrier ?? 'Tracking'}</p>
                                                <p className="text-[12px] text-cyan-400 font-mono font-semibold">{order.trackingNumber}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* ── Payment summary card ──────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={CreditCard} title="Thanh toán" />
                                <div className="p-5 space-y-3">
                                    {[
                                        { label: 'Phương thức', value: order.paymentMethod ?? 'COD' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-[12px] text-white/40">{label}</span>
                                            <span className="text-[12px] font-semibold text-white">{value}</span>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                                        <span className="text-[12px] text-white/40">Trạng thái</span>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${order.paymentStatus === 'Paid'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {order.paymentStatus === 'Paid' ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
                                        </span>
                                    </div>
                                </div>
                            </Card>

                            {/* ── Status Timeline ───────────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={Clock} title="Lịch sử trạng thái" />
                                <OrderTimeline history={statusHistory} />
                            </Card>

                            {/* ── Financial History ──────────────────────────────────── */}
                            <OrderFinancials refunds={refunds} loading={refundsLoading} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Refund Dialog ─────────────────────────────────────────────────── */}
            {
                showRefundDialog && order && (
                    <RefundDialog
                        orderId={order.orderId}
                        totalPaid={Number(order.totalAmount)}
                        existingRefunds={refunds}
                        onClose={() => setShowRefundDialog(false)}
                        onSuccess={(newRefund) => {
                            setRefunds(prev => [newRefund, ...prev]);
                            showToast('Lệnh hoàn tiền đã được gửi tới cổng thanh toán thành công.', 'success');
                            loadOrder();
                        }}
                    />
                )
            }
        </>
    );
};




