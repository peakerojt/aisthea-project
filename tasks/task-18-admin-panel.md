# Task 18 - Admin Panel

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo Admin Panel có đủ chức năng quản lý cần thiết cho một e-commerce.

## Chức năng bắt buộc

| Chức năng | Route | Trạng thái |
|-----------|-------|------------|
| Dashboard (thống kê) | `/admin/dashboard` | ❓ |
| Quản lý sản phẩm | `/admin/products` | ❓ |
| Quản lý đơn hàng | `/admin/orders` | ❓ |
| Quản lý người dùng | `/admin/users` | ❓ |
| Analytics | `/admin/analytics` | ❓ |

## Dashboard - Các metrics cần thiết

```typescript
// GET /admin/dashboard
{
  "totalRevenue": 15000000,
  "totalOrders": 125,
  "totalUsers": 89,
  "totalProducts": 45,
  "recentOrders": [...],
  "topProducts": [...],
  "revenueByDay": [...]
}
```

## API Admin cần có

```http
# Dashboard
GET  /admin/dashboard/stats

# Products
GET    /admin/products            # List với filter + search
POST   /admin/products            # Tạo mới
PUT    /admin/products/:id        # Cập nhật
DELETE /admin/products/:id        # Xóa

# Orders
GET  /admin/orders                # List tất cả orders
PUT  /admin/orders/:id/status     # Cập nhật trạng thái

# Users
GET  /admin/users                 # List users
PUT  /admin/users/:id/ban         # Ban user
```

## Checklist

- [ ] Kiểm tra tất cả routes admin đã có chưa
- [ ] Dashboard stats API trả về đúng số liệu
- [ ] Product management CRUD hoàn chỉnh
- [ ] Order management với update status
- [ ] User management (list + ban)
- [ ] Tất cả routes admin phải có `authMiddleware` + `adminMiddleware`
- [ ] Frontend: kiểm tra sidebar admin đủ menu
