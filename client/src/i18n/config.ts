import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonVI from '@/i18n/locales/vi/common.json';
import cartVI from '@/i18n/locales/vi/cart.json';
import pagesVI from '@/i18n/locales/vi/pages.json';
import productsVI from '@/i18n/locales/vi/products.json';

export type ViNamespace =
  | 'analytics'
  | 'cart'
  | 'categories'
  | 'common'
  | 'coupons'
  | 'customers'
  | 'dashboard'
  | 'enums'
  | 'errors'
  | 'messages'
  | 'orders'
  | 'pages'
  | 'products'
  | 'restock'
  | 'returns'
  | 'roles'
  | 'sidebar'
  | 'tracking';

const namespaceLoaders: Record<ViNamespace, () => Promise<unknown>> = {
  analytics: () => import('@/i18n/locales/vi/analytics.json'),
  cart: () => import('@/i18n/locales/vi/cart.json'),
  categories: () => import('@/i18n/locales/vi/categories.json'),
  common: () => import('@/i18n/locales/vi/common.json'),
  coupons: () => import('@/i18n/locales/vi/coupons.json'),
  customers: () => import('@/i18n/locales/vi/customers.json'),
  dashboard: () => import('@/i18n/locales/vi/dashboard.json'),
  enums: () => import('@/i18n/locales/vi/enums.json'),
  errors: () => import('@/i18n/locales/vi/errors.json'),
  messages: () => import('@/i18n/locales/vi/messages.json'),
  orders: () => import('@/i18n/locales/vi/orders.json'),
  pages: () => import('@/i18n/locales/vi/pages.json'),
  products: () => import('@/i18n/locales/vi/products.json'),
  restock: () => import('@/i18n/locales/vi/restock.json'),
  returns: () => import('@/i18n/locales/vi/returns.json'),
  roles: () => import('@/i18n/locales/vi/roles.json'),
  sidebar: () => import('@/i18n/locales/vi/sidebar.json'),
  tracking: () => import('@/i18n/locales/vi/tracking.json'),
};

const initialNamespaces: Record<Extract<ViNamespace, 'common' | 'pages' | 'products' | 'cart'>, unknown> = {
  common: commonVI,
  pages: pagesVI,
  products: productsVI,
  cart: cartVI,
};

const namespacePromises = new Map<ViNamespace, Promise<void>>();

const resolveLoadedNamespace = async (namespace: ViNamespace): Promise<void> => {
  if (i18n.hasResourceBundle('vi', namespace)) {
    return;
  }

  const module = await namespaceLoaders[namespace]();
  const resource = 'default' in (module as Record<string, unknown>)
    ? (module as { default: unknown }).default
    : module;

  i18n.addResourceBundle('vi', namespace, resource, true, true);
};

export const loadNamespaces = async (namespaces: ViNamespace[]): Promise<void> => {
  const missingNamespaces = namespaces.filter((namespace) => !i18n.hasResourceBundle('vi', namespace));

  if (missingNamespaces.length === 0) {
    return;
  }

  await Promise.all(
    missingNamespaces.map((namespace) => {
      const existingPromise = namespacePromises.get(namespace);
      if (existingPromise) {
        return existingPromise;
      }

      const namespacePromise = resolveLoadedNamespace(namespace).finally(() => {
        namespacePromises.delete(namespace);
      });
      namespacePromises.set(namespace, namespacePromise);
      return namespacePromise;
    })
  );
};

export const getStoreNamespacesForPath = (path: string): ViNamespace[] => {
  const normalizedPath = path.split(/[?#]/)[0] || '/';
  const namespaces = new Set<ViNamespace>(['common', 'pages', 'products', 'cart']);

  if (normalizedPath.startsWith('/tracking')) {
    namespaces.add('tracking');
  }

  if (
    normalizedPath.startsWith('/orders') ||
    normalizedPath.startsWith('/my-orders') ||
    normalizedPath.startsWith('/profile') ||
    normalizedPath.startsWith('/payment-qr') ||
    normalizedPath.startsWith('/order-success') ||
    normalizedPath.startsWith('/vnpay-return')
  ) {
    namespaces.add('returns');
    namespaces.add('enums');
  }

  return [...namespaces];
};

export const adminNamespaces: ViNamespace[] = [
  'analytics',
  'categories',
  'common',
  'coupons',
  'customers',
  'dashboard',
  'enums',
  'errors',
  'messages',
  'orders',
  'pages',
  'products',
  'restock',
  'returns',
  'roles',
  'sidebar',
  'tracking',
];

i18n
  .use(initReactI18next)
  .init({
    lng: 'vi',
    fallbackLng: 'vi',
    defaultNS: 'common',
    resources: {
      vi: initialNamespaces,
    },
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
