# Task 15 - Logging

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Thiết lập hệ thống logging chuyên nghiệp dùng Winston và Morgan. Log các sự kiện quan trọng để debug và monitor production.

## Cài đặt

```bash
npm install winston morgan
npm install @types/morgan --save-dev
```

## Cấu hình Winston

```typescript
// server/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({ format: winston.format.simple() })]
      : []),
  ],
});
```

## Cấu hình Morgan (HTTP request logging)

```typescript
// Trong app.ts
import morgan from 'morgan';
import { logger } from './utils/logger';

const morganStream = { write: (message: string) => logger.info(message.trim()) };
app.use(morgan('combined', { stream: morganStream }));
```

## Những gì cần log

```typescript
// Login
logger.info('User logged in', { userId, email, ip: req.ip });

// Order
logger.info('Order created', { orderId, userId, totalAmount });

// Errors
logger.error('Order creation failed', { error: err.message, userId });

// Security events
logger.warn('Failed login attempt', { email, ip: req.ip });
```

## Checklist

- [ ] Cài `winston` và `morgan`
- [ ] Tạo `logger.ts` utility
- [ ] Thêm Morgan vào `app.ts`
- [ ] Log event login/logout
- [ ] Log event tạo order
- [ ] Log tất cả errors trong `errorHandler`
- [ ] Thêm `logs/` vào `.gitignore`
