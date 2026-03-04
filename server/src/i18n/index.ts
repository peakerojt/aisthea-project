import i18next from 'i18next';
import enCommon from './locales/en/common.json';
import viCommon from './locales/vi/common.json';
import enTracking from './locales/en/tracking.json';
import viTracking from './locales/vi/tracking.json';

export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  en: {
    common: enCommon,
    tracking: enTracking,
  },
  vi: {
    common: viCommon,
    tracking: viTracking,
  },
};

let initialized = false;

export async function initI18n() {
  if (initialized) return;

  await i18next.init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });

  initialized = true;
}

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string): AppLocale {
  if (!value) return 'en';
  const normalized = value.toLowerCase().split('-')[0];
  return isSupportedLocale(normalized) ? normalized : 'en';
}

export function t(locale: AppLocale, key: string, params?: Record<string, unknown>): string {
  const translated = i18next.t(key, {
    lng: locale,
    ...params,
  });

  return typeof translated === 'string' && translated.length > 0 ? translated : key;
}
