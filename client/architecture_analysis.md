# Phase 0: Full Project Analysis

**Total Files Analyzed**: 141

## Dependency Graph & Domains

| File | Domain | Exports | Imports | Imported By |
|------|--------|---------|---------|-------------|
| `admin/components/BulkImportExportModal.tsx` | admin | BulkImportExportModal | 3 | 1 |
| `admin/components/CategoryFormModal.tsx` | admin | CategoryFormModal | 2 | 1 |
| `admin/components/checkbox.tsx` | admin | Checkbox, Checkbox, Checkbox | 1 | 1 |
| `admin/components/DashboardCards.tsx` | admin | DashboardCards | 3 | 1 |
| `admin/components/NotificationBell.tsx` | admin | NotificationBell | 4 | 1 |
| `admin/components/OrderActionPanel.tsx` | admin | OrderActionPanel | 4 | 1 |
| `admin/components/OrderFinancials.tsx` | admin | OrderFinancials | 4 | 1 |
| `admin/components/OrderStatusBadge.tsx` | admin | OrderStatusBadge, translateOrderStatus, getStatusTone | 2 | 2 |
| `admin/components/OrderTimeline.tsx` | admin | StatusHistoryItem, OrderTimeline, TrackingTimeline | 6 | 3 |
| `admin/components/ProductImageManager.tsx` | admin | ProductImageState, ProductImageManagerProps, ProductImageManager, ProductImageManager, ProductImageManager | 6 | 4 |
| `admin/components/RecentOrders.tsx` | admin | RecentOrders | 4 | 1 |
| `admin/components/RefundDialog.tsx` | admin | RefundDialog | 2 | 1 |
| `admin/components/RevenueChart.tsx` | admin | RevenueChart | 2 | 1 |
| `admin/components/Sidebar.tsx` | admin | Sidebar | 6 | 2 |
| `admin/components/TopProducts.tsx` | admin | TopProducts | 3 | 1 |
| `admin/components/UserActionMenu.tsx` | admin | UserActionMenu | 4 | 1 |
| `admin/components/VariantManager.tsx` | admin | VariantManagerProps, VariantManager, VariantManager, VariantManager | 3 | 3 |
| `admin/hooks/useAdminSocket.ts` | admin | NewOrderPayload, useAdminSocket | 3 | 1 |
| `admin/layouts/AdminLayout.tsx` | admin | AdminLayout | 3 | 1 |
| `admin/pages/Analytics.tsx` | admin | Analytics | 3 | 1 |
| `admin/pages/Categories.tsx` | admin | Categories | 4 | 1 |
| `admin/pages/Coupons.tsx` | admin | Coupons | 2 | 1 |
| `admin/pages/CreateProduct.tsx` | admin | CreateProduct, CreateProduct, CreateProduct | 11 | 1 |
| `admin/pages/Customers.tsx` | admin | Customers | 4 | 1 |
| `admin/pages/Dashboard.tsx` | admin | Dashboard | 10 | 1 |
| `admin/pages/EditProduct.tsx` | admin | EditProduct | 13 | 1 |
| `admin/pages/OrderDetail.tsx` | admin | OrderDetail | 12 | 1 |
| `admin/pages/Orders.tsx` | admin | formatVND, getOrderStatusColor, Orders | 4 | 2 |
| `admin/pages/Products.tsx` | admin | Products | 7 | 1 |
| `admin/pages/Restock.tsx` | admin | Restock | 2 | 1 |
| `admin/pages/Returns.tsx` | admin | Returns | 4 | 1 |
| `admin/pages/Roles.tsx` | admin | Roles, Roles, Roles | 5 | 1 |
| `admin/pages/Tracking.tsx` | admin | Tracking | 3 | 1 |
| `admin/pages/Warehouses.tsx` | admin | function, Warehouses | 2 | 1 |
| `admin/services/refund.service.ts` | admin | RefundRequestSchema, RefundRequestPayload, RefundType, RefundMethod, RefundStatus... (+6) | 2 | 2 |
| `admin/services/role.service.ts` | admin | RoleItem, PermissionItem, roleService | 1 | 1 |
| `app/App.tsx` | app | App, App | 42 | 1 |
| `app/main.tsx` | app | - | 16 | 0 |
| `common/api/analytics.api.ts` | common | analyticsApi | 2 | 1 |
| `common/api/auth.api.ts` | common | authApi | 3 | 1 |
| `common/api/cart.api.ts` | common | cartApi | 2 | 1 |
| `common/api/category.api.ts` | common | categoryApi | 2 | 1 |
| `common/api/coupon.api.ts` | common | couponApi | 2 | 1 |
| `common/api/dashboard.api.ts` | common | dashboardApi | 2 | 1 |
| `common/api/inventory.api.ts` | common | inventoryApi | 2 | 1 |
| `common/api/items.api.ts` | common | itemsApi | 2 | 1 |
| `common/api/order.api.ts` | common | orderApi | 2 | 2 |
| `common/api/product.api.ts` | common | productApi | 1 | 1 |
| `common/api/return.api.ts` | common | returnApi | 2 | 1 |
| `common/api/review.api.ts` | common | reviewApi | 2 | 1 |
| `common/api/tracking.api.ts` | common | trackingApi | 2 | 1 |
| `common/api/user-admin.api.ts` | common | userAdminApi | 2 | 1 |
| `common/components/BulkImportExportModal.tsx` | common | BulkImportExportModal | 3 | 0 |
| `common/components/CouponModal.tsx` | common | CouponData, CouponModal, CouponModal, CouponModal | 3 | 1 |
| `common/components/ItemList.tsx` | common | ItemList | 3 | 1 |
| `common/components/ItemRow.tsx` | common | ItemRow | 5 | 1 |
| `common/components/Logo.tsx` | common | Logo | 1 | 4 |
| `common/components/OrderHeader.tsx` | common | OrderHeader | 5 | 1 |
| `common/components/OrderItemsTable.tsx` | common | OrderItemsTable | 3 | 1 |
| `common/components/OrderPricingSummary.tsx` | common | OrderPricingSummary | 2 | 1 |
| `common/components/OrderTimeline.test.tsx` | common | - | 3 | 0 |
| `common/components/orderTracking.constants.ts` | common | ORDER_TRACKING_STATUSES, OrderTrackingStatus, STATUS_LABEL, STATUS_COLOR_MAP | 0 | 1 |
| `common/components/ProductCard.tsx` | common | ProductCardImage, ProductCard | 2 | 2 |
| `common/components/ProductImageGallery.tsx` | common | ProductImage, ProductImageGallery | 2 | 1 |
| `common/components/ProductVariantSelector.tsx` | common | ProductVariantSelectorProps, ProductVariantSelector, ProductVariantSelector, ProductVariantSelector | 6 | 1 |
| `common/components/ReasonLabel.tsx` | common | ReasonLabel | 2 | 2 |
| `common/components/ReturnItemsTable.tsx` | common | ReturnItemsTable | 2 | 1 |
| `common/components/ReturnTimeline.tsx` | common | ReturnTimeline | 3 | 1 |
| `common/components/ReviewModal.tsx` | common | ReviewModal | 5 | 1 |
| `common/components/setupTests.ts` | common | - | 0 | 0 |
| `common/components/ShippingAddressCard.tsx` | common | ShippingAddressCard | 2 | 1 |
| `common/components/StatusBadge.tsx` | common | StatusBadge | 1 | 3 |
| `common/contexts/AuthContext.tsx` | common | UserRole, AuthProvider, useAuth | 3 | 16 |
| `common/contexts/CartContext.tsx` | common | CartProvider, useCart | 4 | 5 |
| `common/contexts/ProductContext.tsx` | common | ProductProvider, useProducts | 2 | 6 |
| `common/contexts/ToastContext.tsx` | common | ToastType, ToastMessage, ToastProvider, useToast | 2 | 3 |
| `common/hooks/useInventoryAlerts.ts` | common | useInventoryAlerts | 2 | 1 |
| `common/hooks/useOrderTrackingRealtime.ts` | common | useOrderTrackingRealtime | 6 | 1 |
| `common/hooks/usePermissions.ts` | common | usePermissions | 1 | 0 |
| `common/hooks/useReorderItems.ts` | common | useReorderItems | 3 | 1 |
| `common/layouts/AuthLayout.tsx` | common | AuthLayout | 3 | 3 |
| `common/pages/Checkout.tsx` | common | Checkout, Checkout | 6 | 1 |
| `common/pages/CreateReturnPage.tsx` | common | CreateReturnPage | 5 | 1 |
| `common/pages/EmailVerification.tsx` | common | EmailVerification | 9 | 1 |
| `common/pages/ForgotPasswordPage.tsx` | common | ForgotPasswordPage | 2 | 1 |
| `common/pages/ItemsPage.tsx` | common | function, ItemsPage | 4 | 1 |
| `common/pages/Login.tsx` | common | Login | 10 | 1 |
| `common/pages/MyOrdersPage.tsx` | common | MyOrdersPage | 3 | 1 |
| `common/pages/OAuthCallback.tsx` | common | OAuthCallback | 4 | 1 |
| `common/pages/OrderDetailPage.return.test.tsx` | common | - | 7 | 0 |
| `common/pages/OrderDetailPage.test.tsx` | common | - | 7 | 0 |
| `common/pages/OrderDetailPage.tsx` | common | OrderDetailPage | 13 | 3 |
| `common/pages/OrderSuccess.tsx` | common | OrderSuccess, OrderSuccess | 3 | 1 |
| `common/pages/PaymentQR.tsx` | common | PaymentQR, PaymentQR | 2 | 1 |
| `common/pages/ProductDetail.tsx` | common | ProductDetail | 16 | 1 |
| `common/pages/ResetPasswordPage.tsx` | common | ResetPasswordPage | 2 | 1 |
| `common/pages/ShoppingBag.tsx` | common | ShoppingBag | 3 | 1 |
| `common/pages/Signup.tsx` | common | Signup | 12 | 1 |
| `common/pages/TrackingDetailPage.tsx` | common | TrackingDetailPage | 7 | 1 |
| `common/pages/TrackingLookupPage.tsx` | common | TrackingLookupPage | 4 | 1 |
| `common/pages/VNPayReturn.tsx` | common | VNPayReturn | 3 | 1 |
| `common/services/analytics.service.ts` | common | AnalyticsSummaryKPIs, RevenueByCategoryItem, StatusFunnelItem, MonthlyTrendItem, TopCustomer... (+10) | 1 | 1 |
| `common/services/auth.service.ts` | common | RegisterInput, LoginInput, authService | 2 | 4 |
| `common/services/cart.service.ts` | common | CartVariantAttribute, CartItemVariant, CartItemResponse, CartResponse, ApiCartResponse... (+11) | 1 | 4 |
| `common/services/category.service.ts` | common | CategoryNode, CategoryFlat, CreateCategoryPayload, UpdateCategoryPayload, fetchCategoryTree... (+7) | 2 | 1 |
| `common/services/coupon.service.ts` | common | CouponType, CouponStatus, Coupon, CouponListResponse, ValidateCouponResult... (+6) | 1 | 1 |
| `common/services/dashboard.service.ts` | common | DashboardRange, DashboardKPIs, RevenueDataPoint, TopProduct, RecentOrder... (+5) | 1 | 5 |
| `common/services/inventory.service.ts` | common | InventoryVariant, BulkUpdateChange, BulkUpdateResponse, InventoryFilters, InventoryLogReason... (+8) | 1 | 2 |
| `common/services/items.service.ts` | common | Item | 1 | 4 |
| `common/services/order.service.ts` | common | OrderItem, OrderDetail, MyOrdersResponse, Order, AdminOrder... (+6) | 1 | 6 |
| `common/services/orderApi.ts` | common | OrderStatus, OrderTimelineItem, OrderItem, OrderPricing, OrderDetail... (+1) | 1 | 5 |
| `common/services/product.service.ts` | common | CreateVariantPayload, CreateImagePayload, CreateProductPayload, CategoryOption, BrandOption... (+26) | 1 | 13 |
| `common/services/return.service.ts` | common | ReturnReason, ReturnStatus, RefundMethod, OrderReturn, ReturnListResponse... (+2) | 1 | 4 |
| `common/services/review.service.ts` | common | CreateReviewPayload, ReviewResponse, getReviewsByProduct, createReview | 1 | 3 |
| `common/services/tracking.service.ts` | common | - | 2 | 4 |
| `common/services/user-admin.service.ts` | common | AdminUserRole, AdminUser, FetchAdminUsersParams, fetchAdminUsers, patchUserStatus... (+4) | 1 | 2 |
| `common/utils/api.ts` | common | api | 0 | 29 |
| `common/utils/cartesianProduct.ts` | common | AttributeGroup, AttributePair, VariantRow, variantRowShape, generateCombinations... (+2) | 0 | 1 |
| `common/utils/cloudinary.ts` | common | CloudinaryOptions, optimizeCloudinaryUrl, getCloudinaryProductCard, getCloudinaryThumbnail, getCloudinaryFullSize... (+1) | 0 | 8 |
| `common/utils/formatDate.ts` | common | formatVietnamTime | 0 | 3 |
| `common/utils/groupVariantsHelper.ts` | common | VariantGroup, GroupedVariants, groupVariants, getColorEmoji | 1 | 3 |
| `common/utils/imageCompression.ts` | common | CompressionOptions, CompressionResult, fileToBase64, isValidImageType, getImageDimensions | 1 | 1 |
| `common/utils/validationUtils.ts` | common | passwordRequirements, passwordValidation, calculatePasswordStrength | 1 | 1 |
| `config/orderStatus.config.ts` | app | ORDER_STATUS, OrderStatusValue, FSM_TRANSITIONS, StatusMeta, ORDER_STATUS_META... (+4) | 0 | 3 |
| `i18n/config.ts` | app | i18n, i18n | 19 | 0 |
| `store/components/Header.tsx` | store | Header | 6 | 11 |
| `store/components/index.ts` | store | - | 0 | 0 |
| `store/components/tracking.store.ts` | store | useTrackingStore | 2 | 2 |
| `store/layouts/StoreLayout.tsx` | store | StoreLayout | 1 | 1 |
| `store/pages/Category.tsx` | store | Category | 4 | 1 |
| `store/pages/Collection.tsx` | store | Collection | 9 | 1 |
| `store/pages/CreateReturnRequest.test.tsx` | store | - | 6 | 0 |
| `store/pages/CreateReturnRequest.tsx` | store | CreateReturnRequest | 10 | 2 |
| `store/pages/Home.tsx` | store | Home | 7 | 1 |
| `store/pages/MyOrders.tsx` | store | MyOrders | 7 | 1 |
| `store/pages/Profile.tsx` | store | Profile | 6 | 1 |
| `store/pages/ReturnDetail.tsx` | store | ReturnDetail | 8 | 1 |
| `store/pages/Stylist.tsx` | store | Stylist | 3 | 1 |
| `store/services/user.service.ts` | store | UserProfile, Address, UpdateProfileData, CreateAddressData, RecentOrder... (+1) | 1 | 1 |
| `types/index.ts` | app | Product, Order, CartItem, ViewState, CategoryType... (+7) | 0 | 42 |
| `types/tracking.ts` | app | TrackingTimelineItem, TrackingData | 1 | 6 |

## Anomalies Detected
**Potentially Unused Components/Services/Hooks**: 4
- `common/components/BulkImportExportModal.tsx`
- `common/components/OrderTimeline.test.tsx`
- `common/hooks/usePermissions.ts`
- `i18n/config.ts`

**Service/API Files (32)**:
- `admin/services/refund.service.ts`
- `admin/services/role.service.ts`
- `common/api/analytics.api.ts`
- `common/api/auth.api.ts`
- `common/api/cart.api.ts`
- `common/api/category.api.ts`
- `common/api/coupon.api.ts`
- `common/api/dashboard.api.ts`
- `common/api/inventory.api.ts`
- `common/api/items.api.ts`
- `common/api/order.api.ts`
- `common/api/product.api.ts`
- `common/api/return.api.ts`
- `common/api/review.api.ts`
- `common/api/tracking.api.ts`
- `common/api/user-admin.api.ts`
- `common/services/analytics.service.ts`
- `common/services/auth.service.ts`
- `common/services/cart.service.ts`
- `common/services/category.service.ts`
- `common/services/coupon.service.ts`
- `common/services/dashboard.service.ts`
- `common/services/inventory.service.ts`
- `common/services/items.service.ts`
- `common/services/order.service.ts`
- `common/services/product.service.ts`
- `common/services/return.service.ts`
- `common/services/review.service.ts`
- `common/services/tracking.service.ts`
- `common/services/user-admin.service.ts`
- `common/utils/api.ts`
- `store/services/user.service.ts`
