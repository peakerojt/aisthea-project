import { api } from '@/common/utils/api';
import {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  PurchaseOrderListResponse,
  ReceivePurchaseOrderPayload,
} from '@/common/services/purchase-order.service';

export const purchaseOrderApi = {
  list: (params: Record<string, string>) =>
    api.get<PurchaseOrderListResponse>('/api/purchase-orders', { params }),

  getById: (id: number) =>
    api.get<{ success: boolean; data: PurchaseOrder }>(`/api/purchase-orders/${id}`),

  create: (payload: CreatePurchaseOrderPayload) =>
    api.post<{ success: boolean; data: PurchaseOrder }>('/api/purchase-orders', payload),

  receive: (id: number, payload: ReceivePurchaseOrderPayload) =>
    api.patch<{ success: boolean; data: PurchaseOrder }>(`/api/purchase-orders/${id}/receive`, payload),

  cancel: (id: number, notes?: string) =>
    api.patch<{ success: boolean; data: PurchaseOrder }>(`/api/purchase-orders/${id}/cancel`, { notes }),
};
