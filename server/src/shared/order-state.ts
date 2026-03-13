export interface PaymentStatusLike {
  status?: string | null;
}

export interface ShipmentLike {
  carrier?: string | null;
  trackingNumber?: string | null;
  eta?: Date | string | null;
  lastKnownLocation?: string | null;
}

export function deriveOrderPaymentStatus(payments: PaymentStatusLike[] | null | undefined): string {
  const normalized = (payments ?? [])
    .map((payment) => (payment.status ?? '').toUpperCase())
    .filter(Boolean);

  if (normalized.some((status) => status === 'REFUNDED')) return 'REFUNDED';
  if (normalized.some((status) => status === 'PARTIALLY_REFUNDED')) return 'PARTIALLY_REFUNDED';
  if (normalized.some((status) => status === 'COMPLETED' || status === 'PAID')) return 'PAID';
  if (normalized.some((status) => status === 'FAILED')) return 'FAILED';
  if (normalized.some((status) => status === 'PENDING' || status === 'PROCESSING')) return 'PENDING';
  return 'UNPAID';
}

export function normalizeOrderStatus(status: string | null | undefined): string {
  return (status ?? '').toLowerCase();
}

export function getShipmentSummary(shipment: ShipmentLike | null | undefined) {
  return {
    carrier: shipment?.carrier ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
    estimatedDeliveryDate: shipment?.eta ?? null,
    lastKnownLocation: shipment?.lastKnownLocation ?? null,
  };
}
