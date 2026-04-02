import { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { RateLimitBucketName, RateLimitKeyStrategy } from './rate-limit.config';

type ResolveRateLimitKeyOptions = {
  bucket: RateLimitBucketName;
  resource: string;
  strategy: RateLimitKeyStrategy;
};

const normalizeSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@:-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const readFirst = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return undefined;
};

const getRequestIdentity = (req: Request) =>
  (req.user ?? req.rateLimitIdentity) as { userId?: number; roles?: string[] } | undefined;

const resolveIpSegment = (req: Request) => {
  const ip = typeof req.ip === 'string' && req.ip.trim().length > 0 ? req.ip : 'unknown';
  return `ip:${normalizeSegment(ipKeyGenerator(ip))}`;
};

export const resolveAuthAccountIdentifier = (req: Request) => {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const query = req.query && typeof req.query === 'object' ? (req.query as Record<string, unknown>) : {};

  const email = readFirst(body.email) ?? readFirst(query.email);
  if (email) return `email:${normalizeSegment(email)}`;

  const phone = readFirst(body.phone) ?? readFirst(query.phone) ?? readFirst(body.contact) ?? readFirst(query.contact);
  if (phone) return `phone:${normalizeSegment(phone)}`;

  return undefined;
};

export const resolveActorType = (req: Request) => {
  const requestIdentity = getRequestIdentity(req);
  const roles = Array.isArray(requestIdentity?.roles) ? requestIdentity.roles : [];
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());

  if (normalizedRoles.some((role) => role.includes('admin') || role.includes('support') || role.includes('finance') || role.includes('warehouse'))) {
    return 'admin';
  }

  if (typeof requestIdentity?.userId === 'number') {
    return 'authenticated-user';
  }

  return 'anonymous';
};

export const resolveRateLimitKey = (req: Request, options: ResolveRateLimitKeyOptions) => {
  const prefix = [`bucket:${options.bucket}`, `resource:${normalizeSegment(options.resource)}`];
  const ipSegment = resolveIpSegment(req);
  const requestIdentity = getRequestIdentity(req);
  const userId = typeof requestIdentity?.userId === 'number' && Number.isFinite(requestIdentity.userId)
    ? `user:${requestIdentity.userId}`
    : undefined;
  const accountSegment = resolveAuthAccountIdentifier(req);

  switch (options.strategy) {
    case 'ip':
      return [...prefix, ipSegment].join('|');
    case 'userId':
      return [...prefix, userId ?? ipSegment].join('|');
    case 'userId||ip':
      return [...prefix, userId ?? ipSegment].join('|');
    case 'ip+account':
      return [...prefix, ipSegment, accountSegment ?? 'account:unknown'].join('|');
    default:
      return [...prefix, ipSegment].join('|');
  }
};
