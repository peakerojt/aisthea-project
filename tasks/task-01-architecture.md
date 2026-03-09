# Task 01 - Architecture Review

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Refactor architecture theo Clean Architecture pattern. Hiện tại project đang đi theo flow:

```
route -> controller -> prisma
```

Dẫn đến **fat controller** — logic bị dồn vào controller, khó test và maintain.

## Vấn đề hiện tại

- Thiếu layer `repository`
- Thiếu layer `dto` (Data Transfer Object)
- Thiếu layer `validator`
- Controller đang gọi thẳng Prisma → không thể unit test dễ dàng

## Mục tiêu

Triển khai kiến trúc phân lớp chuẩn:

```
routes
  ↓
controller
  ↓
service
  ↓
repository
  ↓
database
```

## Checklist

- [ ] Tạo `product.repository.ts` — tách query Prisma ra khỏi service
- [ ] Tạo `order.repository.ts`
- [ ] Tạo `user.repository.ts`
- [ ] Tạo `cart.repository.ts`
- [ ] Refactor `product.controller.ts` — chỉ xử lý HTTP request/response
- [ ] Refactor `product.service.ts` — chứa business logic
- [ ] Áp dụng pattern tương tự cho tất cả module: `order`, `user`, `cart`, `review`

## Ví dụ cấu trúc file

```
server/src/
  ├── controllers/
  │   └── product.controller.ts
  ├── services/
  │   └── product.service.ts
  ├── repositories/
  │   └── product.repository.ts
  ├── dto/
  │   └── product.dto.ts
  └── routes/
      └── product.routes.ts
```

## Tham khảo

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Prisma best practices: tách query vào repository layer
