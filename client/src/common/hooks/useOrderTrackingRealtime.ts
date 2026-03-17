import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/common/utils/api';
import { useTrackingStore } from '@/store/components/tracking.store';
import { TrackingData, TrackingTimelineItem } from '@/types/tracking';

/**
 * useOrderTrackingRealtime
 *
 * Connects to a Socket.io room for the given orderId.
 * On `order:status_updated` events it merges the new status, timeline,
 * and optional provider metadata into the Zustand tracking store
 * into the Zustand tracking store — no page reload required.
 *
 * Falls back to HTTP polling (every 30 s) when the socket is disconnected
 * for longer than 10 seconds.
 */
export function useOrderTrackingRealtime(orderId?: number, userId?: number, enabled = true) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectAtRef = useRef<number | null>(null);
  const setTracking = useTrackingStore((s) => s.setTracking);
  const updateFromSocket = useTrackingStore((s) => s.updateFromSocket);

  useEffect(() => {
    if (!enabled || !orderId) return;

    let mounted = true;
    const socket: Socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      socket.emit('tracking:join_order', orderId);
      if (userId) socket.emit('tracking:join_user', userId);

      // Stop polling once socket reconnects
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    });

    socket.on('disconnect', () => {
      disconnectAtRef.current = Date.now();
      // Start polling fallback after 10 s of disconnect
      setTimeout(() => {
        if (!socket.connected && disconnectAtRef.current && Date.now() - disconnectAtRef.current > 10_000) {
          pollingRef.current = setInterval(async () => {
            try {
              const { getOrderTracking } = await import('@/common/services/tracking.service');
              const latest = await getOrderTracking(orderId) as unknown as TrackingData | { data: TrackingData };
              if (mounted) setTracking('data' in latest ? latest.data : latest);
            } catch {
              // Ignore 401 while polling (public mode)
            }
          }, 30_000);
        }
      }, 10_050);
    });

    /**
     * `order:status_updated` payload from server:
     * { orderId, orderCode, status, timeline, shippingMode, provider, providerOrderCode, providerStatus }
     */
    socket.on('order:status_updated', (payload: {
      status: string;
      timeline: { status: string; changedAt?: string; timestamp?: string; note?: string | null; }[];
      shippingMode?: 'manual' | 'provider';
      provider?: string | null;
      providerOrderCode?: string | null;
      providerStatus?: string | null;
      carrier?: string | null;
      trackingNumber?: string | null;
      estimatedDeliveryDate?: string | null;
    }) => {
      if (!mounted) return;

      const mappedTimeline: TrackingTimelineItem[] = payload.timeline.map(t => ({
        status: t.status as TrackingTimelineItem['status'],
        timestamp: t.timestamp ?? t.changedAt ?? new Date().toISOString(),
        note: t.note
      }));

      updateFromSocket(payload.status, mappedTimeline, {
        shippingMode: payload.shippingMode,
        provider: payload.provider ?? null,
        providerOrderCode: payload.providerOrderCode ?? null,
        providerStatus: payload.providerStatus ?? null,
        carrier: payload.carrier ?? null,
        trackingNumber: payload.trackingNumber ?? null,
        estimatedDeliveryDate: payload.estimatedDeliveryDate ?? null,
      });
    });

    return () => {
      mounted = false;
      socket.disconnect();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [enabled, orderId, userId, setTracking, updateFromSocket]);
}
