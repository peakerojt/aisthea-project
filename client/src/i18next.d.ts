// ── i18next TypeScript Module Augmentation ────────────────────────────────
// Strict type-checking is intentionally DISABLED to prevent deep nesting TS errors
// or required namespace format across the varied usage patterns in the project.

import 'i18next';

declare module 'i18next' {
    interface CustomTypeOptions {
        // By leaving this mostly empty or using default Types, 
        // we prevent type instantiation limit errors on `t`
        // when matching literal strings against the template definitions
        allowObjectInHTMLChildren: true;
    }
}

