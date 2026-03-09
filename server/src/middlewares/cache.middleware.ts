import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// ─── In-memory TTL cache ──────────────────────────────────────────────────────
// Simple Map-based cache with per-entry TTL.
// Suitable for read-heavy, rarely-changing data (categories, brand lists, etc.)
// Does NOT require Redis — safe to use in any environment.

interface CacheEntry {
    body: unknown;
    expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/** Standard TTL constants in seconds */
export const CACHE_TTL = {
    CATEGORIES: 30 * 60,    // 30 min — changes infrequently
    PRODUCTS: 2 * 60,       // 2 min  — stock / price can change
    BRANDS: 60 * 60,        // 1 hour — almost never changes
} as const;

/** Evict stale entries (called lazily on writes) */
function evictExpired() {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.expiresAt < now) store.delete(key);
    }
}

/**
 * Route-level cache middleware.
 *
 * @param ttlSeconds - How long the response should be cached.
 *
 * Usage:
 *   router.get('/meta/categories', cacheMiddleware(CACHE_TTL.CATEGORIES), getAllCategories);
 */
export const cacheMiddleware = (ttlSeconds: number) =>
    (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cached = store.get(key);

        if (cached && cached.expiresAt > Date.now()) {
            logger.debug(`[Cache HIT] ${key}`);
            return res.json(cached.body);
        }

        // Intercept res.json to store the response before sending it
        const originalJson = res.json.bind(res) as (body: unknown) => Response;
        res.json = (body: unknown): Response => {
            if (res.statusCode === 200) {
                evictExpired();
                store.set(key, { body, expiresAt: Date.now() + ttlSeconds * 1000 });
                logger.debug(`[Cache MISS → stored] ${key} (TTL: ${ttlSeconds}s)`);
            }
            return originalJson(body);
        };

        next();
    };

/**
 * Invalidate all cache entries whose key contains the given prefix.
 *
 * Usage (after a product is created/updated/deleted):
 *   invalidateCache('/api/products');
 */
export function invalidateCache(prefix: string) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
            logger.debug(`[Cache INVALIDATED] ${key}`);
        }
    }
}
