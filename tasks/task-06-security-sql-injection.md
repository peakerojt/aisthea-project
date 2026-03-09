# Task 06 - Security: SQL Injection Prevention

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Ngăn chặn SQL Injection khi sử dụng raw queries với Prisma.

## Vấn đề hiện tại

```typescript
// ❌ NGUY HIỂM - SQL Injection
const results = await prisma.$queryRaw(
  `SELECT * FROM products WHERE name = '${req.body.name}'`
);
// Attacker nhập: ' OR '1'='1 → lộ toàn bộ DB
```

## Giải pháp

### 1. Dùng Prisma ORM methods (ưu tiên)

```typescript
// ✅ AN TOÀN - Prisma tự escape
const products = await prisma.product.findMany({
  where: { name: { contains: req.query.name } },
});
```

### 2. Nếu bắt buộc dùng raw query — dùng tagged template

```typescript
// ✅ AN TOÀN - Prisma tagged template literal tự sanitize
const results = await prisma.$queryRaw`
  SELECT * FROM products WHERE name = ${req.body.name}
`;
```

## Checklist

- [ ] Tìm tất cả `prisma.$queryRaw` trong codebase
- [ ] Kiểm tra có dùng string interpolation không (dấu `${}`)
- [ ] Chuyển sang Prisma ORM methods nếu có thể
- [ ] Nếu phải dùng raw → chuyển sang tagged template literal `prisma.$queryRaw\`...\``
- [ ] Tìm bất kỳ `$executeRaw` nào và áp dụng tương tự

## Lệnh tìm kiếm

```bash
grep -rn "queryRaw\|executeRaw" server/src/
```
