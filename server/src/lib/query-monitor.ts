import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '../generated/client';
import { logger } from './logger';

type QueryRequestContext = {
  count: number;
  method: string;
  path: string;
};

const requestQueryStorage = new AsyncLocalStorage<QueryRequestContext>();
const queryMonitorEnabled = process.env.NODE_ENV !== 'production';

const BENCHMARK_THRESHOLDS: Array<{ pattern: RegExp; threshold: number }> = [
  { pattern: /^POST \/api\/cart\/merge$/, threshold: 8 },
  { pattern: /^POST \/api\/cart\/add$/, threshold: 6 },
  { pattern: /^GET \/api\/products$/, threshold: 12 },
  { pattern: /^GET \/api\/orders\/\d+$/, threshold: 12 },
  { pattern: /^POST \/api\/purchase-orders\/\d+\/receive$/, threshold: 24 },
  { pattern: /^PATCH \/api\/orders\/\d+\/status$/, threshold: 18 },
];

let listenerRegistered = false;

export const registerPrismaQueryMonitor = (client: PrismaClient) => {
  if (!queryMonitorEnabled || listenerRegistered) return;

  (client as any).$on('query', () => {
    const store = requestQueryStorage.getStore();
    if (!store) return;
    store.count += 1;
  });

  listenerRegistered = true;
};

const shouldTrackRequest = (req: Request) => req.originalUrl.startsWith('/api');

const getWarningThreshold = (method: string, path: string) => {
  const routeKey = `${method.toUpperCase()} ${path}`;
  return BENCHMARK_THRESHOLDS.find((entry) => entry.pattern.test(routeKey))?.threshold;
};

export const queryCountMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!queryMonitorEnabled || !shouldTrackRequest(req)) {
    next();
    return;
  }

  const path = req.originalUrl.split('?')[0];
  const context: QueryRequestContext = {
    count: 0,
    method: req.method.toUpperCase(),
    path,
  };

  requestQueryStorage.run(context, () => {
    const originalEnd = res.end.bind(res);

    res.end = ((chunk?: any, encoding?: any, cb?: any) => {
      if (!res.headersSent) {
        res.setHeader('x-query-count', String(context.count));
      }
      return originalEnd(chunk, encoding, cb);
    }) as Response['end'];

    res.on('finish', () => {
      const threshold = getWarningThreshold(context.method, context.path);
      if (threshold !== undefined && context.count > threshold) {
        logger.warn('[query-monitor] high query count detected', {
          method: context.method,
          path: context.path,
          queryCount: context.count,
          threshold,
          statusCode: res.statusCode,
        });
      }
    });

    next();
  });
};
