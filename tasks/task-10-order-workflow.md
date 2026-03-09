# Task 10 - Order Workflow (State Machine)

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Implement đúng order state machine cho e-commerce. Không chỉ có `pending → completed`.

## State Machine chuẩn

```
pending
  ↓
paid
  ↓
processing
  ↓
shipping
  ↓
delivered
  ↓ (nếu cần)
refunded

Hoặc từ bất kỳ state nào → cancelled
```

## Database

```prisma
enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  SHIPPING
  DELIVERED
  CANCELLED
  REFUNDED
}

model Order {
  id     String      @id @default(uuid())
  status OrderStatus @default(PENDING)
  ...
}
```

## Logic chuyển trạng thái

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['PAID', 'CANCELLED'],
  PAID:       ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPING', 'CANCELLED'],
  SHIPPING:   ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

export const canTransition = (from: string, to: string): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};
```

## Checklist

- [ ] Kiểm tra `OrderStatus` enum đã có đủ states chưa
- [ ] Thêm validation khi update status (không cho phép nhảy cóc)
- [ ] Cập nhật `order.service.ts` với transition validation
- [ ] Admin route để update status: `PUT /orders/:id/status`
- [ ] User chỉ được xem status, không tự update
- [ ] Test các transition hợp lệ và không hợp lệ
