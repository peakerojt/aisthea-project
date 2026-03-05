import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── Namespace imports (Vite handles JSON natively) ──────────────────────────
import commonVI from './locales/vi/common.json';
import sidebarVI from './locales/vi/sidebar.json';
import productsVI from './locales/vi/products.json';
import ordersVI from './locales/vi/orders.json';
import customersVI from './locales/vi/customers.json';
import couponsVI from './locales/vi/coupons.json';
import restockVI from './locales/vi/restock.json';
import returnsVI from './locales/vi/returns.json';
import rolesVI from './locales/vi/roles.json';
import analyticsVI from './locales/vi/analytics.json';
import categoriesVI from './locales/vi/categories.json';
import dashboardVI from './locales/vi/dashboard.json';
import errorsVI from './locales/vi/errors.json';
import messagesVI from './locales/vi/messages.json';
import enumsVI from './locales/vi/enums.json';
import trackingVI from './locales/vi/tracking.json';
import cartVI from './locales/vi/cart.json';

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
            },
        },

        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
