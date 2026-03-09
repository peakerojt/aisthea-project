# Task 11 - Cart System

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo cart system được lưu trên backend (database), không phải frontend (localStorage). Cart phải có cấu trúc chuẩn với bảng `cart` và `cart_items`.

## Vấn đề hiện tại

Nếu cart lưu ở localStorage/frontend:
- Mất cart khi đổi thiết bị
- Không sync giữa các tab
- Không thể restore cart sau khi logout/login

## Schema chuẩn

```prisma
model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id])
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String  @id @default(uuid())
  cartId    String
  cart      Cart    @relation(fields: [cartId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  @@unique([cartId, productId])
}
```

## API Cart chuẩn

```http
GET    /cart              # Lấy giỏ hàng của user
POST   /cart/items        # Thêm sản phẩm
PUT    /cart/items/:id    # Cập nhật số lượng
DELETE /cart/items/:id    # Xóa item
DELETE /cart              # Xóa toàn bộ giỏ (sau khi checkout)
```

## Checklist

- [ ] Kiểm tra `Cart` và `CartItem` đã có trong Prisma schema
- [ ] Kiểm tra cart API đang lưu vào DB hay localStorage
- [ ] Implement `cart.repository.ts`
- [ ] Implement `cart.service.ts` với business logic (thêm/sửa/xóa item)
- [ ] Xóa cart sau khi tạo order thành công
- [ ] Kiểm tra stock trước khi thêm vào cart
