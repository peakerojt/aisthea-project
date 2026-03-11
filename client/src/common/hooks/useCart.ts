/**
 * useCart — Thin wrapper around CartContext.
 *
 * Provides a single stable import for all cart state and actions,
 * instead of importing directly from CartContext everywhere.
 */
export { useCart } from '@/common/contexts/CartContext';
