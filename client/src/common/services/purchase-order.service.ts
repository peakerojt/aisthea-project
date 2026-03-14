import { purchaseOrderApi } from '@/common/api/purchase-order.api';

export type PurchaseOrderStatus = 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  purchaseOrderItemId: number;
  variantId: number;
  sku: string | null;
  productId: number | null;
  productName: string | null;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unitCost: number;
  lineTotal: number;
  currentStockQuantity: number | null;
}

export interface PurchaseOrder {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  supplier: string;
  expectedReceivedAt: string | null;
  invoiceNumber: string | null;
  supplierContactName: string | null;
  supplierPhone: string | null;
  supplierEmail: string | null;
  status: PurchaseOrderStatus;
  notes: string | null;
  orderedAt: string;
  receivedAt: string | null;
  updatedAt: string;
  createdBy: number | null;
  totals: {
    orderedQty: number;
    receivedQty: number;
    totalCost: number;
  };
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderListResponse {
  success: boolean;
  data: PurchaseOrder[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ListPurchaseOrderParams {
  page?: number;
  pageSize?: number;
  status?: PurchaseOrderStatus;
  search?: string;
}

export interface CreatePurchaseOrderPayload {
  supplier: string;
  expectedReceivedAt?: string | null;
  invoiceNumber?: string | null;
  supplierContactName?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  notes?: string | null;
  items: Array<{
    variantId: number;
    orderedQty: number;
    unitCost: number;
  }>;
}

export interface ReceivePurchaseOrderPayload {
  notes?: string | null;
  items: Array<{
    purchaseOrderItemId?: number;
    variantId?: number;
    quantity: number;
  }>;
}

export async function listPurchaseOrders(params: ListPurchaseOrderParams = {}): Promise<PurchaseOrderListResponse> {
  const query: Record<string, string> = {
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 50),
  };

  if (params.status) query.status = params.status;
  if (params.search && params.search.trim()) query.search = params.search.trim();

  return purchaseOrderApi.list(query);
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const res = await purchaseOrderApi.create(payload);
  return res.data;
}

export async function receivePurchaseOrder(
  purchaseOrderId: number,
  payload: ReceivePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const res = await purchaseOrderApi.receive(purchaseOrderId, payload);
  return res.data;
}

export async function cancelPurchaseOrder(purchaseOrderId: number, notes?: string): Promise<PurchaseOrder> {
  const res = await purchaseOrderApi.cancel(purchaseOrderId, notes);
  return res.data;
}

export async function getPurchaseOrderById(purchaseOrderId: number): Promise<PurchaseOrder> {
  const res = await purchaseOrderApi.getById(purchaseOrderId);
  return res.data;
}
