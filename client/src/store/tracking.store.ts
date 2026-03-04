import { create } from 'zustand';
import { TrackingData } from '../types/tracking';

type LogisticsUpdate = {
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
          // Merge logistics fields if provided by the socket event
          carrier: logistics?.carrier ?? state.tracking.carrier,
          trackingNumber: logistics?.trackingNumber ?? state.tracking.trackingNumber,
          estimatedDeliveryDate: logistics?.estimatedDeliveryDate ?? state.tracking.estimatedDeliveryDate,
          shipment: state.tracking.shipment
            ? {
              ...state.tracking.shipment,
              carrier: logistics?.carrier ?? state.tracking.shipment.carrier,
              trackingNumber: logistics?.trackingNumber ?? state.tracking.shipment.trackingNumber,
              eta: logistics?.estimatedDeliveryDate ?? state.tracking.shipment.eta,
            }
            : state.tracking.shipment,
        }
        : state.tracking,
    })),
}));
