import { PrismaClient } from '../generated/client';

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
            process.env.NODE_ENV === 'development'
                ? ['query', 'warn', 'error']
                : ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}
