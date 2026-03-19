import { JwtPayload } from 'jsonwebtoken';

export interface AuthUserPayload extends JwtPayload {
  userId: number;
  email?: string;
  roles?: string[];
}

// Inlined here to avoid importing from '../i18n' at the ambient declaration level.
// Importing a runtime module from a .d.ts file processed early by ts-node causes
// TS2339 because the augmentation may be evaluated before the module graph is ready.
// Keep this in sync with SUPPORTED_LOCALES in src/i18n/index.ts.
type AppLocale = 'en' | 'vi';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      locale: AppLocale;
      traceId?: string;
    }
  }
}

export { };
