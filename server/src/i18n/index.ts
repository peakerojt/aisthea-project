import i18next from 'i18next';
import enCommon from './locales/en/common.json';
import viCommon from './locales/vi/common.json';
import enAuth from './locales/en/auth.json';
import viAuth from './locales/vi/auth.json';
import enCategories from './locales/en/categories.json';
import viCategories from './locales/vi/categories.json';
import enProducts from './locales/en/products.json';
import viProducts from './locales/vi/products.json';
import enReviews from './locales/en/reviews.json';
import viReviews from './locales/vi/reviews.json';
import enOrders from './locales/en/orders.json';
import viOrders from './locales/vi/orders.json';
import enTracking from './locales/en/tracking.json';
import viTracking from './locales/vi/tracking.json';
import enUsers from './locales/en/users.json';
import viUsers from './locales/vi/users.json';
import enReturns from './locales/en/returns.json';
import viReturns from './locales/vi/returns.json';
import enPayments from './locales/en/payments.json';
import viPayments from './locales/vi/payments.json';
import enPurchaseOrders from './locales/en/purchaseOrders.json';
import viPurchaseOrders from './locales/vi/purchaseOrders.json';
import enRoles from './locales/en/roles.json';
import viRoles from './locales/vi/roles.json';
import enEmails from './locales/en/emails.json';
import viEmails from './locales/vi/emails.json';

export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    categories: enCategories,
    products: enProducts,
    reviews: enReviews,
    orders: enOrders,
    tracking: enTracking,
    users: enUsers,
    returns: enReturns,
    payments: enPayments,
    purchaseOrders: enPurchaseOrders,
    roles: enRoles,
    emails: enEmails,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    categories: viCategories,
    products: viProducts,
    reviews: viReviews,
    orders: viOrders,
    tracking: viTracking,
    users: viUsers,
    returns: viReturns,
    payments: viPayments,
    purchaseOrders: viPurchaseOrders,
    roles: viRoles,
    emails: viEmails,
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
  if (!i18next.exists(key, { lng: locale })) {
    if (key.includes(':')) {
      const parts = key.split(':');
      const nsPath = parts[1];
      const fallbackCommonKey = `common:${nsPath}`;
      if (nsPath && i18next.exists(fallbackCommonKey, { lng: locale })) {
        key = fallbackCommonKey;
      } else {
        return key;
      }
    } else {
      return key;
    }
  }

  const translated = i18next.t(key, {
    lng: locale,
    ...params,
  });

  return typeof translated === 'string' && translated.length > 0 ? translated : key;
}
