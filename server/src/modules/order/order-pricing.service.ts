import { Prisma } from '../../generated/client';
import { AppError } from '../../middlewares/error.middleware';
import { validateCoupon, ValidateCouponResult } from '../../services/coupon.service';
import { prisma } from '../../utils/prisma';

export type ShippingMethod = 'STANDARD' | 'EXPRESS';

export interface PricingItemInput {
  variantId: number;
  quantity: number;
  productName?: string;
  variantName?: string;
}

export interface EnrichedOrderItem {
  variantId: number;
  quantity: number;
  unitPrice: number;
  sku: string;
  productName: string;
  variantName: string;
}

export interface OrderPricingQuote {
  itemsSubtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  shippingMethod: ShippingMethod;
  shippingCityCode: string | null;
  appliedCouponCode: string | null;
  coupon: ValidateCouponResult['coupon'] | null;
  enrichedItems: EnrichedOrderItem[];
}

export interface QuoteOrderPricingInput {
  userId: number;
  items: PricingItemInput[];
  couponCode?: string | null;
  shippingCityCode?: string | null;
  shippingMethod?: ShippingMethod | null;
}

const ZONE_ONE_CITY_CODES = new Set(['48']);
const ZONE_TWO_CITY_CODES = new Set(['46', '49', '51']);

const getShippingZone = (shippingCityCode: string): 1 | 2 | 3 => {
  if (!/^\d+$/.test(shippingCityCode)) {
    throw new AppError(400, 'INVALID_SHIPPING_CITY_CODE', 'orders:errors.invalidShippingCityCode');
  }

  if (ZONE_ONE_CITY_CODES.has(shippingCityCode)) {
    return 1;
  }

  if (ZONE_TWO_CITY_CODES.has(shippingCityCode)) {
    return 2;
  }

  return 3;
};

export const calculateShippingFee = (
  shippingMethod: ShippingMethod,
  shippingCityCode: string | null,
  itemsSubtotal: number,
): number => {
  if (!shippingCityCode) {
    return 0;
  }

  if (shippingMethod === 'STANDARD' && itemsSubtotal > 500000) {
    return 0;
  }

  const zone = getShippingZone(shippingCityCode);

  if (zone === 1) {
    return shippingMethod === 'STANDARD' ? 15000 : 30000;
  }

  if (zone === 2) {
    return shippingMethod === 'STANDARD' ? 25000 : 40000;
  }

  return shippingMethod === 'STANDARD' ? 40000 : 70000;
};

export async function quoteOrderPricing(
  input: QuoteOrderPricingInput,
  tx?: Prisma.TransactionClient,
): Promise<OrderPricingQuote> {
  const db = tx ?? prisma;
  const shippingMethod = input.shippingMethod ?? 'STANDARD';
  const shippingCityCode = input.shippingCityCode?.trim() ? input.shippingCityCode.trim() : null;
  const couponCode = input.couponCode?.trim() ? input.couponCode.trim() : null;

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError(400, 'CART_EMPTY', 'orders:errors.cartEmpty');
  }

  const uniqueVariantIds = [...new Set(input.items.map((item) => item.variantId))];
  const variants = await db.productVariant.findMany({
    where: { variantId: { in: uniqueVariantIds } },
    select: {
      variantId: true,
      sku: true,
      price: true,
      stockQuantity: true,
      product: { select: { name: true } },
      variantAttributes: {
        select: {
          value: {
            select: {
              value: true,
            },
          },
        },
      },
    },
  });

  const variantMap = new Map(variants.map((variant) => [variant.variantId, variant]));
  let itemsSubtotal = 0;

  const enrichedItems = input.items.map((item) => {
    const variant = variantMap.get(item.variantId);

    if (!variant) {
      throw new AppError(400, 'VARIANT_NOT_FOUND', 'products:errors.notFound', { variantId: item.variantId });
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new AppError(400, 'INVALID_QUANTITY', 'orders:errors.invalidQuantity', { variantId: item.variantId });
    }

    if (variant.stockQuantity < item.quantity) {
      throw new AppError(400, 'OUT_OF_STOCK', 'orders:errors.outOfStock', {
        variantId: item.variantId,
        available: variant.stockQuantity,
        requested: item.quantity,
      });
    }

    const unitPrice = Number(variant.price);
    itemsSubtotal += unitPrice * item.quantity;

    const attrLabel = variant.variantAttributes
      .map((variantAttribute) => variantAttribute.value.value)
      .join(' / ');

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      sku: variant.sku,
      productName: item.productName ?? variant.product?.name ?? 'Unknown',
      variantName: (item.variantName ?? attrLabel) || variant.sku,
    };
  });

  const shippingFee = calculateShippingFee(shippingMethod, shippingCityCode, itemsSubtotal);

  let discountAmount = 0;
  let coupon: ValidateCouponResult['coupon'] | null = null;

  if (couponCode) {
    const validation = await validateCoupon(couponCode, input.userId, itemsSubtotal, tx);
    discountAmount = validation.discountAmount;
    coupon = validation.coupon;
  }

  return {
    itemsSubtotal,
    shippingFee,
    discountAmount,
    totalAmount: Math.max(0, itemsSubtotal + shippingFee - discountAmount),
    shippingMethod,
    shippingCityCode,
    appliedCouponCode: coupon?.code ?? null,
    coupon,
    enrichedItems,
  };
}
