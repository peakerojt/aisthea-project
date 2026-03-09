# Task 12 - Stock Control

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Kiểm tra và trừ stock khi đặt hàng. Không check stock là lỗi nghiêm trọng — dẫn đến bán hàng khi hết hàng.

## Vấn đề hiện tại

```typescript
// ❌ Không kiểm tra stock
await prisma.order.create({ data: { ... } });
// Product có thể có stock = 0 mà vẫn order được
```

## Giải pháp (trong Transaction)

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Kiểm tra stock cho từng item
  for (const item of orderItems) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, name: true },
    });

    if (!product) throw new Error(`Sản phẩm không tồn tại`);
    if (product.stock < item.quantity) {
      throw new Error(`"${product.name}" không đủ hàng. Còn ${product.stock} sản phẩm.`);
    }
  }

  // 2. Tạo order
  const order = await tx.order.create({ data: { ... } });

  // 3. Trừ stock
  for (const item of orderItems) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return order;
});
```

## Checklist

- [ ] Kiểm tra `order.service.ts` có check stock không
- [ ] Wrap trong `prisma.$transaction()`
- [ ] Trừ stock khi tạo order thành công
- [ ] Hoàn trả stock khi order bị `CANCELLED` hoặc `REFUNDED`
- [ ] Thêm `stock >= 0` constraint trong Prisma schema
- [ ] Test: order quá số lượng → phải fail với message rõ ràng
