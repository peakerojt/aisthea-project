import { resolveRequestLocale } from '../../middlewares/locale.middleware';
import { normalizeLocale, isSupportedLocale, SUPPORTED_LOCALES } from '../index';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeReq = (headers: Record<string, string | undefined>) =>
  ({
    header: (name: string) => headers[name.toLowerCase()],
  }) as any;

// ─── resolveRequestLocale ─────────────────────────────────────────────────────
describe('resolveRequestLocale', () => {
  it('prefers x-lang over accept-language', () => {
    const req = makeReq({ 'x-lang': 'vi', 'accept-language': 'en-US,en;q=0.9' });
    expect(resolveRequestLocale(req)).toBe('vi');
  });

  it('uses accept-language when x-lang is absent', () => {
    const req = makeReq({ 'accept-language': 'vi-VN,vi;q=0.9' });
    expect(resolveRequestLocale(req)).toBe('vi');
  });

  it('falls back to en for unsupported locale in x-lang (jp)', () => {
    const req = makeReq({ 'x-lang': 'jp' });
    expect(resolveRequestLocale(req)).toBe('en');
  });

  it('falls back to en for unsupported locale in accept-language (fr)', () => {
    const req = makeReq({ 'accept-language': 'fr-FR,fr;q=0.9' });
    expect(resolveRequestLocale(req)).toBe('en');
  });

  it('falls back to en when no headers are present', () => {
    const req = makeReq({});
    expect(resolveRequestLocale(req)).toBe('en');
  });

  it('handles region suffix in x-lang (vi-VN → vi)', () => {
    const req = makeReq({ 'x-lang': 'vi-VN' });
    expect(resolveRequestLocale(req)).toBe('vi');
  });

  it('handles region suffix in accept-language (en-GB → en)', () => {
    const req = makeReq({ 'accept-language': 'en-GB,en;q=0.9' });
    expect(resolveRequestLocale(req)).toBe('en');
  });

  it('handles uppercase x-lang value (EN → en)', () => {
    const req = makeReq({ 'x-lang': 'EN' });
    expect(resolveRequestLocale(req)).toBe('en');
  });

  it('picks first language from accept-language list', () => {
    // vi comes first even though en is also listed
    const req = makeReq({ 'accept-language': 'vi;q=1.0,en;q=0.8' });
    expect(resolveRequestLocale(req)).toBe('vi');
  });
});

// ─── normalizeLocale ──────────────────────────────────────────────────────────
describe('normalizeLocale', () => {
  it.each([
    ['vi', 'vi'],
    ['en', 'en'],
    ['VI', 'vi'],
    ['EN', 'en'],
    ['vi-VN', 'vi'],
    ['en-US', 'en'],
    ['jp', 'en'],
    ['fr', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('normalizeLocale(%s) → %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
});

// ─── isSupportedLocale ────────────────────────────────────────────────────────
describe('isSupportedLocale', () => {
  it('returns true for each supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isSupportedLocale(locale)).toBe(true);
    }
  });

  it('returns false for unsupported locales', () => {
    expect(isSupportedLocale('jp')).toBe(false);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale('zh-TW')).toBe(false);
  });
});
