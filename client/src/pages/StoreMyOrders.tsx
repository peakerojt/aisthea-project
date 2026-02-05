import React, { useEffect, useMemo, useState } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { CategoryType, ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { orderService, Order, OrderDetail } from '../services/order.service';

interface StoreMyOrdersProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
}

export const StoreMyOrders: React.FC<StoreMyOrdersProps> = ({ setView, setCategory }) => {
  const { role } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('');

  const statusTabs = useMemo(
    () => [
      { label: 'All', value: '' },
      { label: 'Pending', value: 'Pending' },
      { label: 'Shipping', value: 'Shipping' },
      { label: 'Delivered', value: 'Delivered' },
      { label: 'Cancelled', value: 'Cancelled' }
    ],
    []
  );

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders({ status: statusFilter || undefined, page: 1, pageSize: 20, sort: 'createdAt_desc' });
      setOrders(res.orders || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'guest') {
      setView('AUTH_LOGIN');
      return;
    }
    loadOrders();
  }, [role, statusFilter]);

  const openOrderDetail = async (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailLoading(true);
    setSelectedOrderDetail(null);
    setError(null);
    try {
      const detail = await orderService.getMyOrderDetail(orderId);
      setSelectedOrderDetail(detail);
    } catch (e: any) {
      setError(e?.message || 'Failed to load order detail');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedOrderId(null);
    setSelectedOrderDetail(null);
    setIsDetailLoading(false);
  };

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={setView} setCategory={setCategory} />

      <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">My Orders</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">View your order history and details</p>
          </div>
          <button
            onClick={() => setView('STORE_PROFILE')}
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Back to Account
          </button>
        </div>

        <div className="bg-surface-dark border border-white/5 rounded-sm overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex gap-2 overflow-x-auto">
            {statusTabs.map((t) => (
              <button
                key={t.label}
                onClick={() => setStatusFilter(t.value)}
                className={`text-xs font-bold uppercase tracking-widest px-3 py-2 rounded border transition-colors whitespace-nowrap ${
                  statusFilter === t.value
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={loadOrders}
              className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-sm text-white/50">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-black/20 rounded p-10 text-center border border-white/5">
                <span className="material-symbols-outlined text-5xl text-white/20 mb-2">receipt_long</span>
                <p className="text-gray-500 text-sm">No orders found.</p>
                <button
                  onClick={() => setView('STORE_COLLECTION')}
                  className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.orderId} className="p-5 border border-white/10 bg-black/20 rounded-sm flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm text-white">#{o.orderNumber}</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</span>
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-white/70">{o.status || 'Unknown'}</span>
                        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 text-white/50">{o.paymentStatus || 'N/A'}</span>
                      </div>
                      <div className="mt-2 text-sm text-white/70">
                        Total: <span className="text-white font-semibold">{o.totalAmount}</span>
                        <span className="text-white/30 mx-2">•</span>
                        Items: <span className="text-white font-semibold">{o.itemCount}</span>
                      </div>
                      {(o.trackingNumber || o.carrier) && (
                        <div className="mt-2 text-xs text-white/40">
                          {o.carrier ? `${o.carrier}` : 'Carrier'} {o.trackingNumber ? `• ${o.trackingNumber}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openOrderDetail(o.orderId)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-surface-dark border border-white/10 rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">Order Detail</h3>
                <p className="text-sm text-white/40 mt-1">Order ID: {selectedOrderId}</p>
              </div>
              <button onClick={closeModal} className="text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isDetailLoading ? (
                <div className="text-sm text-white/50">Loading detail...</div>
              ) : selectedOrderDetail ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-black/20 border border-white/10 rounded">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">Order</div>
                      <div className="mt-2 text-sm">
                        <div className="font-mono text-white">#{selectedOrderDetail.orderNumber}</div>
                        <div className="text-white/70 mt-1">Status: <span className="text-white">{selectedOrderDetail.status}</span></div>
                        <div className="text-white/70 mt-1">Payment: <span className="text-white">{selectedOrderDetail.paymentStatus}</span></div>
                        <div className="text-white/70 mt-1">Total: <span className="text-white font-semibold">{selectedOrderDetail.totalAmount}</span></div>
                      </div>
                    </div>

                    <div className="p-4 bg-black/20 border border-white/10 rounded">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">Shipping</div>
                      <div className="mt-2 text-sm text-white/70">
                        <div className="text-white font-semibold">{selectedOrderDetail.shippingAddress?.recipientName}</div>
                        <div className="mt-1">{selectedOrderDetail.shippingAddress?.phone}</div>
                        <div className="mt-1">
                          {selectedOrderDetail.shippingAddress?.addressDetail}
                        </div>
                        <div className="mt-1">
                          {selectedOrderDetail.shippingAddress?.district ? `${selectedOrderDetail.shippingAddress.district}, ` : ''}
                          {selectedOrderDetail.shippingAddress?.city}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Items</div>
                    <div className="space-y-3">
                      {selectedOrderDetail.items.map((it) => (
                        <div key={it.orderItemId} className="p-4 bg-black/20 border border-white/10 rounded flex justify-between gap-4">
                          <div>
                            <div className="text-white font-medium">{it.productName}</div>
                            <div className="text-xs text-white/40 font-mono mt-1">SKU: {it.sku}</div>
                            <div className="text-xs text-white/50 mt-1">{it.variantName}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-white/70">{it.quantity} x {it.unitPrice}</div>
                            <div className="text-white font-semibold mt-1">{it.lineTotal}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-white/50">No detail available.</div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
