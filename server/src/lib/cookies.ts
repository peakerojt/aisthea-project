import type { CookieOptions, Response } from 'express';
import { env } from './env';

const baseCookieOptions = (): Pick<CookieOptions, 'path' | 'secure'> => ({
    path: '/',
    secure: env.cookieSecure,
});

export const buildSessionCookieOptions = (): CookieOptions => ({
    ...baseCookieOptions(),
    httpOnly: true,
    sameSite: env.cookieSameSite,
});

export const buildCsrfCookieOptions = (maxAge?: number): CookieOptions => ({
    ...baseCookieOptions(),
    httpOnly: false,
    sameSite: env.cookieSameSite,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
});

export const buildResetCookieOptions = (): CookieOptions => ({
    ...baseCookieOptions(),
    httpOnly: true,
    sameSite: 'strict',
});

export const clearSessionCookies = (res: Response) => {
    const sessionCookieOptions = buildSessionCookieOptions();
    res.clearCookie('accessToken', sessionCookieOptions);
    res.clearCookie('refreshToken', sessionCookieOptions);
};

export const clearCsrfCookie = (res: Response) => {
    res.clearCookie('csrfToken', buildCsrfCookieOptions());
};

export const clearResetCookie = (res: Response) => {
    res.clearCookie('resetToken', buildResetCookieOptions());
};
