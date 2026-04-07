import { z } from 'zod';
import { logger } from './logger';
import { loadEnv } from './load-env';

loadEnv();

type CookieSameSite = 'lax' | 'strict' | 'none';

const stripWrappingQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '');
const normalizeOptionalEnvValue = (value: string) => stripWrappingQuotes(value).trim();
const normalizeSmtpPassword = (value: string) => normalizeOptionalEnvValue(value).replace(/\s+/g, '');
const resolvePreferredEnvValue = (preferred: string, fallback: string) =>
    normalizeOptionalEnvValue(preferred || fallback);
const resolvePreferredSmtpPassword = (preferred: string, fallback: string) =>
    normalizeSmtpPassword(preferred || fallback);
const normalizeOrigin = (value: string) => {
    const normalizedValue = normalizeOptionalEnvValue(value);
    if (!normalizedValue) return '';

    try {
        return new URL(normalizedValue).origin;
    } catch {
        return normalizedValue;
    }
};
const parseCsvOrigins = (value: string) =>
    normalizeOptionalEnvValue(value)
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean);
const parseBooleanEnv = (value: string, fallback: boolean) => {
    const normalizedValue = normalizeOptionalEnvValue(value).toLowerCase();
    if (!normalizedValue) return fallback;

    if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalizedValue)) return false;

    return fallback;
};
const parseCookieSameSite = (value: string, fallback: CookieSameSite): CookieSameSite => {
    const normalizedValue = normalizeOptionalEnvValue(value).toLowerCase();
    if (normalizedValue === 'lax' || normalizedValue === 'strict' || normalizedValue === 'none') {
        return normalizedValue;
    }

    return fallback;
};

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),

    // Database / Prisma
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
    REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Client
    CLIENT_URL: z.string().default('http://localhost:3000'),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    SERVER_URL: z.string().default('http://localhost:5000'),
    TRUST_PROXY: z.string().optional().default(''),
    COOKIE_SECURE: z.string().optional().default(''),
    COOKIE_SAME_SITE: z.string().optional().default(''),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),

    // VNPay
    VNP_TMN_CODE: z.string().optional().default(''),
    VNP_HASH_SECRET: z.string().optional().default(''),
    VNP_URL: z.string().optional().default(''),
    VNP_RETURN_URL: z.string().optional().default(''),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
    GOOGLE_CALLBACK_URL: z.string().optional().default(''),

    // Email (SMTP_* preferred, EMAIL_* kept for backward compatibility)
    SMTP_HOST: z.string().default('smtp.gmail.com').transform(normalizeOptionalEnvValue),
    SMTP_PORT: z.string().default('587').transform((val) => parseInt(val, 10)),
    SMTP_USER: z.string().optional().default('').transform(normalizeOptionalEnvValue),
    SMTP_PASS: z.string().optional().default('').transform(normalizeSmtpPassword),
    SMTP_FROM: z.string().optional().default('').transform(normalizeOptionalEnvValue),
    RESEND_API_KEY: z.string().optional().default('').transform(normalizeOptionalEnvValue),
    RESEND_FROM: z.string().optional().default('').transform(normalizeOptionalEnvValue),
    EMAIL_USER: z.string().optional().default('').transform(normalizeOptionalEnvValue),
    EMAIL_PASS: z.string().optional().default('').transform(normalizeSmtpPassword),
    EMAIL_FROM: z.string().optional().default('').transform(normalizeOptionalEnvValue),

    // Weather + AI
    WEATHER_API_KEY: z.string().optional().default(''),
    OPENAI_API_KEY: z.string().optional().default(''),
    OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
    MOCK_AI: z.string().optional().default('false'),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional().default(''),
    CLOUDFLARE_API_TOKEN: z.string().optional().default(''),
    CLOUDFLARE_AI_MODEL: z.string().optional().default('@cf/meta/llama-3-8b-instruct'),
    SECURITY_RATE_LIMIT_MONITOR_ONLY: z.string().optional().default('false'),
});

const _parsedEnv = envSchema.safeParse(process.env);

if (!_parsedEnv.success) {
    logger.error('❌ Invalid environment variables', { errors: _parsedEnv.error.format() });
    throw new Error('Invalid environment variables');
}

const normalizedClientUrl = normalizeOptionalEnvValue(_parsedEnv.data.CLIENT_URL);
const normalizedServerUrl = normalizeOptionalEnvValue(_parsedEnv.data.SERVER_URL);
const allowedOrigins = Array.from(
    new Set([
        normalizeOrigin(normalizedClientUrl),
        ...parseCsvOrigins(_parsedEnv.data.ALLOWED_ORIGINS),
    ].filter(Boolean)),
);
const cookieSameSite = parseCookieSameSite(
    _parsedEnv.data.COOKIE_SAME_SITE,
    _parsedEnv.data.NODE_ENV === 'production' ? 'none' : 'lax',
);
const cookieSecure =
    cookieSameSite === 'none'
        ? true
        : parseBooleanEnv(_parsedEnv.data.COOKIE_SECURE, _parsedEnv.data.NODE_ENV === 'production');
const trustProxy = parseBooleanEnv(_parsedEnv.data.TRUST_PROXY, _parsedEnv.data.NODE_ENV === 'production');

export const env = {
    nodeEnv: _parsedEnv.data.NODE_ENV,
    port: _parsedEnv.data.PORT,
    databaseUrl: _parsedEnv.data.DATABASE_URL,
    jwtSecret: _parsedEnv.data.JWT_SECRET,
    refreshSecret: _parsedEnv.data.REFRESH_SECRET,
    jwtExpiresIn: _parsedEnv.data.JWT_EXPIRES_IN,
    refreshExpiresIn: _parsedEnv.data.REFRESH_EXPIRES_IN,
    clientUrl: normalizedClientUrl,
    allowedOrigins,
    serverUrl: normalizedServerUrl,
    trustProxy,
    cookieSecure,
    cookieSameSite,
    cloudinaryCloudName: _parsedEnv.data.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: _parsedEnv.data.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: _parsedEnv.data.CLOUDINARY_API_SECRET,
    vnpayTmnCode: _parsedEnv.data.VNP_TMN_CODE,
    vnpayHashSecret: _parsedEnv.data.VNP_HASH_SECRET,
    vnpayUrl: _parsedEnv.data.VNP_URL,
    vnpayReturnUrl: _parsedEnv.data.VNP_RETURN_URL,
    googleClientId: _parsedEnv.data.GOOGLE_CLIENT_ID,
    googleClientSecret: _parsedEnv.data.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: _parsedEnv.data.GOOGLE_CALLBACK_URL,
    smtpHost: _parsedEnv.data.SMTP_HOST,
    smtpPort: _parsedEnv.data.SMTP_PORT,
    smtpUser: resolvePreferredEnvValue(_parsedEnv.data.SMTP_USER, _parsedEnv.data.EMAIL_USER),
    smtpPass: resolvePreferredSmtpPassword(_parsedEnv.data.SMTP_PASS, _parsedEnv.data.EMAIL_PASS),
    smtpFrom:
        resolvePreferredEnvValue(_parsedEnv.data.SMTP_FROM, _parsedEnv.data.EMAIL_FROM) ||
        'AISTHEA <noreply@aisthea.com>',
    resendApiKey: _parsedEnv.data.RESEND_API_KEY,
    resendFrom:
        normalizeOptionalEnvValue(_parsedEnv.data.RESEND_FROM) ||
        resolvePreferredEnvValue(_parsedEnv.data.SMTP_FROM, _parsedEnv.data.EMAIL_FROM) ||
        'AISTHEA <noreply@aisthea.com>',
    emailUser: resolvePreferredEnvValue(_parsedEnv.data.SMTP_USER, _parsedEnv.data.EMAIL_USER),
    emailPass: resolvePreferredSmtpPassword(_parsedEnv.data.SMTP_PASS, _parsedEnv.data.EMAIL_PASS),
    emailFrom:
        resolvePreferredEnvValue(_parsedEnv.data.SMTP_FROM, _parsedEnv.data.EMAIL_FROM) ||
        'AISTHEA <noreply@aisthea.com>',
    weatherApiKey: _parsedEnv.data.WEATHER_API_KEY,
    openAiApiKey: _parsedEnv.data.OPENAI_API_KEY,
    openAiModel: _parsedEnv.data.OPENAI_MODEL,
    mockAi: _parsedEnv.data.MOCK_AI === 'true',
    cloudflareAccountId: _parsedEnv.data.CLOUDFLARE_ACCOUNT_ID,
    cloudflareApiToken: _parsedEnv.data.CLOUDFLARE_API_TOKEN,
    cloudflareAiModel: _parsedEnv.data.CLOUDFLARE_AI_MODEL,
    securityRateLimitMonitorOnly: _parsedEnv.data.SECURITY_RATE_LIMIT_MONITOR_ONLY === 'true',
} as const;
