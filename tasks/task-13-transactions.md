# Task 13 - Database Transactions

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Bọc tất cả các operation có nhiều bước trong `prisma.$transaction()` để đảm bảo data consistency. Nếu một bước fail → rollback toàn bộ.

## Vấn đề hiện tại

```typescript
// ❌ Không dùng transaction - nguy hiểm
const order = await prisma.order.create({ data: orderData });      // Step 1 ✅
await prisma.orderItem.createMany({ data: itemsData });             // Step 2 ✅
await prisma.product.update({ data: { stock: { decrement: 1 } } }); // Step 3 ❌ FAIL?

// Kết quả: order và items đã tạo, nhưng stock không bị trừ → data corrupt!
```

## Giải pháp

```typescript
// ✅ Dùng transaction - an toàn
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Tạo order
  const order = await tx.order.create({ data: orderData });

  // Step 2: Tạo order items
  await tx.orderItem.createMany({ data: itemsData });

  // Step 3: Trừ stock
  for (const item of orderItems) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  // Nếu bất kỳ bước nào throw error → tự động rollback tất cả
  return order;
});
```

## Các luồng cần Transaction

| Luồng | Các bước |
|--------|----------|
| Tạo Order | create order → create order_items → update stock |
| Cancel Order | update order status → restore stock |
| Refund | update order status → create refund record → restore stock |
| Checkout | clear cart → create order → update stock |

## Checklist

- [ ] `order.service.ts` — Wrap tạo order trong `$transaction`
- [ ] `order.service.ts` — Wrap cancel/refund trong `$transaction`
- [ ] Kiểm tra không có side effects ngoài transaction (gọi API bên ngoài trong TX)
- [ ] Test: giả lập lỗi ở bước 2 → bước 1 phải bị rollback
