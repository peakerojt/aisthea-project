const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const orderSvcPath = path.join(srcDir, 'common/services/order.service.ts');
const orderApiPath = path.join(srcDir, 'common/services/orderApi.ts');

const svcContent = fs.readFileSync(orderSvcPath, 'utf8');
const apiContent = fs.readFileSync(orderApiPath, 'utf8');

// The logic from orderApi.ts needs to be appended to order.service.ts
// We'll extract the types: OrderStatus, OrderTimelineItem, OrderPricing, ApiResponse, fetchOrderDetail, cancelOrder, confirmReceipt

const typesToExtract = `
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'canceled'
  | 'returned'
  | 'failed'
  | string;

export interface OrderTimelineItem {
  status: OrderStatus;
  at: string;
}

export interface OrderPricing {
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
}
`;

// Extract fetchOrderDetail from apiContent
const apiFuncs = apiContent.substring(apiContent.indexOf('export async function fetchOrderDetail'));

// We need to append these to orderSvcPath but modify the export name to be a part of orderService or leave them as exported functions for now
// Standardizing onto orderService

const newOrderServiceMethods = `
  async fetchOrderDetail(id: string): Promise<any> {
    const response = await orderApi.getMyOrderDetail<any>(id);
    const raw = response;
    return {
      ...raw,
      pricing: raw.pricing || {
        itemsTotal: parseFloat(raw.totalAmount ?? '0') + parseFloat(raw.discountAmount ?? '0'),
        shippingFee: 0,
        discount: parseFloat(raw.discountAmount ?? '0'),
        tax: 0,
        grandTotal: parseFloat(raw.totalAmount ?? '0'),
      },
      items: (raw.items ?? []).map((item: any) => ({
        ...item,
        variantId: item.variantId ?? null,
        productId: item.productId ?? null,
        thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? null,
        variantName: item.variantName ?? item.variant ?? '',
        price: parseFloat(item.unitPrice ?? item.price ?? '0'),
        subtotal: parseFloat(item.lineTotal ?? item.subtotal ?? '0'),
      })),
      timeline: raw.statusHistory?.map((h: any) => ({
        status: h.status,
        at: h.changedAt ?? h.at ?? new Date().toISOString(),
      })) || raw.timeline || [],
    };
  },

  async cancelOrderUser(id: string): Promise<any> {
    return orderApi.cancelOrder<any>(id);
  },

  async confirmReceipt(id: string): Promise<any> {
    return orderApi.confirmReceipt(id);
  },
`;

// Insert types at the top
let updatedSvc = svcContent.replace('export interface OrderItem {', typesToExtract + '\nexport interface OrderItem {');

// Insert new methods into orderService object
updatedSvc = updatedSvc.replace('export const orderService = {', 'export const orderService = {' + newOrderServiceMethods);

fs.writeFileSync(orderSvcPath, updatedSvc);
console.log('Appended orderApi.ts logic to order.service.ts');
