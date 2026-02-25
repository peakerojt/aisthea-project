import React, { useEffect, useMemo, useState } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { CategoryType, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { orderService, OrderDetail } from '../services/order.service';

interface StoreOrderDetailProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
  orderId: number;
}

const formatMoneyVND = (value: string | number | null | undefined) => {
  const n = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(n)) return String(value ?? '');
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
};

const translateStatus = (status?: string | null) => {
  const s = (status || '').toLowerCase();
  if (s === 'pending') return 'Chờ xác nhận';
  if (s === 'processing') return 'Đang xử lý';
  if (['shipping', 'shipped', 'delivering'].includes(s)) return 'Đang giao';
  if (s === 'delivered') return 'Đã giao';
  if (['cancelled', 'canceled'].includes(s)) return 'Đã hủy';
  return status || 'Không xác định';
};

const translatePaymentStatus = (status?: string | null) => {
  const s = (status || '').toLowerCase();
  if (s === 'unpaid') return 'Chưa thanh toán';
  if (s === 'pending') return 'Chờ thanh toán';
  if (s === 'paid') return 'Đã thanh toán';
  if (s === 'failed') return 'Thanh toán lỗi';
  if (s === 'refunded') return 'Đã hoàn tiền';
  return status || 'N/A';
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
};

const statusTone = (status?: string | null) => {
  const s = (status || '').toLowerCase();
  if (['delivered', 'success', 'paid', 'completed'].includes(s)) return 'border-emerald-500/30 text-emerald-200 bg-emerald-500/10';
  if (['shipping', 'shipped', 'delivering'].includes(s)) return 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10';
  if (['pending', 'processing'].includes(s)) return 'border-amber-500/30 text-amber-200 bg-amber-500/10';
  if (['cancelled', 'canceled', 'failed', 'error'].includes(s)) return 'border-red-500/30 text-red-200 bg-red-500/10';
  return 'border-white/10 text-white/70 bg-white/5';
};

export const StoreOrderDetail: React.FC<StoreOrderDetailProps> = ({ setView, setCategory, orderId }) => {
  const { role } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const primaryAction = useMemo(() => {
    if (!detail) return null;

    const status = detail.status || 'Pending';
    const paymentStatus = detail.paymentStatus || 'Unpaid';
    const canPay = Boolean(detail.actionsAvailable?.canPay);
    const canTrack = Boolean(detail.actionsAvailable?.canTrack);
    const canCancel = Boolean(detail.actionsAvailable?.canCancel);
    const canReorder = Boolean(detail.actionsAvailable?.canReorder);

    if (canPay) {
      return { type: 'pay' as const, label: 'Thanh toán ngay', icon: 'payments', hint: `Trạng thái: ${translatePaymentStatus(paymentStatus)}` };
    }
    if (canTrack) {
      return { type: 'track' as const, label: 'Theo dõi vận chuyển', icon: 'local_shipping', hint: detail.trackingNumber ? `#${detail.trackingNumber}` : 'Đang cập nhật mã' };
    }
    if (canCancel) {
      return { type: 'cancel' as const, label: 'Hủy đơn hàng', icon: 'close', hint: 'Bạn có thể hủy đơn trước khi giao' };
    }
    if (canReorder || status === 'Delivered' || status === 'Canceled' || status === 'Cancelled') {
      return { type: 'reorder' as const, label: 'Mua lại', icon: 'shopping_cart', hint: 'Đặt lại các sản phẩm này' };
    }

    return { type: 'support' as const, label: 'Liên hệ hỗ trợ', icon: 'support_agent', hint: 'Bạn cần giúp đỡ?' };
  }, [detail]);

  const handleAction = async () => {
    if (!detail || !primaryAction) return;

    if (primaryAction.type === 'cancel') {
      if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;

      setIsActionLoading(true);
      setError(null);
      try {
        await orderService.cancelMyOrder(orderId);
        setToast({ type: 'success', message: 'Hủy đơn hàng thành công.' });
        await load(); 
      } catch (e: any) {
        setError(e?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại sau.');
      } finally {
        setIsActionLoading(false);
      }
    } else if (primaryAction.type === 'track') {
      if (detail.trackingNumber) {
        window.open(`https://www.google.com/search?q=${detail.carrier}+${detail.trackingNumber}`, '_blank');
      }
    } else if (primaryAction.type === 'pay') {
      setToast({ type: 'info', message: 'Đang chuyển hướng đến cổng thanh toán...' });
    } else if (primaryAction.type === 'reorder') {
      setView('STORE_HOME');
    }
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    setDetail(null);
    try {
      const res = await orderService.getMyOrderDetail(orderId);
      setDetail(res);
    } catch (e: any) {
      if (e?.message?.includes('401')) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError(e?.message || 'Không thể tải chi tiết đơn hàng');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'guest') {
      setView('AUTH_LOGIN');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, orderId]);

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={setView} setCategory={setCategory} />

      <div className="pt-32 px-6 md:px-12 max-w-6xl mx-auto pb-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Chi tiết đơn hàng</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">Tất cả thông tin đơn hàng của bạn ở một nơi</p>
          </div>
          <button
            onClick={() => setView('STORE_MY_ORDERS')}
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Quay lại
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-4 w-32 bg-white/5 rounded" />
              </div>
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-24 bg-white/5 rounded" />
              </div>
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-40 bg-white/5 rounded" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6 h-48" />
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6 h-32" />
            </div>
          </div>
        ) : detail ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main */}
            <div className="lg:col-span-8 space-y-6">
              {/* Summary */}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm text-white">#{detail.orderNumber}</span>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${statusTone(detail.status)}`}>{translateStatus(detail.status)}</span>
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${statusTone(detail.paymentStatus)}`}>{translatePaymentStatus(detail.paymentStatus)}</span>
                    </div>
                    <div className="mt-2 text-xs text-white/40 uppercase tracking-widest">Ngày đặt</div>
                    <div className="mt-1 text-sm text-white/70">{formatDateTime(detail.createdAt)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-white/40 uppercase tracking-widest">Tổng tiền</div>
                    <div className="mt-1 text-2xl font-black">{formatMoneyVND(detail.totalAmount)}</div>
                    <div className="mt-1 text-xs text-white/40">{detail.paymentMethod ? `Phương thức: ${detail.paymentMethod}` : ''}</div>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40">Giao hàng</div>
                    <div className="mt-2 text-sm text-white">
                      <div className="font-semibold">{detail.shippingAddress?.recipientName}</div>
                      <div className="text-white/70 mt-1">{detail.shippingAddress?.phone}</div>
                      <div className="text-white/70 mt-2">
                        {detail.shippingAddress?.addressDetail}
                      </div>
                      <div className="text-white/70 mt-1">
                        {detail.shippingAddress?.ward ? `${detail.shippingAddress.ward}, ` : ''}
                        {detail.shippingAddress?.district ? `${detail.shippingAddress.district}, ` : ''}
                        {detail.shippingAddress?.city}
                      </div>
                    </div>
                  </div>

                  {(detail.carrier || detail.trackingNumber) && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">Vận chuyển</div>
                      <div className="mt-2 text-sm text-white/70">
                        <div className="text-white font-semibold">{detail.carrier || 'Đơn vị vận chuyển'}</div>
                        <div className="mt-1 font-mono text-xs text-white/70">{detail.trackingNumber || 'Đang cập nhật...'}</div>
                      </div>
                      {detail.trackingNumber && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(detail.trackingNumber || '');
                              setToast({ type: 'success', message: 'Đã sao chép mã vận đơn vào bộ nhớ tạm.' });
                            } catch {
                              setToast({ type: 'error', message: 'Không thể sao chép mã vận đơn.' });
                            }
                          }}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-2 rounded border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                          Sao chép
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Sản phẩm</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{detail.items.length} món</div>
                </div>

                <div className="mt-4 space-y-3">
                  {detail.items.map((it) => (
                    <div key={it.orderItemId} className="p-4 bg-black/20 border border-white/10 rounded flex gap-4">
                      <div className="h-16 w-16 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0">
                        {/* thumbnailUrl may be missing in old orders */}
                        {(it as any).thumbnailUrl ? (
                          <img src={(it as any).thumbnailUrl} alt={it.productName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white/20">
                            <span className="material-symbols-outlined">image</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{it.productName}</div>
                        <div className="text-xs text-white/50 mt-1">{it.variantName}</div>
                        <div className="text-xs text-white/40 font-mono mt-1">SKU: {it.sku}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-white/60">{it.quantity} × {formatMoneyVND(it.unitPrice)}</div>
                        <div className="text-white font-semibold mt-1">{formatMoneyVND(it.lineTotal)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Thanh toán</div>

                {detail.payments && detail.payments.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {detail.payments.map((p) => (
                      <div key={p.paymentId} className="p-4 bg-black/20 border border-white/10 rounded flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-white font-semibold">{p.paymentMethod}</div>
                          <div className="text-xs text-white/40 mt-1">{formatDateTime(p.paymentDate)}</div>
                          {p.transactionCode && <div className="text-xs text-white/40 font-mono mt-1">Mã GD: {p.transactionCode}</div>}
                          {p.note && <div className="text-xs text-white/50 mt-1">{p.note}</div>}
                        </div>
                        <div className="text-right">
                          <div className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border inline-block ${statusTone(p.status)}`}>{translatePaymentStatus(p.status)}</div>
                          <div className="text-sm text-white font-semibold mt-2">{formatMoneyVND(p.amount)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-white/50">Chưa có lịch sử thanh toán.</div>
                )}
              </div>
            </div>

            {/* Side */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Hành động</div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl text-white/70">{primaryAction?.icon || 'task_alt'}</span>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-white">{primaryAction?.label || '—'}</div>
                    <div className="text-xs text-white/40 mt-1 truncate">{primaryAction?.hint || ''}</div>
                  </div>
                </div>

                <button
                  disabled={isActionLoading}
                  className={`mt-4 w-full px-4 py-3 border text-xs font-bold uppercase tracking-widest transition-colors ${
                    isActionLoading 
                      ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-primary/15 hover:bg-primary/25 border-primary/30 text-primary'
                  }`}
                  onClick={handleAction}
                >
                  {isActionLoading ? 'Đang xử lý...' : (primaryAction?.label || 'Hành động')}
                </button>

                {detail.actionsAvailable?.canTrack && detail.trackingNumber && (
                  <div className="mt-3 text-xs text-white/40">
                    Mẹo: sao chép mã vận đơn và dán vào trang tra cứu của đơn vị vận chuyển.
                  </div>
                )}
              </div>

              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Cần hỗ trợ?</div>
                <div className="mt-3 text-sm text-white/70">
                  Nếu có vấn đề gì, hãy liên hệ với bộ phận hỗ trợ kèm mã đơn hàng của bạn.
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors">
                    Liên hệ hỗ trợ
                  </button>
                  <button
                    onClick={load}
                    className="px-4 py-3 bg-transparent hover:bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Tải lại đơn hàng
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Mobile CTA */}
            <div className="lg:hidden fixed left-0 right-0 bottom-0 p-4 bg-black/70 backdrop-blur border-t border-white/10 z-40">
              <button
                disabled={isActionLoading}
                className={`w-full px-4 py-4 border text-xs font-bold uppercase tracking-widest transition-colors ${
                  isActionLoading 
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-primary/15 hover:bg-primary/25 border-primary/30 text-primary'
                }`}
                onClick={handleAction}
              >
                {isActionLoading ? 'Đang xử lý...' : (primaryAction?.label || 'Hành động')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface-dark border border-white/5 rounded-sm p-6 text-sm text-white/50">
            Không có thông tin chi tiết.
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`p-4 rounded-lg shadow-2xl border flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
            toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
            'bg-surface-dark border-white/20 text-white'
          }`}>
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
            </span>
            <p className="text-sm font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
