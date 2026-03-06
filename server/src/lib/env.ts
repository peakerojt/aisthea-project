import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`[env] Missing required environment variable: ${key}`);
    }
    return value;
}

function optional(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

/**
 * Typed, validated environment configuration.
 * Throws at startup if a required variable is missing.
 */
export const env = {
    nodeEnv: optional('NODE_ENV', 'development'),
    port: parseInt(optional('PORT', '5000'), 10),

    // Database / Prisma
    databaseUrl: required('DATABASE_URL'),

    // JWT
    jwtSecret: required('JWT_SECRET'),
    refreshSecret: required('REFRESH_SECRET'),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('REFRESH_EXPIRES_IN', '7d'),

    // Client
    clientUrl: optional('CLIENT_URL', 'http://localhost:3000'),

    // Cloudinary
    cloudinaryCloudName: optional('CLOUDINARY_CLOUD_NAME', ''),
    cloudinaryApiKey: optional('CLOUDINARY_API_KEY', ''),
    cloudinaryApiSecret: optional('CLOUDINARY_API_SECRET', ''),

    // VNPay
    vnpayTmnCode: optional('VNP_TMN_CODE', ''),
    vnpayHashSecret: optional('VNP_HASH_SECRET', ''),
    vnpayUrl: optional('VNP_URL', ''),
    vnpayReturnUrl: optional('VNP_RETURN_URL', ''),

    // Google OAuth
    googleClientId: optional('GOOGLE_CLIENT_ID', ''),
    googleClientSecret: optional('GOOGLE_CLIENT_SECRET', ''),
    googleCallbackUrl: optional('GOOGLE_CALLBACK_URL', ''),

    // Email
    emailUser: optional('EMAIL_USER', ''),
    emailPass: optional('EMAIL_PASS', ''),
    emailFrom: optional('EMAIL_FROM', ''),
} as const;
