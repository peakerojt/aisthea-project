# Task 05 - Security: Authorization Middleware

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo mọi route nhạy cảm đều có authorization check. Không check role → user thường có thể xóa/sửa sản phẩm.

## Vấn đề hiện tại

```typescript
// ❌ Không check role
router.delete('/products/:id', productController.deleteProduct);

// User thường có thể gọi DELETE /products/123 → xóa sản phẩm
```

## Middleware cần có

### 1. `authMiddleware` — Xác thực JWT token

```typescript
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
```

### 2. `adminMiddleware` — Kiểm tra role admin

```typescript
export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin only' });
  }
  next();
};
```

### 3. Áp dụng vào routes

```typescript
// ✅ Chỉ admin mới xóa được
router.delete('/products/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

// ✅ User đã đăng nhập mới tạo đơn
router.post('/orders', authMiddleware, orderController.createOrder);
```

## Checklist

- [ ] Kiểm tra `authMiddleware` đã có chưa và hoạt động đúng chưa
- [ ] Tạo/kiểm tra `adminMiddleware`
- [ ] Audit tất cả routes: route nào cần auth? route nào cần admin?
- [ ] Áp dụng middleware vào đúng routes
- [ ] Test: gọi API không có token → phải trả 401
- [ ] Test: gọi admin route với user thường → phải trả 403

## Ma trận phân quyền

| Route | Auth | Admin |
|-------|------|-------|
| GET /products | ❌ | ❌ |
| POST /products | ✅ | ✅ |
| DELETE /products/:id | ✅ | ✅ |
| POST /orders | ✅ | ❌ |
| GET /orders (all) | ✅ | ✅ |
| DELETE /users/:id | ✅ | ✅ |
