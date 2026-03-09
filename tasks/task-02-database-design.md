# Task 02 - Database Design Review

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Review và fix database design cho e-commerce chuẩn. Đảm bảo đủ các bảng cần thiết, đúng quan hệ và có index phù hợp.

## Các bảng bắt buộc cho E-commerce

| Bảng | Mô tả | Trạng thái |
|------|-------|------------|
| `users` | Quản lý người dùng | ✅ |
| `products` | Quản lý sản phẩm | ✅ |
| `categories` | Danh mục sản phẩm | ✅ |
| `orders` | Đơn hàng | ✅ |
| `order_items` | Chi tiết từng item trong đơn | ⚠️ Kiểm tra |
| `cart` | Giỏ hàng | ✅ |
| `cart_items` | Chi tiết giỏ hàng | ⚠️ Kiểm tra |
| `reviews` | Đánh giá sản phẩm | ✅ |
| `payments` | Thanh toán | ⚠️ Kiểm tra |

## Schema chuẩn Order + Order Items

```sql
-- orders
id          INT PRIMARY KEY
user_id     INT REFERENCES users(id)
status      ENUM('pending','paid','processing','shipping','delivered','cancelled','refunded')
total_price DECIMAL(10,2)
created_at  TIMESTAMP

-- order_items
id          INT PRIMARY KEY
order_id    INT REFERENCES orders(id)
product_id  INT REFERENCES products(id)
quantity    INT
price       DECIMAL(10,2)
```

## Vấn đề hiện tại

- [ ] Kiểm tra `order_items` đã tồn tại chưa (không được lưu `productId` trực tiếp trong `orders`)
- [ ] Kiểm tra `cart_items` đã tồn tại chưa

## Index bắt buộc

```sql
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

## Checklist

- [ ] Kiểm tra tất cả bảng đã có trong `schema.prisma`
- [ ] Thêm index vào `schema.prisma` (field `@@index`)
- [ ] Đảm bảo `order_items` có `order_id`, `product_id`, `quantity`, `price`
- [ ] Đảm bảo `cart_items` có `cart_id`, `product_id`, `quantity`
- [ ] Review quan hệ FK giữa các bảng
- [ ] Chạy `prisma migrate` sau khi cập nhật schema

## Tham khảo

- Prisma schema docs: https://www.prisma.io/docs/concepts/components/prisma-schema
