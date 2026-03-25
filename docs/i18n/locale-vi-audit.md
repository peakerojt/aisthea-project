# Audit locale VI da trien khai

## Da chuan hoa trong dot nay

- `products.json`: chuan hoa glossary `Danh muc`, `Bien the`, CTA admin va microcopy PDP.
- `orders.json`, `enums.json`, `analytics.json`: dong bo nhom trang thai don hang va hoan tien.
- `common.json`, `messages.json`: lam gon toast, feedback va dau cau.
- `pages.json`: dong bo mot so copy quan trong trong checkout va order success.
- `restock.json`: chuan hoa thuat ngu admin, viet hoa va cach rut gon.
- `returns.json`, `customers.json`, `roles.json`, `categories.json`: giam copy literal va lam ro nghiep vu.
- `orderStatus.config.ts`, `StatusBadge.tsx`: sua cac nguon hard-code de khong lech voi locale.

## Van de da xu ly

- `PROCESSING` truoc day bi lech giua `Dang chuan bi hang` va `Dang xu ly`.
- `DELIVERED`, `RETURNED`, `RETURN_REQUESTED` bi hien thi khac nhau giua cac man.
- Nhieu CTA admin nhu `Hoan tat dang ban` nghe sat nghia va khong tu nhien.
- Restock co truong hop viet tat va dau cau khong dong nhat.

## Luu y cho dot tiep theo

- Neu can refactor sau, nen dua order status va return status vao mot nguon label dung chung cho component.
- Khi them key moi, uu tien dat theo nhom `actions`, `feedback`, `status`, `empty`, `fields`, `placeholders`.
