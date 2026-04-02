export type ReturnRequestReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'SIZE_ISSUE'
  | 'CHANGED_MIND'
  | 'OTHER';

type LegacyReturnOrderItem = {
  orderItemId: number;
  quantity: number;
};

type LegacyReturnOrder = {
  orderId: number;
  items?: LegacyReturnOrderItem[];
};

type LegacyCreateReturnDraft = {
  orderId: number;
  reason: ReturnRequestReason;
  note?: string;
  items: Array<{
    orderItemId: number;
    quantity: number;
  }>;
  attachments?: string[];
};

const REASON_KEYWORDS: Array<[ReturnRequestReason, string[]]> = [
  ['DEFECTIVE', ['defect', 'damag', 'broken', 'fault', 'loi', 'hỏng', 'hong']],
  ['WRONG_ITEM', ['wrong item', 'wrong product', 'incorrect', 'sai', 'nham']],
  ['SIZE_ISSUE', ['size', 'fit', 'chật', 'rong', 'rộng']],
  ['CHANGED_MIND', ['changed mind', 'doi y', 'đổi ý', 'khong thich', 'không thích']],
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const normalizeLegacyReturnReason = (reason: string): ReturnRequestReason => {
  const normalized = normalizeText(reason);
  if (!normalized) return 'OTHER';

  const directReasons = new Set<ReturnRequestReason>([
    'DEFECTIVE',
    'WRONG_ITEM',
    'SIZE_ISSUE',
    'CHANGED_MIND',
    'OTHER',
  ]);
  if (directReasons.has(reason as ReturnRequestReason)) {
    return reason as ReturnRequestReason;
  }

  for (const [mappedReason, keywords] of REASON_KEYWORDS) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return mappedReason;
    }
  }

  return 'OTHER';
};

export const buildLegacyCreateReturnDraft = (
  order: LegacyReturnOrder,
  reason: string,
  proofImages: string[],
): LegacyCreateReturnDraft | null => {
  const items = order.items ?? [];
  if (items.length !== 1) {
    return null;
  }

  const [item] = items;
  if (!Number.isFinite(item.orderItemId) || item.orderItemId <= 0) {
    return null;
  }

  if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
    return null;
  }

  const trimmedReason = reason.trim();

  return {
    orderId: order.orderId,
    reason: normalizeLegacyReturnReason(trimmedReason),
    note: trimmedReason || undefined,
    items: [
      {
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      },
    ],
    attachments: proofImages.filter((value) => value.trim().length > 0),
  };
};
