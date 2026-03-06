import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { useTrackingStore } from '../store/tracking.store';

/**
 * useOrderTrackingRealtime
 *
 * Connects to a Socket.io room for the given orderId.
 * On `order:status_updated` events it merges the new status, timeline,
 * and logistics fields (carrier, trackingNumber, estimatedDeliveryDate)
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
              const { getOrderTracking } = await import('../services/tracking.service');
              const latest = await getOrderTracking(orderId) as any;
              if (mounted) setTracking(latest.data || latest);
            } catch {
              // Ignore 401 while polling (public mode)
            }
          }, 30_000);
        }
      }, 10_050);
    });

    /**
     * `order:status_updated` payload from server:
     * { orderId, status, timeline, carrier, trackingNumber, estimatedDeliveryDate }
     */
    socket.on('order:status_updated', (payload: {
      status: string;
      timeline: any[];
      carrier?: string | null;
      trackingNumber?: string | null;
      estimatedDeliveryDate?: string | null;
    }) => {
      if (!mounted) return;
      updateFromSocket(payload.status, payload.timeline as any, {
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
