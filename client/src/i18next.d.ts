// ── i18next TypeScript Module Augmentation ────────────────────────────────
// This file enables strict type-checking and IDE autocomplete for all
// translation keys. When you type t('sidebar:nav.') VS Code will suggest
// all available keys from that namespace automatically.
//
// Font reminder: keep `Be Vietnam Pro` loaded in index.css or index.html.
// Example: @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap');

import 'i18next';

import type commonVI from './i18n/locales/vi/common.json';
import type sidebarVI from './i18n/locales/vi/sidebar.json';
import type productsVI from './i18n/locales/vi/products.json';
import type ordersVI from './i18n/locales/vi/orders.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        /** Default namespace used when none is specified: `t('save')` → common.json */
        defaultNS: 'common';
        resources: {
            common: typeof commonVI;
            sidebar: typeof sidebarVI;
            products: typeof productsVI;
            orders: typeof ordersVI;
        };
    }
}
