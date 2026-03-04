import { AppError } from '../../middlewares/error.middleware';
import { emitOrderStatusUpdated } from '../../socket';
import { canTransition } from '../../shared/orderTracking.constants';
import { prisma } from '../../utils/prisma';
import { trackingRepository } from './tracking.repository';

function maskPhone(phone: string) {
  if (phone.length < 4) return '***';
  return `${'*'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  const keep = name.slice(0, 2);
  return `${keep}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

function toTrackingPayload(order: any, isPublic = false) {
  return {
    orderId: order.orderId,
    orderCode: order.orderCode,
    currentStatus: order.status,
    eta: order.shipment?.eta ?? null,
    shipment: order.shipment
      ? {
          carrier: order.shipment.carrier,
          trackingNumber: isPublic ? null : order.shipment.trackingNumber,
          lastKnownLocation: order.shipment.lastKnownLocation,
        }
      : null,
    contact: isPublic
      ? {
          customerPhone: order.customerPhone ? maskPhone(order.customerPhone) : null,
          customerEmail: order.customerEmail ? maskEmail(order.customerEmail) : null,
        }
      : {
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
        },
    items: order.items.map((item: any) => ({
      orderItemId: item.orderItemId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    timeline: order.statusHistory.map((history: any) => ({
      status: history.status,
      timestamp: history.changedAt,
      note: history.note,
      updatedBy: isPublic ? null : history.changedBy,
    })),
  };
}

export const trackingService = {
  async getPublicTracking(orderCode: string, contact: string) {
    const order = await trackingRepository.findOrderByCodeAndContact(orderCode, contact);
    if (!order) {
      throw new AppError(404, 'TRACKING_NOT_FOUND', 'Không tìm thấy đơn hàng với thông tin cung cấp.');
    }
    return toTrackingPayload(order, true);
  },

  async getMyOrders(userId: number) {
    return trackingRepository.findMyOrders(userId);
  },

  async getOrderTrackingById(orderId: number, requester: { userId: number; isAdmin: boolean }) {
    const order = await trackingRepository.findOrderTrackingById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    if (!requester.isAdmin && order.userId !== requester.userId) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem đơn này');
    }

    return toTrackingPayload(order, false);
  },

  async updateOrderStatus(
    orderId: number,
    payload: { status: string; note?: string; eta?: string; location?: string },
    updatedBy: number,
  ) {
    const order = await trackingRepository.findOrderTrackingById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const currentStatus = order.status || 'PENDING';
    if (!canTransition(currentStatus, payload.status)) {
      throw new AppError(400, 'INVALID_STATUS_TRANSITION', 'Invalid status transition', {
        from: currentStatus,
        to: payload.status,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { orderId },
        data: { status: payload.status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: currentStatus,
          status: payload.status,
          note: payload.note,
          changedBy: updatedBy,
        },
      });

      if (payload.eta || payload.location) {
        await tx.shipment.upsert({
          where: { orderId },
          update: {
            eta: payload.eta ? new Date(payload.eta) : undefined,
            lastKnownLocation: payload.location,
          },
          create: {
            orderId,
            eta: payload.eta ? new Date(payload.eta) : undefined,
            lastKnownLocation: payload.location,
            carrier: order.carrier,
            trackingNumber: order.trackingNumber,
          },
        });
      }

      return updated;
    });

    const latest = await trackingRepository.findOrderTrackingById(orderId);
    const timeline = latest?.statusHistory.map((h: any) => ({
      status: h.status,
      timestamp: h.changedAt,
      note: h.note,
      updatedBy: h.changedBy,
    })) || [];

    emitOrderStatusUpdated({
      orderId,
      userId: latest?.userId,
      status: result.status || payload.status,
      timeline,
    });

    return latest;
  },
};
