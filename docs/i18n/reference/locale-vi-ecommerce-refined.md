
# Vietnamese Locale Refined – Ecommerce (AISTHEA)

Tài liệu này chuẩn hóa toàn bộ cách viết tiếng Việt cho hệ thống ecommerce + admin portal.

Mục tiêu:
- Tránh dịch literal từ tiếng Anh
- Đồng nhất thuật ngữ
- Phân tách rõ tone: storefront / admin / brand
- Dễ maintain khi thêm locale mới

---

# 1. Tone theo màn hình

## Storefront (khách hàng)
Đặc điểm:

- Ngắn
- Tự nhiên
- Tập trung hành động mua

Ví dụ tốt:

Thêm vào giỏ  
Thanh toán ngay  
Xem chi tiết  
Mua ngay  

Không nên:

Tiến hành thêm sản phẩm vào giỏ  
Thực hiện quy trình thanh toán  

---

## Admin

Đặc điểm:

- Rõ thao tác
- Dùng đúng thuật ngữ nghiệp vụ

Ví dụ tốt:

Lưu thay đổi  
Cập nhật trạng thái  
Xóa sản phẩm  

---

## Brand / Fashion

Đặc điểm:

- Mềm
- Lifestyle tone
- Tránh kỹ thuật

Ví dụ:

Khám phá bộ sưu tập  
Tư vấn phong cách  

---

# 2. Glossary chuẩn ecommerce

| English | Vietnamese |
|-------|------|
Product | Sản phẩm
Category | Danh mục
Collection | Bộ sưu tập
Variant | Biến thể
Cart | Giỏ hàng
Checkout | Thanh toán
Order | Đơn hàng
Return | Trả hàng
Refund | Hoàn tiền
Inventory | Tồn kho
Stock | Kho
Out of stock | Hết hàng
Low stock | Sắp hết hàng
Customer | Khách hàng
Coupon | Mã giảm giá

---

# 3. CTA chuẩn

| English | Vietnamese |
|-------|------|
Add to cart | Thêm vào giỏ
Buy now | Mua ngay
Checkout | Thanh toán
View details | Xem chi tiết
Continue shopping | Tiếp tục mua sắm
Save changes | Lưu thay đổi
Update | Cập nhật
Delete | Xóa
Cancel | Hủy

---

# 4. Order Status chuẩn

Dùng chung cho toàn hệ thống.

PENDING → Chờ xác nhận  
CONFIRMED → Đã xác nhận  
PROCESSING → Đang xử lý  
PACKING → Đang đóng gói  
SHIPPING → Đang giao hàng  
DELIVERED → Đã giao hàng  
COMPLETED → Hoàn thành  
CANCELLED → Đã hủy  

RETURN_REQUESTED → Yêu cầu trả hàng  
RETURNED → Đã trả hàng  

REFUNDED → Đã hoàn tiền  

Không dùng:

Đang giao  
Đã giao  
Đang chuẩn bị  

---

# 5. Cart Copy chuẩn

title: Giỏ hàng

empty.title:
Giỏ hàng của bạn đang trống

empty.subtitle:
Thêm sản phẩm vào giỏ để bắt đầu mua sắm.

actions.addToCart:
Thêm vào giỏ hàng

actions.checkout:
Thanh toán

actions.continueShopping:
Tiếp tục mua sắm

summary.subtotal:
Tạm tính

summary.total:
Tổng cộng

---

# 6. Checkout Copy chuẩn

title:
Thanh toán

sections.contactInfo:
Thông tin nhận hàng

sections.shipping:
Vận chuyển

sections.payment:
Thanh toán

actions.placeOrder:
Xác nhận đặt hàng

actions.backToCart:
Quay lại giỏ hàng

---

# 7. Orders Copy chuẩn

title:
Quản lý đơn hàng

fields.orderId:
Mã đơn

fields.customer:
Khách hàng

fields.total:
Tổng tiền

fields.status:
Trạng thái

actions.viewDetail:
Xem chi tiết

actions.updateStatus:
Cập nhật trạng thái

actions.cancelOrder:
Hủy đơn hàng

---

# 8. Product Copy chuẩn

title:
Sản phẩm

fields.name:
Tên sản phẩm

fields.price:
Giá bán

fields.stock:
Tồn kho

fields.category:
Danh mục

actions.create:
Thêm sản phẩm

actions.edit:
Chỉnh sửa

actions.delete:
Xóa

---

# 9. Coupon Copy chuẩn

title:
Mã giảm giá

fields.code:
Mã giảm giá

fields.discount:
Giảm giá

fields.expire:
Ngày hết hạn

actions.create:
Tạo mã

---

# 10. Returns Copy chuẩn

title:
Yêu cầu trả hàng

fields.reason:
Lý do

actions.approve:
Duyệt

actions.reject:
Từ chối

actions.refund:
Hoàn tiền

---

# 11. Customer Copy chuẩn

title:
Khách hàng

fields.name:
Tên

fields.email:
Email

fields.phone:
Số điện thoại

fields.status:
Trạng thái

---

# 12. Error Message chuẩn

NETWORK_ERROR
Không thể kết nối tới máy chủ.

FETCH_DATA_FAILED
Không thể tải dữ liệu.

INVALID_REQUEST
Dữ liệu không hợp lệ.

NOT_FOUND
Không tìm thấy dữ liệu.

UNAUTHORIZED
Vui lòng đăng nhập lại.

FORBIDDEN
Bạn không có quyền thực hiện thao tác này.

---

# 13. Toast Message chuẩn

CREATE_SUCCESS
Tạo thành công

UPDATE_SUCCESS
Cập nhật thành công

DELETE_SUCCESS
Xóa thành công

CART_ITEM_ADDED
Đã thêm vào giỏ hàng

ORDER_CREATED
Đặt hàng thành công

---

# 14. Quy tắc viết locale

1. Không dịch literal tiếng Anh  
2. Tránh câu dài  
3. CTA luôn bắt đầu bằng động từ  
4. Trạng thái dùng 1 cách gọi duy nhất  
5. Toast tối đa 1 câu  

---

# 15. Cấu trúc key đề xuất

actions
fields
labels
status
empty
errors
feedback
placeholders

Ví dụ:

cart.actions.checkout  
orders.status.SHIPPING  
products.fields.price  
checkout.errors.invalidEmail  

---

# 16. Lưu ý maintain

Khi thêm locale mới:

1. Kiểm tra glossary  
2. Không tự dịch  
3. Review UX copy trước khi commit  
