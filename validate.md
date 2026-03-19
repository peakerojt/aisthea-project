# Prompt: Thiết kế và rà soát validate nhập liệu FE + BE cho dự án e-commerce retail nhỏ

Bạn là **Senior Fullstack Architect + QA + Security Reviewer**.
Nhiệm vụ của bạn là giúp tôi thiết kế, rà soát, và chuẩn hóa toàn bộ cơ chế **validate dữ liệu đầu vào ở Frontend (FE) và Backend (BE)** cho một dự án **e-commerce retailing cá nhân quy mô nhỏ**, nhằm giảm lỗi nghiệp vụ, lỗi dữ liệu, lỗi bảo mật, và sai lệch giữa FE/BE.

## 1) Bối cảnh dự án

Dự án của tôi là một website/app bán lẻ nhỏ, có các nhóm chức năng phổ biến như:

* đăng ký / đăng nhập / quên mật khẩu
* quản lý hồ sơ người dùng
* danh mục sản phẩm
* tìm kiếm / lọc / sắp xếp
* giỏ hàng
* đặt hàng / checkout
* địa chỉ giao hàng
* thanh toán
* mã giảm giá / voucher
* đánh giá sản phẩm
* form quản trị cơ bản cho sản phẩm, tồn kho, đơn hàng

## 2) Mục tiêu

Hãy giúp tôi tạo một giải pháp validate toàn diện, thực tế, dễ áp dụng cho dự án nhỏ, gồm:

* xác định các loại dữ liệu cần validate ở FE và BE
* phân biệt rõ validate nào làm ở FE, validate nào bắt buộc làm ở BE, validate nào cần làm ở cả hai
* tránh các lỗi thường gặp như:

  * thiếu required field
  * sai định dạng email / số điện thoại / mật khẩu
  * nhập chuỗi quá dài / quá ngắn
  * số lượng mua âm, bằng 0, hoặc vượt tồn kho
  * giá trị enum không hợp lệ
  * dữ liệu bị trim sai hoặc không normalize
  * payload bị thiếu field hoặc thừa field bất thường
  * user chỉnh sửa request thủ công bypass FE
  * lỗi race condition ở giỏ hàng / tồn kho / voucher
  * validate không đồng nhất giữa FE và BE
  * trả lỗi quá kỹ thuật gây khó hiểu cho người dùng
  * thiếu mã lỗi chuẩn để FE xử lý

## 3) Yêu cầu đầu ra

Hãy trả lời theo đúng cấu trúc sau:

### A. Nguyên tắc kiến trúc validate tổng thể

Trình bày ngắn gọn nhưng thực chiến:

* nguyên tắc “FE để tăng UX, BE là nguồn sự thật cuối cùng”
* không tin dữ liệu từ client
* validate theo nhiều lớp: UI, API, business rule, database
* sanitize / normalize / validate khác nhau thế nào
* cách tránh duplicated logic nhưng vẫn đồng nhất rule

### B. Bảng phân loại validate theo lớp

Lập bảng rõ ràng với các cột:

* Loại validate
* Ví dụ
* FE
* BE
* DB
* Ghi chú

Bảng cần bao gồm ít nhất:

* required
* type check
* format check
* min/max length
* min/max value
* enum
* cross-field validation
* business rule validation
* permission / ownership validation
* anti-tampering validation
* id/reference existence
* stock validation
* coupon validation
* payment/order amount validation

### C. Phân tích theo từng module chính

Với từng module dưới đây, hãy liệt kê:

1. dữ liệu đầu vào
2. rule validate FE
3. rule validate BE
4. lỗi thường gặp
5. thông điệp lỗi thân thiện cho user
6. mã lỗi gợi ý cho FE xử lý

Các module cần phân tích:

* đăng ký tài khoản
* đăng nhập
* cập nhật hồ sơ cá nhân
* địa chỉ giao hàng
* tạo / cập nhật sản phẩm (admin)
* thêm vào giỏ hàng
* cập nhật số lượng giỏ hàng
* áp mã giảm giá
* checkout tạo đơn hàng
* đánh giá sản phẩm
* tìm kiếm / lọc sản phẩm

### D. Danh sách rule validate chi tiết theo field phổ biến

Hãy lập danh sách rule gợi ý cho các field phổ biến sau:

* fullName
* email
* password
* phoneNumber
* addressLine
* province
* district
* ward
* productName
* sku
* price
* salePrice
* stockQuantity
* categoryId
* quantity
* couponCode
* rating
* reviewComment
* searchKeyword

Với mỗi field, mô tả:

* kiểu dữ liệu
* required hay optional
* min/max
* regex/format nếu có
* normalize như trim/lowercase
* ví dụ input hợp lệ
* ví dụ input không hợp lệ

### E. Chiến lược chuẩn hóa response lỗi từ backend

Đề xuất một chuẩn JSON error response thống nhất, gồm:

* message
* code
* field
* details
* traceId (nếu cần)

Yêu cầu:

* phân biệt lỗi validation, lỗi business, lỗi auth, lỗi permission, lỗi system
* đưa ví dụ response cho từng loại
* đề xuất naming convention cho error code

### F. Pseudocode / flow validate chuẩn

Viết pseudocode hoặc flow ngắn cho các case:

* đăng ký
* thêm vào giỏ hàng
* checkout
* admin tạo sản phẩm

Flow cần thể hiện rõ:

* FE validate gì trước khi gửi
* BE parse gì
* BE validate schema gì
* BE validate business gì
* lưu DB khi nào
* trả lỗi khi nào

### G. Best practices cho dự án nhỏ nhưng sạch

Đưa checklist thực hành tốt, ví dụ:

* dùng shared schema nếu phù hợp
* validate schema ở API boundary
* không chỉ dựa vào HTML5 validation
* không expose lỗi nội bộ
* luôn kiểm tra lại price/stock ở BE
* log validation error có kiểm soát
* test case cho input xấu, input rỗng, input biên
* rate limit cho login / coupon

### H. Danh sách anti-pattern cần tránh

Liệt kê các lỗi thiết kế phổ biến trong validate FE/BE của dự án e-commerce nhỏ.

### I. Đề xuất stack triển khai mẫu

Nếu tôi dùng stack JavaScript/TypeScript, hãy gợi ý tối ưu cho dự án nhỏ:

* FE: React / Next.js form validation
* BE: Node.js / NestJS / Express
* schema validation library nên dùng
* ORM / DB constraint nên tận dụng gì
* cách tổ chức folder validator / dto / schema / middleware

## 4) Ràng buộc chất lượng

* Ưu tiên thực tế, dễ triển khai cho một người làm hoặc team rất nhỏ
* Không trả lời chung chung
* Dùng ví dụ sát ngữ cảnh e-commerce
* Nếu có trade-off, hãy nêu rõ khi nào nên chọn cách đơn giản, khi nào nên nâng cấp
* Ưu tiên output có thể copy thành tài liệu kỹ thuật hoặc checklist coding

## 5) Yêu cầu thêm

Sau khi trả lời toàn bộ các mục trên, hãy bổ sung thêm:

1. một checklist ngắn để dev FE tự rà soát trước khi bàn giao
2. một checklist ngắn để dev BE tự rà soát trước khi bàn giao
3. một bộ test case biên (edge cases) quan trọng nhất cho e-commerce nhỏ
4. một ví dụ schema validation mẫu bằng TypeScript cho `register`, `addToCart`, và `checkout`

---

## Cách trả lời mong muốn

* trình bày rõ ràng bằng heading
* có bảng ở những phần phù hợp
* có bullet point ngắn gọn, súc tích
* có ví dụ cụ thể
* ưu tiên tính áp dụng ngay
