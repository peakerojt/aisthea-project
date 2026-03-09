# Task 04 - Security: Input Validation

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Validate tất cả input từ phía client trước khi xử lý. Thiếu validation có thể cho phép insert dữ liệu sai (giá âm, tên rỗng, v.v.)

## Vấn đề hiện tại

```typescript
// ❌ Không validate
app.post('/products', async (req, res) => {
  const { name, price } = req.body;
  // insert thẳng vào DB -> nguy hiểm
  await prisma.product.create({ data: { name, price } });
});
```

## Giải pháp

Dùng **Zod** (khuyến nghị cho TypeScript):

```typescript
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được rỗng'),
  price: z.number().positive('Giá phải > 0'),
  stock: z.number().int().nonnegative('Số lượng không được âm'),
  categoryId: z.string().uuid(),
});

// Middleware validation
export const validateProduct = (req, res, next) => {
  const result = createProductSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
```

## Checklist

- [ ] Cài Zod: `npm install zod`
- [ ] Tạo schema validation cho `product` (create + update)
- [ ] Tạo schema validation cho `order` (create)
- [ ] Tạo schema validation cho `user` (register + update profile)
- [ ] Tạo schema validation cho `review` (create)
- [ ] Tạo middleware `validate.middleware.ts` tái sử dụng
- [ ] Áp dụng middleware vào tất cả POST/PUT routes

## Tham khảo

- Zod docs: https://zod.dev/
