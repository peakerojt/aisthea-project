# Task 03 - API Design Review

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo API tuân theo RESTful standard: đúng HTTP method, đúng naming convention và có pagination.

## RESTful API chuẩn

```http
GET    /products          # Lấy danh sách
GET    /products/:id      # Lấy chi tiết
POST   /products          # Tạo mới
PUT    /products/:id      # Cập nhật
DELETE /products/:id      # Xóa
```

## Anti-pattern cần xóa

```http
# ❌ SAI - Anti REST
POST /getProducts
POST /deleteProduct
POST /updateProduct

# ✅ ĐÚNG
GET    /products
DELETE /products/:id
PUT    /products/:id
```

## Pagination

Tất cả API list phải hỗ trợ pagination:

```http
GET /products?page=1&limit=20
GET /orders?page=1&limit=10
GET /users?page=1&limit=50
```

Response format chuẩn:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Checklist

- [ ] Audit tất cả routes trong `server/src/routes/`
- [ ] Đổi tên bất kỳ route nào vi phạm REST convention
- [ ] Thêm `?page` và `?limit` query params vào tất cả API list
- [ ] Thêm middleware parse pagination params
- [ ] Cập nhật Postman/Swagger docs nếu có
- [ ] Test lại tất cả routes sau khi đổi tên

## Tham khảo

- REST API best practices: https://restfulapi.net/
