import { initI18n, t, normalizeLocale } from '../index';

describe('i18n — Translation Helper (t)', () => {
  beforeAll(async () => {
    await initI18n();
  });

  // ─── English translations ─────────────────────────────────────────────────
  describe('English (en)', () => {
    it('translates tracking success key', () => {
      expect(t('en', 'tracking:success.getPublicTracking')).toContain('successfully');
    });

    it('translates tracking error — not found', () => {
      expect(t('en', 'tracking:errors.notFound')).toContain('tracking info');
    });

    it('translates tracking error — forbidden', () => {
      expect(t('en', 'tracking:errors.forbidden')).toContain('permission');
    });

    it('translates tracking error — adminOnly', () => {
      expect(t('en', 'tracking:errors.adminOnly')).toMatch(/admin/i);
    });

    it('translates tracking error — orderNotFound', () => {
      expect(t('en', 'tracking:errors.orderNotFound')).toContain('found');
    });
  });

  // ─── Vietnamese translations ──────────────────────────────────────────────
  describe('Vietnamese (vi)', () => {
    it('translates tracking success key', () => {
      expect(t('vi', 'tracking:success.getPublicTracking')).toContain('thành công');
    });

    it('translates tracking error — not found', () => {
      expect(t('vi', 'tracking:errors.notFound')).toContain('tra cứu');
    });

    it('translates tracking error — forbidden', () => {
      expect(t('vi', 'tracking:errors.forbidden')).toContain('quyền');
    });

    it('translates tracking error — adminOnly', () => {
      expect(t('vi', 'tracking:errors.adminOnly')).toContain('admin');
    });

    it('translates tracking error — orderNotFound', () => {
      expect(t('vi', 'tracking:errors.orderNotFound')).toContain('tìm thấy');
    });
  });

  // ─── Param interpolation ──────────────────────────────────────────────────
  describe('Param interpolation', () => {
    it('[EN] interpolates route method and url in notFoundRoute', () => {
      const msg = t('en', 'common:errors.notFoundRoute', { method: 'GET', url: '/api/unknown' });
      expect(msg).toContain('GET');
      expect(msg).toContain('/api/unknown');
    });

    it('[VI] interpolates route method and url in notFoundRoute', () => {
      const msg = t('vi', 'common:errors.notFoundRoute', { method: 'POST', url: '/api/test' });
      expect(msg).toContain('POST');
      expect(msg).toContain('/api/test');
    });

    it('[EN] interpolates from/to in invalidStatusTransition', () => {
      const msg = t('en', 'tracking:errors.invalidStatusTransition', {
        from: 'DELIVERED',
        to: 'PENDING',
      });
      expect(msg).toContain('DELIVERED');
      expect(msg).toContain('PENDING');
      expect(msg).toContain('transition');
    });

    it('[VI] interpolates from/to in invalidStatusTransition', () => {
      const msg = t('vi', 'tracking:errors.invalidStatusTransition', {
        from: 'DELIVERED',
        to: 'PENDING',
      });
      expect(msg).toContain('DELIVERED');
      expect(msg).toContain('PENDING');
      expect(msg).toContain('trạng thái');
    });

    it('[EN] interpolates status in updateStatus success message', () => {
      const msg = t('en', 'tracking:success.updateStatus', { status: 'SHIPPED' });
      expect(msg).toContain('SHIPPED');
      expect(msg).toContain('successfully');
    });

    it('[VI] interpolates status in updateStatus success message', () => {
      const msg = t('vi', 'tracking:success.updateStatus', { status: 'SHIPPED' });
      expect(msg).toContain('SHIPPED');
      expect(msg).toContain('thành công');
    });
  });

  // ─── Status label translations ────────────────────────────────────────────
  describe('Order status labels', () => {
    const statuses = [
      'PENDING',
      'CONFIRMED',
      'PACKING',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED_DELIVERY',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
    ];

    it.each(statuses)('[EN] has translation for status: %s', (status) => {
      const key = `tracking:status.${status}`;
      const result = t('en', key);
      // Should resolve to a real translation (not fall back to the key itself)
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    });

    it.each(statuses)('[VI] has translation for status: %s', (status) => {
      const key = `tracking:status.${status}`;
      const result = t('vi', key);
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ─── Fallback / edge cases ────────────────────────────────────────────────
  describe('Edge cases and fallback behaviour', () => {
    it('returns key string when key does not exist', () => {
      const result = t('en', 'tracking:errors.nonExistentKey');
      // i18n returns the key itself when not found
      expect(result).toBe('tracking:errors.nonExistentKey');
    });

    it('defaults to English translation when locale resolves to en', () => {
      const locale = normalizeLocale('jp'); // → 'en'
      const msg = t(locale, 'tracking:success.getMyOrders');
      expect(msg).toContain('successfully');
    });

    it('translates common errors in both locales', () => {
      expect(t('en', 'common:errors.unauthorized')).toMatch(/unauthorized/i);
      expect(t('vi', 'common:errors.unauthorized')).toMatch(/đăng nhập/i);
    });
  });
});
