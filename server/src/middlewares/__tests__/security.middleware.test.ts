import jwt from 'jsonwebtoken';
import { env } from '../../lib/env';
import { attachRateLimitIdentity, isAdminShellRequest, resolveGlobalRateLimit } from '../security.middleware';

describe('security.middleware rate-limit routing', () => {
  it('keeps the default API limit for non-admin requests', () => {
    const req: any = {
      headers: {},
      method: 'GET',
    };

    expect(isAdminShellRequest(req)).toBe(false);
    expect(resolveGlobalRateLimit(req)).toBe(200);
  });

  it('does not widen the global limit when clients spoof the admin shell header', () => {
    const req: any = {
      headers: {
        'x-aisthea-shell': 'admin',
      },
      method: 'GET',
    };

    expect(isAdminShellRequest(req)).toBe(false);
    expect(resolveGlobalRateLimit(req)).toBe(200);
  });

  it('does not widen the global limit from referer-based admin hints', () => {
    const req: any = {
      headers: {
        referer: 'http://localhost:5173/admin/orders/42',
      },
      method: 'GET',
    };

    expect(isAdminShellRequest(req)).toBe(false);
    expect(resolveGlobalRateLimit(req)).toBe(200);
  });

  it('hydrates rate-limit identity from a verified access token cookie', () => {
    const token = jwt.sign(
      { userId: 42, roles: ['Admin'], email: 'admin@example.com' },
      env.jwtSecret,
      { expiresIn: '15m' },
    );
    const req: any = {
      cookies: { accessToken: token },
      headers: {},
    };
    const next = jest.fn();

    attachRateLimitIdentity(req, {} as any, next);

    expect(req.rateLimitIdentity).toEqual({
      userId: 42,
      roles: ['Admin'],
      email: 'admin@example.com',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid tokens and continues without a rate-limit identity', () => {
    const req: any = {
      cookies: { accessToken: 'not-a-real-token' },
      headers: {},
    };
    const next = jest.fn();

    attachRateLimitIdentity(req, {} as any, next);

    expect(req.rateLimitIdentity).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
