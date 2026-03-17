import { logger } from '../../lib/logger';

export type ShippingMode = 'manual' | 'provider';
export type ShippingProviderKey = 'ghn' | 'ghtk' | 'viettelpost';
export type ShippingProviderAdapterKey = ShippingProviderKey | 'manual';

export interface ShipmentMetadataLike {
  carrier?: string | null;
  trackingNumber?: string | null;
  eta?: Date | string | null;
  shippingMode?: string | null;
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
}

export interface StartShippingInput {
  orderId: number;
  orderCode: string;
  currentStatus: string;
  shipment?: ShipmentMetadataLike | null;
}

export interface ShippingSyncResult {
  shippingMode: ShippingMode;
  provider: ShippingProviderKey | null;
  providerOrderCode: string | null;
  providerStatus: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryDate: Date | string | null;
}

export interface ShippingProviderAdapter {
  key: ShippingProviderAdapterKey;
  startShipping(input: StartShippingInput): Promise<ShippingSyncResult | null>;
}

const manualShippingAdapter: ShippingProviderAdapter = {
  key: 'manual',
  async startShipping() {
    return {
      shippingMode: 'manual',
      provider: null,
      providerOrderCode: null,
      providerStatus: null,
      carrier: null,
      trackingNumber: null,
      estimatedDeliveryDate: null,
    };
  },
};

const providerRegistry: Partial<Record<ShippingProviderKey, ShippingProviderAdapter>> = {};

function normalizeProviderKey(value: string | undefined | null): ShippingProviderAdapterKey {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'ghn' || normalized === 'ghtk' || normalized === 'viettelpost') {
    return normalized;
  }
  return 'manual';
}

export function getActiveShippingProvider(): ShippingProviderAdapterKey {
  return normalizeProviderKey(process.env.SHIPPING_PROVIDER);
}

export function getShippingProviderAdapter(): ShippingProviderAdapter {
  const activeProvider = getActiveShippingProvider();

  if (activeProvider === 'manual') {
    return manualShippingAdapter;
  }

  const adapter = providerRegistry[activeProvider];
  if (!adapter) {
    logger.warn('[shipping-provider] Adapter not implemented yet, falling back to manual mode', {
      provider: activeProvider,
    });
    return manualShippingAdapter;
  }

  return adapter;
}

export async function syncOrderWithShippingProvider(
  input: StartShippingInput,
): Promise<ShippingSyncResult | null> {
  const adapter = getShippingProviderAdapter();
  return adapter.startShipping(input);
}
