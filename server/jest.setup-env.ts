process.env.CI = process.env.CI || 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'mysql://ci-user:ci-pass@127.0.0.1:3306/aisthea_ci';

process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012';
process.env.REFRESH_SECRET =
  process.env.REFRESH_SECRET || 'abcdefghijklmnopqrstuvwxyz123456';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || '12345678901234567890123456789012';

process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || 'false';
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE || 'false';
process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';

process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

process.env.VNP_TMN_CODE = process.env.VNP_TMN_CODE || 'TESTTMN';
process.env.VNP_HASH_SECRET =
  process.env.VNP_HASH_SECRET || '12345678901234567890123456789012';
process.env.VNP_URL =
  process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNP_RETURN_URL =
  process.env.VNP_RETURN_URL || 'http://localhost:3000/vnpay-return';
process.env.VNP_API =
  process.env.VNP_API || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'demo-cloud';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'demo-api-key';
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || 'demo-api-secret';

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
process.env.WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
process.env.MOCK_AI = process.env.MOCK_AI || 'true';
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';
