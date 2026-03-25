import { hasAnyRole } from '../../../shared/role-access';

type RateLimitBucketEntry = {
  count: number;
  resetAt: number;
};

export const sendForbidden = (res: any) =>
  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Insufficient access rights' },
  });

export const requireRoles = (allowed: readonly string[]) => (req: any, res: any, next: any) => {
  const canAccess = hasAnyRole(req.user, allowed);
  if (!canAccess) {
    return sendForbidden(res);
  }
  return next();
};

export const createReturnRateLimit = (() => {
  const bucket = new Map<number, RateLimitBucketEntry>();
  const WINDOW_MS = 60 * 1000;
  const MAX_REQUESTS = 5;

  return (req: any, res: any, next: any) => {
    const userId = Number(req.user?.userId || 0);
    if (!userId) return next();

    const now = Date.now();
    const current = bucket.get(userId);
    if (!current || now > current.resetAt) {
      bucket.set(userId, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    if (current.count >= MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
      });
    }

    current.count += 1;
    bucket.set(userId, current);
    return next();
  };
})();
