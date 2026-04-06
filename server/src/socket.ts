import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './lib/env';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join a room scoped to a specific order for real-time tracking updates
    socket.on('tracking:join_order', (orderId: string | number) => {
      socket.join(`order:${orderId}`);
    });

    // Join a room scoped to a user (for cross-device notification)
    socket.on('tracking:join_user', (userId: string | number) => {
      socket.join(`user:${userId}`);
    });

    // Admin dashboard room — receives real-time KPI and new-order events
    socket.on('admin:join', () => {
      socket.join('admin');
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized.');
  }
  return io;
}

/**
 * Emitted whenever an admin updates an order's status.
 * Clients listening on `order:<orderId>` or `user:<userId>` will receive
 * the `order:status_updated` event containing the full order-tracking update.
 */
export function emitOrderStatusUpdated(payload: {
  orderId: number;
  userId?: number | null;
  orderCode?: string;
  status: string;
  timeline: unknown[];
  shippingMode?: 'manual' | 'provider';
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: Date | null;
}) {
  if (!io) return;

  // Emit to the order-specific room (used by TrackingDetailPage)
  io.to(`order:${payload.orderId}`).emit('order:status_updated', payload);

  // Also emit to the user room so other tabs/devices get notified
  if (payload.userId) {
    io.to(`user:${payload.userId}`).emit('order:status_updated', payload);
  }
}

/**
 * Broadcast a new order event to all connected admin dashboards.
 */
export function emitNewOrder(payload: { orderId: number; totalAmount: number }) {
  if (!io) return;
  io.to('admin').emit('new_order', payload);
}
