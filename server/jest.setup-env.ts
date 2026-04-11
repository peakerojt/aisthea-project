const ensureEnv = (key: string, fallback: string) => {
  const current = process.env[key];
  if (!current) {
    process.env[key] = fallback;
  }
};

const ensureMinLengthEnv = (key: string, fallback: string, minLength: number) => {
  const current = process.env[key];
  if (!current || current.length < minLength) {
    process.env[key] = fallback;
  }
};

const ensureNotPlaceholderEnv = (key: string, fallback: string, placeholders: string[]) => {
  const current = process.env[key];
  if (!current || placeholders.includes(current)) {
    process.env[key] = fallback;
  }
};

ensureEnv('CI', 'true');
ensureEnv('NODE_ENV', 'test');
ensureEnv('DATABASE_URL', 'mysql://ci-user:ci-pass@127.0.0.1:3306/aisthea_ci');

ensureMinLengthEnv('JWT_SECRET', '12345678901234567890123456789012', 32);
ensureMinLengthEnv('REFRESH_SECRET', 'abcdefghijklmnopqrstuvwxyz123456', 32);
ensureMinLengthEnv('SESSION_SECRET', '12345678901234567890123456789012', 32);

ensureEnv('JWT_EXPIRES_IN', '15m');
ensureEnv('REFRESH_EXPIRES_IN', '7d');

ensureEnv('CLIENT_URL', 'http://localhost:3000');
ensureEnv('ALLOWED_ORIGINS', 'http://localhost:3000');
ensureEnv('SERVER_URL', 'http://localhost:5000');
ensureEnv('TRUST_PROXY', 'false');
ensureEnv('COOKIE_SECURE', 'false');
ensureEnv('COOKIE_SAME_SITE', 'lax');
ensureEnv('GOOGLE_CALLBACK_URL', 'http://localhost:5000/api/auth/google/callback');

ensureNotPlaceholderEnv('SMTP_HOST', 'smtp.gmail.com', []);
ensureNotPlaceholderEnv('SMTP_PORT', '587', []);
ensureEnv('SMTP_USER', '');
ensureEnv('SMTP_PASS', '');
ensureNotPlaceholderEnv('SMTP_FROM', 'AISTHEA <noreply@aisthea.com>', ['']);
ensureEnv('RESEND_API_KEY', '');
ensureNotPlaceholderEnv('RESEND_FROM', 'AISTHEA <noreply@aisthea.com>', ['']);
ensureEnv('EMAIL_USER', '');
ensureEnv('EMAIL_PASS', '');
ensureNotPlaceholderEnv('EMAIL_FROM', 'AISTHEA <noreply@aisthea.com>', ['']);

ensureEnv('VNP_TMN_CODE', 'TESTTMN');
ensureMinLengthEnv('VNP_HASH_SECRET', '12345678901234567890123456789012', 32);
ensureEnv('VNP_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
ensureEnv('VNP_RETURN_URL', 'http://localhost:3000/vnpay-return');
ensureEnv('VNP_API', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');

ensureEnv('CLOUDINARY_CLOUD_NAME', 'demo-cloud');
ensureEnv('CLOUDINARY_API_KEY', 'demo-api-key');
ensureEnv('CLOUDINARY_API_SECRET', 'demo-api-secret');

ensureEnv('GOOGLE_CLIENT_ID', '');
ensureEnv('GOOGLE_CLIENT_SECRET', '');
ensureEnv('WEATHER_API_KEY', '');
ensureEnv('OPENAI_API_KEY', '');
ensureEnv('OPENAI_MODEL', 'gpt-4o-mini');
ensureEnv('MOCK_AI', 'true');
ensureEnv('CLOUDFLARE_ACCOUNT_ID', '');
ensureEnv('CLOUDFLARE_API_TOKEN', '');
ensureEnv('CLOUDFLARE_AI_MODEL', '@cf/meta/llama-3-8b-instruct');
ensureEnv('SECURITY_RATE_LIMIT_MONITOR_ONLY', 'false');
ensureEnv('TZ', 'Asia/Ho_Chi_Minh');
