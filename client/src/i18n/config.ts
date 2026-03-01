import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── Namespace imports (Vite handles JSON natively) ──────────────────────────
import commonVI from './locales/vi/common.json';
import sidebarVI from './locales/vi/sidebar.json';
import productsVI from './locales/vi/products.json';
import ordersVI from './locales/vi/orders.json';

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
            },
        },

        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
