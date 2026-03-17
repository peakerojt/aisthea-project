import { create } from 'zustand';
import { TrackingData } from '@/types/tracking';

type LogisticsUpdate = {
  shippingMode?: 'manual' | 'provider';
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
};

type TrackingStore = {
  tracking: TrackingData | null;
  setTracking: (tracking: TrackingData) => void;
  clearTracking: () => void;
  updateFromSocket: (
    status: string,
    timeline: TrackingData['timeline'],
    logistics?: LogisticsUpdate,
  ) => void;
};

export const useTrackingStore = create<TrackingStore>((set) => ({
  tracking: null,
  setTracking: (tracking) => set({ tracking }),
  clearTracking: () => set({ tracking: null }),
  updateFromSocket: (status, timeline, logistics) =>
    set((state) => ({
      tracking: state.tracking
        ? {
          ...state.tracking,
          currentStatus: status as TrackingData['currentStatus'],
          timeline,
          shippingMode: logistics?.shippingMode ?? state.tracking.shippingMode,
          provider: logistics?.provider ?? state.tracking.provider,
          providerOrderCode: logistics?.providerOrderCode ?? state.tracking.providerOrderCode,
          providerStatus: logistics?.providerStatus ?? state.tracking.providerStatus,
          // Merge logistics fields if provided by the socket event
          carrier: logistics?.carrier ?? state.tracking.carrier,
          trackingNumber: logistics?.trackingNumber ?? state.tracking.trackingNumber,
          estimatedDeliveryDate: logistics?.estimatedDeliveryDate ?? state.tracking.estimatedDeliveryDate,
          shipment: state.tracking.shipment
            ? {
              ...state.tracking.shipment,
              shippingMode: logistics?.shippingMode ?? state.tracking.shipment.shippingMode,
              provider: logistics?.provider ?? state.tracking.shipment.provider,
              providerOrderCode: logistics?.providerOrderCode ?? state.tracking.shipment.providerOrderCode,
              providerStatus: logistics?.providerStatus ?? state.tracking.shipment.providerStatus,
              carrier: logistics?.carrier ?? state.tracking.shipment.carrier,
              trackingNumber: logistics?.trackingNumber ?? state.tracking.shipment.trackingNumber,
              eta: logistics?.estimatedDeliveryDate ?? state.tracking.shipment.eta,
            }
            : state.tracking.shipment,
        }
        : state.tracking,
    })),
}));
