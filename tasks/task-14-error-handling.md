# Task 14 - Error Handling

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Chuẩn hóa error handling toàn bộ API. Response lỗi phải có format nhất quán, dễ hiểu cho client.

## Vấn đề hiện tại

```typescript
// ❌ Không return error đúng cách
try {
  // ...
} catch (e) {
  console.log(e); // Chỉ log, không response → client treo
  // hoặc
  res.status(500).send(e.message); // Response không nhất quán
}
```

## Giải pháp

### 1. Custom Error class

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Dùng trong service
throw new AppError(404, 'Sản phẩm không tìm thấy', 'PRODUCT_NOT_FOUND');
throw new AppError(400, 'Hết hàng', 'OUT_OF_STOCK');
```

### 2. Global Error Handler Middleware

```typescript
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Unexpected errors
  console.error(err);
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
};

// Trong app.ts - phải đặt CUỐI CÙNG
app.use(errorHandler);
```

### 3. Format response chuẩn

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Sản phẩm không tìm thấy", "code": "PRODUCT_NOT_FOUND" }
```

## Checklist

- [ ] Tạo `AppError` class
- [ ] Tạo `errorHandler` global middleware
- [ ] Đặt `errorHandler` cuối cùng trong `app.ts`
- [ ] Thay thế tất cả `catch(e) { console.log(e) }` bằng `next(e)`
- [ ] Chuẩn hóa response format (luôn có `success: boolean`)
- [ ] Handle `404` cho routes không tồn tại
