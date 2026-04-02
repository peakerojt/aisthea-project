import { AppError } from '../../middlewares/error.middleware';
import { getOrderTrackingSummary } from '../../shared/order-state';
import {
  buildCanonicalTimeline,
  deriveCanonicalPaymentStatus,
  toCanonicalOrderStatus,
  toCanonicalTrackingStatus,
} from '../../shared/order-contract';
import { trackingRepository } from './tracking.repository';
import { UpdateOrderStatusInput } from './tracking.validator';
import { updateOrderStatusAdmin } from '../order/order.service';

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

function hydrateTimeline(order: any, isPublic = false) {
  return buildCanonicalTimeline(order.statusHistory, order.createdAt).map((history) => {
    const status = toCanonicalTrackingStatus(history.status);
    return {
      status,
      statusLabelKey: `tracking:status.${status}`,
      timestamp: history.timestamp,
      note: history.note,
      location: null,
      description: null,
      updatedBy: isPublic ? null : history.changedBy,
    };
  });
}

function toTrackingPayload(order: any, isPublic = false) {
  const currentStatus = toCanonicalTrackingStatus(order.status);
  const shipping = getOrderTrackingSummary(order.orderNumber, order.shipment);

  return {
    orderId: order.orderId,
    orderCode: order.orderNumber,
    trackingCode: shipping.trackingCode,
    currentStatus,
    currentStatusLabelKey: `tracking:status.${currentStatus}`,
    paymentMethod: order.paymentMethod ?? null,
    paymentStatus: deriveCanonicalPaymentStatus(order.payments, order.paymentMethod),
    eta: shipping.estimatedDeliveryDate,
    shippingMode: shipping.shippingMode,
    provider: shipping.provider,
    providerOrderCode: isPublic ? null : shipping.providerOrderCode,
    providerStatus: shipping.providerStatus,
    carrier: shipping.carrier,
    trackingNumber: isPublic ? null : shipping.trackingNumber,
    estimatedDeliveryDate: shipping.estimatedDeliveryDate,
    // Shipment sub-object
    shipment: order.shipment
      ? {
        carrier: shipping.carrier,
        trackingNumber: isPublic ? null : shipping.trackingNumber,
        lastKnownLocation: order.shipment.lastKnownLocation,
        eta: order.shipment.eta,
        shippingMode: shipping.shippingMode,
        provider: shipping.provider,
        providerOrderCode: isPublic ? null : shipping.providerOrderCode,
        providerStatus: shipping.providerStatus,
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

    await updateOrderStatusAdmin(
      String(orderId),
      { userId: updatedBy, roles: ['Admin'] },
      {
        status: toCanonicalOrderStatus(payload.status),
        note: payload.note,
        deliveryProofImages: payload.deliveryProofImages,
        deliveryProofReviewed: payload.deliveryProofReviewed,
        transitionSource: 'tracking_ops',
      },
    );

    const latest = await trackingRepository.findOrderTrackingById(orderId);
    return latest ? toTrackingPayload(latest, false) : null;
  },
};
