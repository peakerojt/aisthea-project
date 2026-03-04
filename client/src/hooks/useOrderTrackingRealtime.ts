import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { getOrderTracking } from '../services/tracking.service';
import { useTrackingStore } from '../store/tracking.store';

export function useOrderTrackingRealtime(orderId?: number, userId?: number, enabled = true) {
  const pollingRef = useRef<number | null>(null);
  const disconnectAtRef = useRef<number | null>(null);
  const setTracking = useTrackingStore((s) => s.setTracking);
  const updateFromSocket = useTrackingStore((s) => s.updateFromSocket);

  useEffect(() => {
    if (!enabled || !orderId) return;

    let mounted = true;
    const socket = io(API_BASE_URL);

    socket.on('connect', async () => {
      socket.emit('tracking:join_order', orderId);
      if (userId) socket.emit('tracking:join_user', userId);

      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      try {
        const latest = await getOrderTracking(orderId);
        if (mounted) setTracking(latest);
      } catch {
        // ignore when user is not authenticated or request fails
      }
    });

    socket.on('disconnect', () => {
      disconnectAtRef.current = Date.now();
      window.setTimeout(() => {
        if (!socket.connected && disconnectAtRef.current && Date.now() - disconnectAtRef.current > 10000) {
          pollingRef.current = window.setInterval(async () => {
            try {
              const latest = await getOrderTracking(orderId);
              if (mounted) setTracking(latest);
            } catch {
              // ignore 401 while polling
            }
          }, 20000);
        }
      }, 10050);
    });

    socket.on('order:status_updated', (payload: { status: string; timeline: any[] }) => {
      if (mounted) updateFromSocket(payload.status, payload.timeline as any);
    });

    return () => {
      mounted = false;
      socket.disconnect();
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [enabled, orderId, userId, setTracking, updateFromSocket]);
}
