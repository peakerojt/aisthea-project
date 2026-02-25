import { prisma } from '../../utils/prisma';

// ─── Sub-types (manual, based on Prisma schema) ───────────────────────────────

export interface OrderProductImage {
  imageId: number;
  productId: number;
  variantId: number | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  isPrimary: boolean | null;
}

export interface OrderProductVariant {
  variantId: number;
  productId: number;
  sku: string;
  images: OrderProductImage[];
  product: {
    productId: number;
    name: string;
  } | null;
}

export interface OrderItem {
  orderItemId: number;
  orderId: number;
  variantId: number | null;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: { toNumber(): number } | number;
  quantity: number;
  variant: OrderProductVariant | null;
}

export interface OrderStatusHistoryEntry {
  orderStatusHistoryId: number;
  orderId: number;
  status: string;
  changedAt: Date;
}

export interface OrderUser {
  userId: number;
  email: string;
  fullName: string;
  phone: string | null;
}

// ─── Main type ────────────────────────────────────────────────────────────────

export interface OrderWithRelations {
  orderId: number;
  userId: number | null;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string | null;
  shippingAddressDetail: string;
  trackingNumber: string | null;
  carrier: string | null;
  totalAmount: { toNumber(): number } | number;
  status: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  createdAt: Date | null;
  note: string | null;
  items: OrderItem[];
  user: OrderUser | null;
  payments: unknown[];
  statusHistory: OrderStatusHistoryEntry[];
}

// ─── Repository functions ─────────────────────────────────────────────────────

const orderInclude = {
  user: true,
  items: {
    include: {
      variant: {
        include: {
          images: true,
          product: true,
        },
      },
    },
  },
  payments: true,
  statusHistory: true,
} as const;

export async function findOrderByIdWithRelations(orderId: number): Promise<OrderWithRelations | null> {
  const result = await prisma.order.findUnique({
    where: { orderId },
    include: orderInclude,
  });
  return result as OrderWithRelations | null;
}

export async function appendOrderStatusHistory(orderId: number, status: string, changedAt?: Date) {
  return prisma.orderStatusHistory.create({
    data: {
      orderId,
      status,
      changedAt: changedAt ?? new Date(),
    },
  });
}

export async function updateOrderStatus(orderId: number, status: string): Promise<OrderWithRelations> {
  const result = await prisma.order.update({
    where: { orderId },
    data: { status },
    include: orderInclude,
  });
  return result as OrderWithRelations;
}
