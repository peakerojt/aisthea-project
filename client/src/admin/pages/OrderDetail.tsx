import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Package, MapPin, CreditCard, User, Clock,
    Truck, ShoppingBag, AlertCircle,
    ChevronLeft, ChevronRight, Copy, Check, RotateCcw, X,
} from 'lucide-react';
import { adminOrderService, AdminOrderDetail as OrderDetailType } from '@/common/services/order.service';
import { formatVND } from '@/admin/pages/Orders';
import { OrderActionPanel } from '@/admin/components/OrderActionPanel';
import { OrderTimeline } from '@/admin/components/OrderTimeline';
import { OrderStatusBadge } from '@/admin/components/OrderStatusBadge';
import { RefundDialog } from '@/admin/components/RefundDialog';
import { OrderFinancials } from '@/admin/components/OrderFinancials';
import { adminRefundService, RefundRecord } from '@/admin/services/refund.service';
import { getImageUrl } from '@/common/utils/cloudinary';
import { getOrderStatusDisplayMeta } from '@/common/utils/orderUiStatus';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/contexts/ToastContext';
import { getPaymentStatusMeta } from '@/common/utils/paymentStatus';
import { PaymentMethodLabel, PaymentStatusBadge } from '@/common/components/PaymentStatusBadge';
import {
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';

// ─────────────────────────────────────────────────────────────────────────────
// Design System (ui-ux-pro-max: luxury dark ecommerce admin)
// Palette: #0A0A0C bg · #111114 surface · #1A1A1F card · primary=#E31837
// Font: Be Vietnam Pro | Status config now lives in orderStatus.config.ts
// ─────────────────────────────────────────────────────────────────────────────

const cfg = (s?: string | null) => getOrderStatusDisplayMeta(s).meta;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// StatusPill delegates to the reusable OrderStatusBadge (FSM-driven)
const StatusPill: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => (
    <OrderStatusBadge status={status} size={size} />
);

/* Glassmorphic card wrapper */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-[#111318] border border-white/[0.07] rounded-2xl ${className}`}>
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
const CopyButton: React.FC<{ text: string; copiedLabel: string; copyLabel: string }> = ({ text, copiedLabel, copyLabel }) => {
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
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20 transition-colors text-[10px]"
        >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? copiedLabel : copyLabel}
        </button>
    );
};

// Legacy StatusTimeline, CancelModal, ActionBar — removed.
// All action logic is now encapsulated in <OrderActionPanel />.
// All history display is encapsulated in <OrderTimeline />.

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

interface AdminOrderDetailProps {
    orderId?: number | null;
}

export const OrderDetail: React.FC<AdminOrderDetailProps> = ({ orderId }) => {
    const { t } = useTranslation('pages', { keyPrefix: 'adminOrderDetail' });
    const { t: enumsT } = useTranslation('enums');
    const { showToast: fireToast } = useToast();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const routeId = id ? Number(id) : null;
    const [order, setOrder] = useState<OrderDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Refund state ─────────────────────────────────────────────────────────
    const [showRefundDialog, setShowRefundDialog] = useState(false);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [refundsLoading, setRefundsLoading] = useState(false);
    const [deliveryProofLightboxIndex, setDeliveryProofLightboxIndex] = useState<number | null>(null);
    const [isDeliveryProofLightboxVisible, setIsDeliveryProofLightboxVisible] = useState(false);

    const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
        template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
    const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
        const value = t(key, { ...options, defaultValue: fallback });
        return value === key ? interpolateFallback(fallback, options) : value;
    };

    const loadRefunds = useCallback(async (oId: number) => {
        setRefundsLoading(true);
        try { setRefunds(await adminRefundService.list(oId)); }
        catch { setRefunds([]); }
        finally { setRefundsLoading(false); }
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        fireToast({
            type,
            title: message,
        });
    };

    const loadOrder = useCallback(async () => {
        const effectiveId = routeId ?? orderId;
        if (!effectiveId) { setError(resolveText('errors.missingOrderId', 'Thiếu mã đơn hàng.')); setLoading(false); return; }
        setLoading(true); setError(null);
        try {
            const o = await adminOrderService.getDetail(effectiveId);
            setOrder(o);
            loadRefunds(effectiveId);
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message || resolveText('errors.loadFailed', 'Không thể tải chi tiết đơn hàng.'));
        }
        finally { setLoading(false); }
    }, [orderId, routeId, loadRefunds]);

    useEffect(() => { loadOrder(); }, [loadOrder]);

    const fmt = (iso?: string) => iso
        ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
        : resolveText('common.emptyDate', 'Chưa có ngày');

    const status = order?.status ?? 'PENDING';
    const c = cfg(status);
    const statusHistory = (order as any)?.statusHistory ?? [];
    const paymentMeta = getPaymentStatusMeta(order?.paymentMethod, order?.paymentStatus);
    const deliveryProofImages = order?.deliveryProof?.images ?? [];
    const activeDeliveryProofImage = deliveryProofLightboxIndex !== null
        ? deliveryProofImages[deliveryProofLightboxIndex] ?? null
        : null;
    const loadingLabel = resolveText('states.loading', 'Đang tải chi tiết đơn hàng...');
    const notFoundTitleLabel = resolveText('states.notFoundTitle', 'Không tìm thấy đơn hàng');
    const backToListLabel = resolveText('actions.backToList', 'Quay lại danh sách');
    const refundLabel = resolveText('actions.refund', 'Hoàn tiền');
    const copiedLabel = resolveText('actions.copied', 'Đã sao chép');
    const copyLabel = resolveText('actions.copy', 'Sao chép');
    const breadcrumbOrdersLabel = resolveText('breadcrumb.orders', 'Đơn hàng');
    const placedAtLabel = resolveText('meta.placedAt', 'Đặt lúc {{date}}', { date: fmt(order?.createdAt) });
    const orderCodeLabel = resolveText('labels.orderCode', 'Mã vận đơn');
    const productsSectionLabel = resolveText('sections.products', 'Sản phẩm ({{count}})', { count: order?.items.length ?? 0 });
    const unitPriceLabel = resolveText('labels.unitPrice', 'Đơn giá');
    const orderTotalLabel = resolveText('labels.orderTotal', 'Tổng đơn');
    const orderNoteLabel = resolveText('labels.orderNote', 'Ghi chú đơn hàng');
    const paymentDetailsSectionLabel = resolveText('sections.paymentDetails', 'Chi tiết thanh toán');
    const customerSectionLabel = resolveText('sections.customer', 'Khách hàng');
    const guestCustomerLabel = resolveText('labels.guestCustomer', 'Khách vãng lai');
    const shippingAddressSectionLabel = resolveText('sections.shippingAddress', 'Địa chỉ giao hàng');
    const paymentSectionLabel = resolveText('sections.payment', 'Thanh toán');
    const paymentMethodLabel = resolveText('payment.method', 'Phương thức');
    const paymentStatusLabel = resolveText('payment.status', 'Trạng thái');
    const statusHistorySectionLabel = resolveText('sections.statusHistory', 'Lịch sử trạng thái');
    const deliveryProofSectionLabel = resolveText('sections.deliveryProof', 'Bằng chứng giao hàng');
    const deliveryProofReviewedLabel = resolveText('deliveryProof.reviewed', 'Đã duyệt bằng chứng');
    const deliveryProofUnreviewedLabel = resolveText('deliveryProof.unreviewed', 'Chưa duyệt bằng chứng');
    const deliveryProofLightboxLabel = resolveText('deliveryProof.lightboxLabel', 'Xem bằng chứng giao hàng');
    const deliveryProofOpenOriginalLabel = resolveText('deliveryProof.openOriginal', 'Mở ảnh gốc');
    const refundRequestedToastLabel = resolveText('toast.refundRequested', 'Đã tạo yêu cầu hoàn tiền');

    useEffect(() => {
        if (activeDeliveryProofImage) {
            const frameId = window.requestAnimationFrame(() => setIsDeliveryProofLightboxVisible(true));
            return () => window.cancelAnimationFrame(frameId);
        }

        setIsDeliveryProofLightboxVisible(false);
        return undefined;
    }, [activeDeliveryProofImage]);

    // ── Loading ─────────────────────────────────────────────────────────────

    if (loading) return (
        <AdminPageShell className="justify-center">
            <div className="flex flex-col items-center gap-5">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-white/[0.05]" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-l-transparent border-r-transparent border-b-transparent animate-spin" />
                </div>
                <p className="text-sm text-white/40 font-medium">{loadingLabel}</p>
            </div>
        </AdminPageShell>
    );

    if (error || !order) return (
        <AdminPageShell className="justify-center">
            <div className="text-center flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                    <p className="text-base font-bold text-white mb-1">{notFoundTitleLabel}</p>
                    <p className="text-sm text-white/50">{error}</p>
                </div>
                <button onClick={() => navigate('/admin/orders')} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline cursor-pointer">
                    {backToListLabel}
                </button>
            </div>
        </AdminPageShell>
    );

    return (
        <>
            <AdminPageShell>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <AdminSecondaryButton type="button" onClick={() => navigate('/admin/orders')}>
                            <ArrowLeft size={15} />
                            {backToListLabel}
                        </AdminSecondaryButton>
                        <StatusPill status={status} />
                        {paymentMeta.isPaidLike && (
                            <AdminSecondaryButton
                                type="button"
                                onClick={() => setShowRefundDialog(true)}
                                className="border-cyan-500/25 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500/35 hover:bg-cyan-500/18 hover:text-cyan-200"
                            >
                                <RotateCcw size={14} />
                                {refundLabel}
                            </AdminSecondaryButton>
                        )}
                        <OrderActionPanel
                            orderId={order.orderId}
                            currentStatus={status}
                            onStatusUpdated={loadOrder}
                            onError={(msg) => showToast(msg, 'error')}
                        />
                    </div>

                    <AdminSectionCard bodyClassName="p-5 lg:p-6">
                        <AdminPageHeader
                            icon={Package}
                            eyebrow={breadcrumbOrdersLabel}
                            title={(
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-mono">{order.orderNumber}</span>
                                    <CopyButton text={order.orderNumber} copiedLabel={copiedLabel} copyLabel={copyLabel} />
                                </div>
                            )}
                            subtitle={placedAtLabel}
                            meta={order.trackingCode ? `${orderCodeLabel}: ${order.trackingCode}` : undefined}
                        />
                    </AdminSectionCard>
                </div>

                <div className="space-y-6">
                    {/* Order metadata row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-white/35 font-mono">
                        <span>{placedAtLabel}</span>
                        {order.trackingCode && (
                            <>
                                <span className="text-white/15">·</span>
                                <span>{orderCodeLabel}: <span className="text-white/60">{order.trackingCode}</span></span>
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
                                <SectionTitle icon={ShoppingBag} title={productsSectionLabel} />

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
                                                    {unitPriceLabel}: {formatVND(item.unitPrice)}
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
                                        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">{orderTotalLabel}</span>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white tracking-tight">{formatVND(order.totalAmount)}</p>
                                            <p className={`text-[11px] font-semibold mt-0.5 ${paymentMeta.textClass}`}>
                                                {enumsT(paymentMeta.labelKey, { defaultValue: paymentMeta.defaultLabel })}
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
                                            <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest mb-1.5">{orderNoteLabel}</p>
                                            <p className="text-sm text-white/70 leading-relaxed">{order.note}</p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* ── Payment details ────────────────────────────────────── */}
                            {order.payments && order.payments.length > 0 && (
                                <Card>
                                    <SectionTitle icon={CreditCard} title={paymentDetailsSectionLabel} />
                                    <div className="p-5 space-y-3">
                                        {order.payments.map((p) => {
                                            return (
                                                <div key={p.paymentId} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-none">
                                                    <div>
                                                        <p className="text-sm text-white/80 font-medium">
                                                            <PaymentMethodLabel paymentMethod={p.method} />
                                                        </p>
                                                        {p.paidAt && <p className="text-[11px] text-white/35 font-mono mt-0.5">{fmt(p.paidAt)}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-white">{formatVND(p.amount)}</p>
                                                        <PaymentStatusBadge paymentMethod={p.method} paymentStatus={p.status} size="xs" uppercase className="tracking-wide" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* ══ RIGHT COLUMN ═══════════════════════════════════════════════ */}
                        <div className="space-y-4">

                            {/* ── Customer card ─────────────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={User} title={customerSectionLabel} />
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
                                            <p className="text-[11px] text-white/35 mt-0.5">{guestCustomerLabel}</p>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* ── Shipping address card ─────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={MapPin} title={shippingAddressSectionLabel} />
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
                                    {order.trackingCode && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <Truck size={12} className="text-cyan-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-white/35 uppercase tracking-wider">{orderCodeLabel}</p>
                                                <p className="text-[12px] text-cyan-400 font-mono font-semibold">{order.trackingCode}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* ── Payment summary card ──────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={CreditCard} title={paymentSectionLabel} />
                                <div className="p-5 space-y-3">
                                    {[
                                        {
                                            label: paymentMethodLabel,
                                            value: <PaymentMethodLabel paymentMethod={order.paymentMethod ?? 'COD'} />,
                                        },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-[12px] text-white/40">{label}</span>
                                            <span className="text-[12px] font-semibold text-white">{value}</span>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                                        <span className="text-[12px] text-white/40">{paymentStatusLabel}</span>
                                        <PaymentStatusBadge paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus} size="xs" />
                                    </div>
                                </div>
                            </Card>

                            {/* ── Status Timeline ───────────────────────────────────── */}
                            <Card>
                                <SectionTitle icon={Clock} title={statusHistorySectionLabel} />
                                <OrderTimeline history={statusHistory} />
                            </Card>

                            {order.deliveryProof && deliveryProofImages.length > 0 && (
                                <Card>
                                    <SectionTitle icon={Truck} title={deliveryProofSectionLabel} />
                                    <div className="p-5 space-y-4">
                                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${order.deliveryProof.reviewed
                                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                                            : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                                            }`}>
                                            <Check size={14} />
                                            {order.deliveryProof.reviewed ? deliveryProofReviewedLabel : deliveryProofUnreviewedLabel}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {deliveryProofImages.map((imageUrl, index) => (
                                                <button
                                                    key={`${imageUrl}-${index}`}
                                                    type="button"
                                                    onClick={() => setDeliveryProofLightboxIndex(index)}
                                                    className="group relative block rounded-xl overflow-hidden border border-white/10 bg-black/20 hover:border-white/20 transition-colors cursor-pointer"
                                                >
                                                    <img
                                                        src={getImageUrl(imageUrl)}
                                                        alt={resolveText('deliveryProof.imageAlt', 'Ảnh giao hàng {{index}}', { index: index + 1 })}
                                                        loading="lazy"
                                                        className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent text-[11px] text-white/80 text-left">
                                                        {resolveText('deliveryProof.imageButton', 'Xem ảnh {{index}}', { index: index + 1 })}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* ── Financial History ──────────────────────────────────── */}
                            <OrderFinancials refunds={refunds} loading={refundsLoading} />
                        </div>
                    </div>
                </div>
            </AdminPageShell>

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
                            showToast(refundRequestedToastLabel, 'success');
                            loadOrder();
                        }}
                    />
                )
            }

            {activeDeliveryProofImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={deliveryProofLightboxLabel}
                    className={`fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 px-4 py-8 transition-all duration-200 ease-out ${
                        isDeliveryProofLightboxVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setDeliveryProofLightboxIndex(null)}
                >
                    <button
                        type="button"
                        className="absolute top-5 right-5 w-11 h-11 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                        onClick={() => setDeliveryProofLightboxIndex(null)}
                    >
                        <X size={18} className="mx-auto" />
                    </button>

                    {deliveryProofImages.length > 1 && (
                        <button
                            type="button"
                            className="absolute left-4 md:left-6 w-11 h-11 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDeliveryProofLightboxIndex((current) => {
                                    if (current === null) return 0;
                                    return current === 0 ? deliveryProofImages.length - 1 : current - 1;
                                });
                            }}
                        >
                            <ChevronLeft size={18} className="mx-auto" />
                        </button>
                    )}

                    <div
                        className={`flex max-h-[88vh] max-w-[92vw] flex-col gap-3 rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-4 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
                            isDeliveryProofLightboxVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                        }`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img
                            src={getImageUrl(activeDeliveryProofImage)}
                            alt={resolveText('deliveryProof.previewAlt', 'Xem trước ảnh giao hàng {{index}}', {
                                index: deliveryProofLightboxIndex !== null ? deliveryProofLightboxIndex + 1 : 1,
                            })}
                            className="max-w-[92vw] max-h-[78vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="flex items-center justify-between text-sm text-white/70">
                            <span>
                                {resolveText('deliveryProof.imageCounter', '{{current}} / {{total}}', {
                                    current: deliveryProofLightboxIndex !== null ? deliveryProofLightboxIndex + 1 : 1,
                                    total: deliveryProofImages.length,
                                })}
                            </span>
                            <a
                                href={getImageUrl(activeDeliveryProofImage)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:text-primary/80 transition-colors"
                            >
                                {deliveryProofOpenOriginalLabel}
                            </a>
                        </div>
                    </div>

                    {deliveryProofImages.length > 1 && (
                        <button
                            type="button"
                            className="absolute right-4 md:right-6 w-11 h-11 rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                            onClick={(event) => {
                                event.stopPropagation();
                                setDeliveryProofLightboxIndex((current) => {
                                    if (current === null) return 0;
                                    return current === deliveryProofImages.length - 1 ? 0 : current + 1;
                                });
                            }}
                        >
                            <ChevronRight size={18} className="mx-auto" />
                        </button>
                    )}
                </div>
            )}
        </>
    );
};




