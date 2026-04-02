import { resolveActorType, resolveAuthAccountIdentifier, resolveRateLimitKey } from '../resolveRateLimitKey';

describe('resolveRateLimitKey', () => {
  it('uses user id for authenticated customer mutation requests', () => {
    const req: any = {
      ip: '127.0.0.1',
      user: { userId: 42, roles: ['Customer'] },
      body: {},
      query: {},
    };

    expect(
      resolveRateLimitKey(req, {
        bucket: 'CUSTOMER_MUTATION',
        resource: 'order.cancel',
        strategy: 'userId||ip',
      }),
    ).toContain('user:42');
  });

  it('falls back to IP when a user id is not available', () => {
    const req: any = {
      ip: '127.0.0.1',
      body: {},
      query: {},
    };

    expect(
      resolveRateLimitKey(req, {
        bucket: 'CUSTOMER_MUTATION',
        resource: 'review.create',
        strategy: 'userId||ip',
      }),
    ).toContain('ip:127.0.0.1');
  });

  it('uses pre-hydrated rate-limit identity for global API traffic', () => {
    const req: any = {
      ip: '127.0.0.1',
      rateLimitIdentity: { userId: 88, roles: ['Admin'] },
      body: {},
      query: {},
    };

    expect(
      resolveRateLimitKey(req, {
        bucket: 'GLOBAL_API',
        resource: 'api.global',
        strategy: 'userId||ip',
      }),
    ).toContain('user:88');
  });

  it('includes normalized account identity for auth routes', () => {
    const req: any = {
      ip: '127.0.0.1',
      body: { email: 'User+Test@Example.com ' },
      query: {},
    };

    expect(resolveAuthAccountIdentifier(req)).toBe('email:user-test@example.com');
    expect(
      resolveRateLimitKey(req, {
        bucket: 'AUTH',
        resource: 'auth.login',
        strategy: 'ip+account',
      }),
    ).toContain('email:user-test@example.com');
  });
});

describe('resolveActorType', () => {
  it('classifies admin-capable roles as admin traffic', () => {
    const req: any = {
      user: { userId: 7, roles: ['Support'] },
    };

    expect(resolveActorType(req)).toBe('admin');
  });

  it('classifies pre-hydrated admin identities as admin traffic', () => {
    const req: any = {
      rateLimitIdentity: { userId: 12, roles: ['Admin'] },
    };

    expect(resolveActorType(req)).toBe('admin');
  });
});
