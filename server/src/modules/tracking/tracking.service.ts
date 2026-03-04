import { AppError } from '../../middlewares/error.middleware';
import { emitOrderStatusUpdated } from '../../socket';
import { canTransition } from '../../shared/orderTracking.constants';
import { prisma } from '../../utils/prisma';
import { trackingRepository } from './tracking.repository';
import { UpdateOrderStatusInput } from './tracking.validator';

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

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'PENDING';
  return status.toUpperCase();
}

function hydrateTimeline(order: any, isPublic = false) {
  const mapped = (order.statusHistory || []).map((history: any) => {
    const status = normalizeStatus(history.status);
    return {
      status,
      statusLabelKey: `tracking:status.${status}`,
      timestamp: history.changedAt,
      note: history.note,
      location: (history as any).location ?? null,
      description: (history as any).description ?? null,
      updatedBy: isPublic ? null : history.changedBy,
    };
  });

  // Synthesize initial PENDING entry if missing
  if (mapped.length === 0 || !mapped.some((h: any) => h.status === 'PENDING')) {
    mapped.unshift({
      status: 'PENDING',
      statusLabelKey: 'tracking:status.PENDING',
      timestamp: order.createdAt || new Date(),
      note: 'Đơn hàng đã được đặt',
      location: null,
      description: null,
      updatedBy: null,
    });
  }

  // Chronological order
  return mapped.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function toTrackingPayload(order: any, isPublic = false) {
  const currentStatus = normalizeStatus(order.status);

  return {
    orderId: order.orderId,
    orderCode: order.orderCode || order.orderNumber,
    currentStatus,
    currentStatusLabelKey: `tracking:status.${currentStatus}`,
    // Top-level logistics fields (from Order model)
    carrier: order.carrier ?? order.shipment?.carrier ?? null,
    trackingNumber: isPublic ? null : (order.trackingNumber ?? order.shipment?.trackingNumber ?? null),
    estimatedDeliveryDate: order.shipment?.eta ?? null,
    // Shipment sub-object
    shipment: order.shipment
      ? {
        carrier: order.shipment.carrier ?? order.carrier ?? null,
        trackingNumber: isPublic ? null : (order.shipment.trackingNumber ?? order.trackingNumber ?? null),
        lastKnownLocation: order.shipment.lastKnownLocation,
        eta: order.shipment.eta,
      }
      : null,
    // Masked contact for public mode
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
    timeline: hydrateTimeline(order, isPublic),
  };
}

export const trackingService = {
  async getPublicTracking(orderCode: string, contact: string) {
    const order = await trackingRepository.findOrderByCodeAndContact(orderCode, contact);
    if (!order) {
      throw new AppError(404, 'TRACKING_NOT_FOUND', 'tracking:errors.notFound');
    }
    return toTrackingPayload(order, true);
  },

  async getMyOrders(userId: number) {
    return trackingRepository.findMyOrders(userId);
  },

  async getOrderTrackingById(orderId: number, requester: { userId: number; isAdmin: boolean }) {
    const order = await trackingRepository.findOrderTrackingById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'tracking:errors.orderNotFound');
    }

    if (!requester.isAdmin && order.userId !== requester.userId) {
      throw new AppError(403, 'FORBIDDEN', 'tracking:errors.forbidden');
    }

    return toTrackingPayload(order, false);
  },

  async updateOrderStatus(
    orderId: number,
    payload: UpdateOrderStatusInput,
    updatedBy: number,
  ) {
    const order = await trackingRepository.findOrderTrackingById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'tracking:errors.orderNotFound');
    }

    const currentStatus = normalizeStatus(order.status);
    if (!canTransition(currentStatus, payload.status)) {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        'tracking:errors.invalidStatusTransition',
        { from: currentStatus, to: payload.status },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order status + logistics fields (carrier, trackingNumber, estimatedDeliveryDate)
      const orderUpdateData: Record<string, any> = { status: payload.status };
      if (payload.carrier) orderUpdateData.carrier = payload.carrier;
      if (payload.trackingNumber) orderUpdateData.trackingNumber = payload.trackingNumber;

      const updated = await tx.order.update({
        where: { orderId },
        data: orderUpdateData,
      });

      // 2. Create history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: currentStatus,
          status: payload.status,
          note: payload.note,
          changedBy: updatedBy,
        },
      });

      // 3. Upsert Shipment if any logistics data is provided
      if (payload.eta || payload.location || payload.carrier || payload.trackingNumber || payload.estimatedDeliveryDate) {
        await tx.shipment.upsert({
          where: { orderId },
          update: {
            eta: payload.estimatedDeliveryDate
              ? new Date(payload.estimatedDeliveryDate)
              : payload.eta
                ? new Date(payload.eta)
                : undefined,
            lastKnownLocation: payload.location,
            carrier: payload.carrier,
            trackingNumber: payload.trackingNumber,
          },
          create: {
            orderId,
            eta: payload.estimatedDeliveryDate
              ? new Date(payload.estimatedDeliveryDate)
              : payload.eta
                ? new Date(payload.eta)
                : undefined,
            lastKnownLocation: payload.location,
            carrier: payload.carrier ?? order.carrier,
            trackingNumber: payload.trackingNumber ?? order.trackingNumber,
          },
        });
      }

      return updated;
    });

    // Re-fetch the full order to build the real-time payload
    const latest = await trackingRepository.findOrderTrackingById(orderId);
    const timeline = latest ? hydrateTimeline(latest, false) : [];

    // Emit Socket.io event to the order room so all live viewers see instant update
    emitOrderStatusUpdated({
      orderId,
      userId: latest?.userId,
      status: normalizeStatus(result.status || payload.status),
      timeline,
      carrier: latest?.carrier ?? latest?.shipment?.carrier ?? null,
      trackingNumber: latest?.trackingNumber ?? latest?.shipment?.trackingNumber ?? null,
      estimatedDeliveryDate: latest?.shipment?.eta ?? null,
    });

    return latest ? toTrackingPayload(latest, false) : null;
  },
};
