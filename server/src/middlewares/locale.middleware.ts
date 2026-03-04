import { NextFunction, Request, Response } from 'express';
import { AppLocale, normalizeLocale } from '../i18n';

const ACCEPT_LANGUAGE_SEPARATOR = ',';

function getFirstLanguageFromAcceptLanguage(headerValue?: string): string | undefined {
  if (!headerValue) return undefined;
  return headerValue.split(ACCEPT_LANGUAGE_SEPARATOR)[0]?.trim();
}

export function resolveRequestLocale(req: Request): AppLocale {
  const xLang = req.header('x-lang');
  if (xLang) return normalizeLocale(xLang);

  const acceptLanguage = getFirstLanguageFromAcceptLanguage(req.header('accept-language'));
  if (acceptLanguage) return normalizeLocale(acceptLanguage);

  return 'en';
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.locale = resolveRequestLocale(req);
  next();
}
