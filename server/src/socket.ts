import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('tracking:join_order', (orderId: string | number) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('tracking:join_user', (userId: string | number) => {
      socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO chưa được khởi tạo.');
  }
  return io;
}

export function emitOrderStatusUpdated(payload: {
  orderId: number;
  userId?: number | null;
  status: string;
  timeline: unknown[];
}) {
  if (!io) return;

  io.to(`order:${payload.orderId}`).emit('order:status_updated', payload);
  if (payload.userId) {
    io.to(`user:${payload.userId}`).emit('order:status_updated', payload);
  }
}
