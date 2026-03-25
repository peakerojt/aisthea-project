# Merge report locale VI refined

## Muc tieu

- Dung `client/src/i18n/locales/vi` lam base an toan dang duoc app su dung.
- Dung `docs/i18n/reference/locale-vi-ecommerce-refined.md` lam nguon quy tac cuoi cung.
- Keo chon loc wording tot tu `docs/i18n/reference/locale-vi-refined-package`.
- Khong copy de nguyen goi refined package vi co file thieu key va co status lech glossary.

## Nguon uu tien

1. Guide ecommerce refined `.md`
2. Locale hien tai trong `locales/vi`
3. Refined package chi dung de tham khao wording

## Da merge tu refined package

### `analytics.json`

- Lay cac wording admin tu nhien hon cho:
  - `page.subtitle`
  - `page.exportCSV`
  - `kpi.completedOrders`
  - `kpi.avgOrderSub`
  - `kpi.topCustomers`
  - `charts.revenueByCategorySub`
  - `charts.statusFunnel`
  - `charts.statusFunnelSub`
  - `charts.monthlyTrend`
  - `charts.monthlyTrendSub`
  - `tables.cancelledTitle`
  - `tables.cancelledSub`
  - `feedback.loadError`
  - `aiInsights.badge`
  - `aiInsights.live`
  - `aiInsights.message`
  - `chatFunnel.title`
  - `chatFunnel.openToSend`
  - `chatFunnel.sendToClick`
  - `chatFunnel.topTargetsSub`

### `cart.json`

- Lay wording theo guide/package cho:
  - `empty.subtitle`
  - `stock.backInStock`
  - `stock.exceedsStock`
  - `toast.updated`
  - `toast.cleared`
  - `merge.success`
  - `confirm.clearMessage`

### `pages.json`

- Lay hoac ap dung wording moi cho:
  - `home.tabs.unisex`
  - `home.sections.stylist.cta`
  - `myOrders.tabs.shipping`
  - `shoppingBag.meta.kicker`
  - `shoppingBag.meta.subtitle`
  - `shoppingBag.actions.checkout`
  - `shoppingBag.summary.linePrice`
  - `shoppingBag.summary.shippingPending`
  - `shoppingBag.summary.couponAtCheckout`
  - `shoppingBag.summary.couponHint`
  - `adminTracking.progress.delivered`
  - `trackingLookup.actions.lookup`
  - `trackingLookup.features.secureLookup`
  - `trackingLookup.errors.lookupFailed`
  - `orderDetail.hint.shipping`
  - `orderDetail.hint.delivered`
  - `checkout.actions.backToCart`

### `orders.json`

- Lay wording admin ro hon cho:
  - `page.dataError`
  - `page.noOrders`
  - `filters.searchPlaceholder`
  - `feedback.updateSuccess`
  - `refund.form.submit`
  - `refund.success.initiated`

### `tracking.json`

- Lay wording package cho:
  - `errors.notFound`

### `messages.json`

- Lay wording ngan va ro hon cho:
  - `REFUND_COMPLETED`
  - `PERMISSIONS_UPDATED`
  - `CART_ITEM_ADDED`

### `errors.json`

- Chuan hoa:
  - `INVALID_RETURN_ID`

## Co y giu base hien tai

### `analytics.json`

- Giu `chatFunnel.noData`
- Giu `chatFunnel.noTargets`
- Giu toan bo `chatFunnel.columns.*`

Ly do:
- Refined package thieu nhom key nay, neu copy de se lam mat text dang duoc UI su dung.

### `pages.json`

- Giu `collection.quickView`
- Giu `profile.states.unknown`
- Giu `checkout.actions.placeOrder = Xac nhan dat hang`

Ly do:
- Package thieu `collection.quickView` va `profile.states.unknown`.
- Guide ecommerce uu tien `Xac nhan dat hang`, khong dung `Dat hang`.

### `cart.json`

- Giu `summary.total = Tong cong`

Ly do:
- Guide ecommerce uu tien `Tong cong`, khong doi sang `Tong thanh toan`.

### `orders.json`

- Giu full label trong `statusBadge.*`

Ly do:
- Guide yeu cau dung mot cach goi duy nhat cho status, tranh rut gon thanh `Dang giao`, `Da giao`, `Yeu cau tra`.

### `tracking.json`

- Giu toan bo nhom `page.*`

Ly do:
- Refined package chi co `status` va `errors`, khong du de thay the file dang dung.

### `products.json`

- Chua merge tu package.

Ly do:
- Package de xuat `page.title = San pham` va `page.productCount = {{count}} san pham`.
- Man hinh hien tai o `Products.tsx` dang render `subtitle • totalProducts + productCount`, nen doi `productCount` theo package se de bi lap nghia.
- Mot so term trong package quay lai `Phan loai`, `Kho hang`, khong khop glossary da chot.

### `customers.json`

- Chua merge tu package.

Ly do:
- Package nghieng ve nghia `Khach hang`.
- Man hinh hien tai trong admin dang la quan ly user/role/status, nen `Quan ly nguoi dung` va `Nguoi dung` la dung ngu canh hon.

## Chuan hoa theo guide `.md`

- Khoa lai `PENDING -> Cho xac nhan`
- Khoa lai `SHIPPING -> Dang giao hang`
- Khoa lai `DELIVERED -> Da giao hang`
- Khoa lai `RETURN_REQUESTED -> Yeu cau tra hang`
- Khoa lai `RETURNED -> Da tra hang`
- Doi cac cum `hoan tra` sang `tra hang` o nhung noi thuoc nghiep vu return
- Giu CTA ngan, bat dau bang dong tu:
  - `Thanh toan`
  - `Xem trang thai`
  - `Quay lai gio hang`

## Hardcode da dong bo them

- `client/src/common/services/dashboard.service.ts`
- `client/src/common/pages/TrackingDetailPage.tsx`
- `client/src/admin/components/OrderActionPanel.tsx`
- `server/src/i18n/locales/vi/tracking.json`

Ly do:
- Neu chi sua JSON ma de hardcode cu thi UI van se hien `Dang giao`, `Da giao`, `hoan tra`.

## Quy tac cho dot sau

- Khi co refined package moi, chi merge theo tung file.
- Luon doi chieu voi guide `.md` truoc khi chap nhan status, CTA va glossary.
- File nao package thieu key thi phai merge bang tay, khong copy de.
- Neu mot man hinh co semantics rieng trong code, uu tien nghia thuc te cua man hinh hon wording dep.
