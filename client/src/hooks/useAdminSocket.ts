import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

export interface NewOrderPayload {
    orderId: number;
    totalAmount: number;
}

/**
 * useAdminSocket — connects to the admin Socket.io room and exposes
 * a way to register a handler for `new_order` events.
 *
 * Usage:
 *   const { onNewOrder } = useAdminSocket();
 *   useEffect(() => onNewOrder((payload) => { ... }), []);
 */
export function useAdminSocket(
    onNewOrder: (payload: NewOrderPayload) => void
) {
    const socketRef = useRef<Socket | null>(null);
    // Keep a stable ref to the callback so we don't reconnect on re-renders
    const cbRef = useRef(onNewOrder);
    cbRef.current = onNewOrder;

    useEffect(() => {
        const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            // Join the admin room to receive broadcast events
            socket.emit('admin:join');
        });

        socket.on('new_order', (payload: NewOrderPayload) => {
            cbRef.current(payload);
        });

        return () => {
            socket.disconnect();
        };
    }, []); // only mount/unmount
}
