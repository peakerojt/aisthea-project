import { PrismaClient } from '../generated/client';
import { registerPrismaQueryMonitor } from './query-monitor';

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

/**
 * Single shared PrismaClient instance.
 * In development, reuse the global instance to avoid exhausting DB connections
 * under hot-reload. In production, create once per process.
 */
export const prisma: PrismaClient =
    global.__prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === 'production'
                ? ['warn', 'error']
                : [{ emit: 'event', level: 'query' }, 'warn', 'error'],
    });

registerPrismaQueryMonitor(prisma);

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}
