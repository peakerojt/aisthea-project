/**
 * Central barrel export for all custom hooks.
 * Import from here: `import { useMyOrders, useProductReviews } from '@/common/hooks'`
 */

// Auth (from context — same pattern)
export { useAuth } from '@/common/contexts/AuthContext';

// Cart
export { useCart } from '@/common/contexts/CartContext';

// Products
export { useProductsAPI, useFilteredProducts, useProductDetail, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation, productKeys } from '@/common/hooks/useProducts';

// Orders
export { useMyOrders, useMyOrderDetail, useCancelMyOrder, useConfirmReceipt, useAdminOrders, useAdminOrderDetail, useUpdateOrderStatus, orderKeys } from '@/common/hooks/useOrders';

// Categories
export { useCategoryTree, useCategoryFlat, useCreateCategory, useUpdateCategory, useDeleteCategory, categoryKeys } from '@/common/hooks/useCategories';

// Reviews
export { useProductReviews, useCreateReview, reviewKeys } from '@/common/hooks/useReviews';

// Inventory
export { useInventoryAlerts } from '@/common/hooks/useInventoryAlerts';

// Order tracking realtime
export { useOrderTrackingRealtime } from '@/common/hooks/useOrderTrackingRealtime';

// Reorder items
export { useReorderItems } from '@/common/hooks/useReorderItems';
