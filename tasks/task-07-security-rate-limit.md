# Task 07 - Security: Rate Limiting

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Thêm rate limiting cho các API nhạy cảm để chống brute force attack (đặc biệt là login endpoint).

## Vấn đề hiện tại

```typescript
// ❌ Không có rate limit - dễ bị brute force
router.post('/auth/login', authController.login);
// Attacker có thể thử hàng nghìn mật khẩu/phút
```

## Giải pháp

### Cài đặt

```bash
npm install express-rate-limit
```

### Cấu hình Rate Limiter

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit cho login - nghiêm ngặt
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max: 10,                    // tối đa 10 lần/15 phút
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đăng nhập, thử lại sau 15 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit cho API chung
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 phút
  max: 100,             // 100 request/phút
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
  },
});
```

### Áp dụng

```typescript
// Auth routes
router.post('/auth/login', loginLimiter, authController.login);
router.post('/auth/register', loginLimiter, authController.register);
router.post('/auth/forgot-password', loginLimiter, authController.forgotPassword);

// Toàn bộ API (global)
app.use('/api', apiLimiter);
```

## Checklist

- [ ] Cài `express-rate-limit`
- [ ] Tạo `rateLimiter.middleware.ts`
- [ ] Rate limit cho `POST /auth/login`
- [ ] Rate limit cho `POST /auth/register`
- [ ] Rate limit cho `POST /auth/forgot-password`
- [ ] Thêm global rate limit cho tất cả API
- [ ] Test: gọi login > 10 lần → phải trả 429

## Tham khảo

- express-rate-limit: https://github.com/express-rate-limit/express-rate-limit
