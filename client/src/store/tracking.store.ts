import { create } from 'zustand';
import { TrackingData } from '../types/tracking';

type TrackingStore = {
  tracking: TrackingData | null;
  setTracking: (tracking: TrackingData) => void;
  clearTracking: () => void;
  updateFromSocket: (status: string, timeline: TrackingData['timeline']) => void;
};

export const useTrackingStore = create<TrackingStore>((set) => ({
  tracking: null,
  setTracking: (tracking) => set({ tracking }),
  clearTracking: () => set({ tracking: null }),
  updateFromSocket: (status, timeline) =>
    set((state) => ({
      tracking: state.tracking
        ? {
            ...state.tracking,
            currentStatus: status as TrackingData['currentStatus'],
            timeline,
          }
        : state.tracking,
    })),
}));
