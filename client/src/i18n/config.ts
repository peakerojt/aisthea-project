import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── Namespace imports (Vite handles JSON natively) ──────────────────────────
import commonVI from '@/i18n/locales/vi/common.json';
import sidebarVI from '@/i18n/locales/vi/sidebar.json';
import productsVI from '@/i18n/locales/vi/products.json';
import ordersVI from '@/i18n/locales/vi/orders.json';
import customersVI from '@/i18n/locales/vi/customers.json';
import couponsVI from '@/i18n/locales/vi/coupons.json';
import restockVI from '@/i18n/locales/vi/restock.json';
import returnsVI from '@/i18n/locales/vi/returns.json';
import rolesVI from '@/i18n/locales/vi/roles.json';
import analyticsVI from '@/i18n/locales/vi/analytics.json';
import categoriesVI from '@/i18n/locales/vi/categories.json';
import dashboardVI from '@/i18n/locales/vi/dashboard.json';
import errorsVI from '@/i18n/locales/vi/errors.json';
import messagesVI from '@/i18n/locales/vi/messages.json';
import enumsVI from '@/i18n/locales/vi/enums.json';
import trackingVI from '@/i18n/locales/vi/tracking.json';
import cartVI from '@/i18n/locales/vi/cart.json';
import pagesVI from '@/i18n/locales/vi/pages.json';

// ── i18next initialisation ──────────────────────────────────────────────────
i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        lng: 'vi',           // active language
        fallbackLng: 'vi',   // fallback (important for missing keys)
        defaultNS: 'common', // default namespace when none is specified

        resources: {
            vi: {
                common: commonVI,
                sidebar: sidebarVI,
                products: productsVI,
                orders: ordersVI,
                customers: customersVI,
                coupons: couponsVI,
                restock: restockVI,
                returns: returnsVI,
                roles: rolesVI,
                analytics: analyticsVI,
                categories: categoriesVI,
                dashboard: dashboardVI,
                errors: errorsVI,
                messages: messagesVI,
                enums: enumsVI,
                tracking: trackingVI,
                cart: cartVI,
                pages: pagesVI,
            },
        },

        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
