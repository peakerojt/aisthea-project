# Task 16 - Performance: Caching

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Implement Redis caching cho các API có data ít thay đổi (products list, categories) để giảm tải database.

## Cài đặt

```bash
npm install ioredis
npm install @types/ioredis --save-dev
```

## Cấu hình Redis

```typescript
// server/src/utils/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export const CACHE_TTL = {
  PRODUCTS: 5 * 60,    // 5 phút
  CATEGORIES: 30 * 60, // 30 phút
  PRODUCT_DETAIL: 2 * 60, // 2 phút
};
```

## Cache Middleware

```typescript
export const cacheMiddleware = (ttl: number) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  const cached = await redis.get(key);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Override res.json để tự động cache kết quả
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    redis.setex(key, ttl, JSON.stringify(data));
    return originalJson(data);
  };

  next();
};
```

## Áp dụng

```typescript
// Chỉ cache GET requests
router.get('/products', cacheMiddleware(CACHE_TTL.PRODUCTS), productController.getProducts);
router.get('/categories', cacheMiddleware(CACHE_TTL.CATEGORIES), categoryController.getCategories);
```

## Invalidate Cache

```typescript
// Khi tạo/sửa/xóa product → xóa cache
await redis.del('cache:/products');
// Hoặc dùng pattern
const keys = await redis.keys('cache:/products*');
if (keys.length) await redis.del(...keys);
```

## Checklist

- [ ] Cài và cấu hình Redis local
- [ ] Tạo `redis.ts` utility
- [ ] Tạo `cache.middleware.ts`
- [ ] Cache `GET /products`
- [ ] Cache `GET /categories`
- [ ] Invalidate cache khi có product CRUD
- [ ] Thêm `REDIS_HOST` và `REDIS_PORT` vào `.env`
