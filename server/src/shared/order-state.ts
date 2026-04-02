import { isSettledPaymentStatus, normalizePaymentStatusKey } from '../config/paymentStatus.config';

export interface PaymentStatusLike {
  status?: string | null;
}

export interface ShipmentLike {
  carrier?: string | null;
  trackingNumber?: string | null;
  eta?: Date | string | null;
  lastKnownLocation?: string | null;
  shippingMode?: string | null;
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
}

export function deriveOrderPaymentStatus(payments: PaymentStatusLike[] | null | undefined): string {
  const normalized = (payments ?? [])
    .map((payment) => normalizePaymentStatusKey(payment.status))
    .filter(Boolean);

  if (normalized.some((status) => status === 'REFUNDED')) return 'REFUNDED';
  if (normalized.some((status) => status === 'PARTIALLY_REFUNDED')) return 'PARTIALLY_REFUNDED';
  if (normalized.some((status) => isSettledPaymentStatus(status))) return 'PAID';
  if (normalized.some((status) => status === 'NEEDS_REVIEW')) return 'NEEDS_REVIEW';
  if (normalized.some((status) => status === 'FAILED' || status === 'CANCELLED' || status === 'DECLINED' || status === 'EXPIRED')) {
    return 'CANCELLED';
  }
  if (
    normalized.some(
      (status) =>
        status === 'PENDING' ||
        status === 'PROCESSING' ||
        status === 'VERIFYING' ||
        status === 'PENDING_COD' ||
        status === 'PENDING_VNPAY',
    )
  ) {
    return 'PENDING';
  }
  return 'UNPAID';
}

export function normalizeOrderStatus(status: string | null | undefined): string {
  return (status ?? '').toLowerCase();
}

export function normalizeShippingMode(mode: string | null | undefined, provider: string | null | undefined): 'manual' | 'provider' {
  if ((mode ?? '').trim().toLowerCase() === 'provider') return 'provider';
  if ((provider ?? '').trim().length > 0) return 'provider';
  return 'manual';
}

export function getShipmentSummary(shipment: ShipmentLike | null | undefined) {
  const provider = shipment?.provider?.trim() || null;
  const shippingMode = normalizeShippingMode(shipment?.shippingMode, provider);
  const providerOrderCode = shipment?.providerOrderCode ?? shipment?.trackingNumber ?? null;

  return {
    carrier: shipment?.carrier ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
    estimatedDeliveryDate: shipment?.eta ?? null,
    lastKnownLocation: shipment?.lastKnownLocation ?? null,
    shippingMode,
    provider,
    providerOrderCode,
    providerStatus: shipment?.providerStatus ?? null,
  };
}

export function getOrderTrackingSummary(orderCode: string, shipment: ShipmentLike | null | undefined) {
  const shipmentSummary = getShipmentSummary(shipment);

  return {
    trackingCode: orderCode,
    shippingMode: shipmentSummary.shippingMode,
    provider: shipmentSummary.provider,
    providerOrderCode: shipmentSummary.providerOrderCode,
    providerStatus: shipmentSummary.providerStatus,
    carrier: shipmentSummary.carrier,
    trackingNumber: shipmentSummary.trackingNumber,
    estimatedDeliveryDate: shipmentSummary.estimatedDeliveryDate,
    lastKnownLocation: shipmentSummary.lastKnownLocation,
  };
}
