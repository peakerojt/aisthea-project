import { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import { applyPurchaseReceiptStockChanges } from '../../services/inventory.service';

export const PURCHASE_ORDER_STATUSES = {
  PENDING: 'PENDING',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUSES)[keyof typeof PURCHASE_ORDER_STATUSES];

const OPEN_PURCHASE_ORDER_STATUSES = [
  PURCHASE_ORDER_STATUSES.PENDING,
  PURCHASE_ORDER_STATUSES.PARTIALLY_RECEIVED,
] as const;

interface PurchaseOrderCreateItemInput {
  variantId: number;
  orderedQty: number;
  unitCost: number;
}

interface PurchaseOrderCreateInput {
  supplier?: string;
  expectedReceivedAt?: string | null;
  invoiceNumber?: string | null;
  supplierContactName?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  notes?: string | null;
  items?: PurchaseOrderCreateItemInput[];
}

interface PurchaseOrderReceiptInput {
  purchaseOrderItemId?: number;
  variantId?: number;
  quantity: number;
}

interface PurchaseOrderMappedItem {
  purchaseOrderItemId: number;
  variantId: number;
  sku: string | null;
  productId: number | null;
  productName: string | null;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unitCost: number;
  lineTotal: number;
  currentStockQuantity: number | null;
}

interface ListPurchaseOrdersInput {
  page: number;
  pageSize: number;
  search: string;
  status: PurchaseOrderStatus | null;
}

const MAX_SUPPLIER_LENGTH = 100;
const MAX_INVOICE_LENGTH = 100;
const MAX_CONTACT_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;

const PHONE_REGEX = /^[0-9+().\-\s]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const purchaseOrderDetailInclude = {
  items: {
    orderBy: { purchaseOrderItemId: 'asc' },
    include: {
      variant: {
        select: {
          variantId: true,
          productId: true,
          sku: true,
          stockQuantity: true,
          product: {
            select: {
              productId: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const;

type PurchaseOrderDetailRecord = Awaited<ReturnType<typeof getPurchaseOrderByIdInternal>>;

class PurchaseOrderServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'PurchaseOrderServiceError';
    this.status = status;
    this.code = code;
  }
}

function throwPurchaseOrderError(status: number, code: string): never {
  throw new PurchaseOrderServiceError(status, code);
}

function normalizeOptionalString(value: unknown, maxLength: number): string | null | 'INVALID' {
  if (value == null) return null;
  if (typeof value !== 'string') return 'INVALID';
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) return 'INVALID';
  return normalized;
}

function getCurrentMinuteFloor() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

function buildPurchaseOrderNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PO-${stamp}-${suffix}`;
}

function buildGoodsReceiptNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `GR-${stamp}-${suffix}`;
}

export function normalizePurchaseOrderStatus(status: unknown): PurchaseOrderStatus | null {
  if (typeof status !== 'string') return null;
  const normalized = status.trim().toUpperCase();
  if (Object.values(PURCHASE_ORDER_STATUSES).includes(normalized as PurchaseOrderStatus)) {
    return normalized as PurchaseOrderStatus;
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value ?? 0);
}

function mapPurchaseOrder(order: NonNullable<PurchaseOrderDetailRecord>) {
  const items = (order.items ?? []).map((item: any) => {
    const unitCost = toNumber(item.unitCost);
    const orderedQty = item.orderedQty ?? 0;
    const receivedQty = item.receivedQty ?? 0;

    return {
      purchaseOrderItemId: item.purchaseOrderItemId,
      variantId: item.variantId,
      sku: item.variant?.sku ?? null,
      productId: item.variant?.productId ?? null,
      productName: item.variant?.product?.name ?? null,
      orderedQty,
      receivedQty,
      remainingQty: Math.max(orderedQty - receivedQty, 0),
      unitCost,
      lineTotal: unitCost * orderedQty,
      currentStockQuantity: item.variant?.stockQuantity ?? null,
    };
  });

  const totals = items.reduce(
    (acc: { orderedQty: number; receivedQty: number; totalCost: number }, item: PurchaseOrderMappedItem) => {
      acc.orderedQty += item.orderedQty;
      acc.receivedQty += item.receivedQty;
      acc.totalCost += item.lineTotal;
      return acc;
    },
    { orderedQty: 0, receivedQty: 0, totalCost: 0 },
  );

  return {
    purchaseOrderId: order.purchaseOrderId,
    purchaseOrderNumber: order.purchaseOrderNumber,
    supplier: order.supplier,
    expectedReceivedAt: order.expectedReceivedAt ?? null,
    invoiceNumber: order.invoiceNumber ?? null,
    supplierContactName: order.supplierContactName ?? null,
    supplierPhone: order.supplierPhone ?? null,
    supplierEmail: order.supplierEmail ?? null,
    status: order.status,
    notes: order.notes ?? null,
    orderedAt: order.orderedAt,
    receivedAt: order.receivedAt ?? null,
    updatedAt: order.updatedAt,
    createdBy: order.createdBy ?? null,
    totals,
    items,
  };
}

async function getPurchaseOrderByIdInternal(purchaseOrderId: number) {
  return prisma.purchaseOrder.findUnique({
    where: { purchaseOrderId },
    include: purchaseOrderDetailInclude,
  });
}

function validateExpectedReceivedAt(expectedReceivedAt: unknown) {
  if (expectedReceivedAt === null || expectedReceivedAt === undefined) {
    return null;
  }
  if (typeof expectedReceivedAt !== 'string' || expectedReceivedAt.trim().length === 0) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_EXPECTED_DATE_INVALID');
  }

  const maybeDate = new Date(expectedReceivedAt);
  if (Number.isNaN(maybeDate.getTime())) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_EXPECTED_DATE_INVALID');
  }
  if (maybeDate < getCurrentMinuteFloor()) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_EXPECTED_DATE_PAST');
  }

  return maybeDate;
}

function validatePurchaseOrderCreateInput(input: PurchaseOrderCreateInput) {
  const normalizedSupplier = normalizeOptionalString(input.supplier, MAX_SUPPLIER_LENGTH);
  if (normalizedSupplier === 'INVALID' || !normalizedSupplier) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_SUPPLIER_REQUIRED');
  }

  const normalizedInvoiceNumber = normalizeOptionalString(input.invoiceNumber, MAX_INVOICE_LENGTH);
  if (normalizedInvoiceNumber === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_INVOICE_TOO_LONG');
  }

  const normalizedSupplierContactName = normalizeOptionalString(input.supplierContactName, MAX_CONTACT_LENGTH);
  if (normalizedSupplierContactName === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_CONTACT_TOO_LONG');
  }

  const normalizedSupplierPhone = normalizeOptionalString(input.supplierPhone, MAX_PHONE_LENGTH);
  if (normalizedSupplierPhone === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_PHONE_TOO_LONG');
  }
  if (normalizedSupplierPhone && !PHONE_REGEX.test(normalizedSupplierPhone)) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_PHONE_INVALID');
  }

  const normalizedSupplierEmail = normalizeOptionalString(input.supplierEmail, MAX_EMAIL_LENGTH);
  if (normalizedSupplierEmail === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_EMAIL_TOO_LONG');
  }
  if (normalizedSupplierEmail && !EMAIL_REGEX.test(normalizedSupplierEmail)) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_EMAIL_INVALID');
  }

  const normalizedNotes = normalizeOptionalString(input.notes, MAX_NOTES_LENGTH);
  if (normalizedNotes === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_NOTES_TOO_LONG');
  }

  const parsedExpectedReceivedAt = validateExpectedReceivedAt(input.expectedReceivedAt);

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_ITEMS_REQUIRED');
  }

  const seenVariantIds = new Set<number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.variantId) || item.variantId <= 0) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_ITEM_VARIANT_INVALID');
    }
    if (!Number.isInteger(item.orderedQty) || item.orderedQty <= 0) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_ITEM_QUANTITY_INVALID');
    }
    if (typeof item.unitCost !== 'number' || Number.isNaN(item.unitCost) || item.unitCost <= 0) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_ITEM_UNIT_COST_INVALID');
    }
    if (seenVariantIds.has(item.variantId)) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_DUPLICATE_VARIANT');
    }
    seenVariantIds.add(item.variantId);
  }

  return {
    supplier: normalizedSupplier,
    expectedReceivedAt: parsedExpectedReceivedAt,
    invoiceNumber: normalizedInvoiceNumber,
    supplierContactName: normalizedSupplierContactName,
    supplierPhone: normalizedSupplierPhone,
    supplierEmail: normalizedSupplierEmail,
    notes: normalizedNotes,
    items: input.items,
  };
}

function validateReceiptItems(items: PurchaseOrderReceiptInput[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_RECEIPT_ITEMS_REQUIRED');
  }

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_RECEIPT_ITEM_QUANTITY_INVALID');
    }
    if (
      (!Number.isInteger(item.purchaseOrderItemId) || (item.purchaseOrderItemId ?? 0) <= 0) &&
      (!Number.isInteger(item.variantId) || (item.variantId ?? 0) <= 0)
    ) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_RECEIPT_ITEM_REFERENCE_REQUIRED');
    }
  }

  return items;
}

function validateNotes(notes: unknown) {
  if (typeof notes !== 'string') return null;
  const normalizedNotes = normalizeOptionalString(notes, MAX_NOTES_LENGTH);
  if (normalizedNotes === 'INVALID') {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_NOTES_TOO_LONG');
  }
  return normalizedNotes;
}

async function syncInventoryIncomingQuantities(
  tx: Prisma.TransactionClient,
  variantIds: number[],
) {
  const uniqueVariantIds = [...new Set(variantIds)].filter((variantId) => Number.isInteger(variantId) && variantId > 0);
  if (uniqueVariantIds.length === 0) return;

  const [variants, openPurchaseOrderItems] = await Promise.all([
    tx.productVariant.findMany({
      where: { variantId: { in: uniqueVariantIds } },
      select: { variantId: true, stockQuantity: true },
    }),
    tx.purchaseOrderItem.findMany({
      where: {
        variantId: { in: uniqueVariantIds },
        purchaseOrder: {
          status: { in: [...OPEN_PURCHASE_ORDER_STATUSES] },
        },
      },
      select: {
        variantId: true,
        orderedQty: true,
        receivedQty: true,
      },
    }),
  ]);

  const stockByVariantId = new Map(
    variants.map((variant) => [variant.variantId, Number(variant.stockQuantity ?? 0)] as const),
  );
  const incomingByVariantId = new Map<number, number>(
    uniqueVariantIds.map((variantId) => [variantId, 0]),
  );

  for (const item of openPurchaseOrderItems) {
    const currentIncoming = incomingByVariantId.get(item.variantId) ?? 0;
    const remainingQty = Math.max(item.orderedQty - item.receivedQty, 0);
    incomingByVariantId.set(item.variantId, currentIncoming + remainingQty);
  }

  await Promise.all(
    uniqueVariantIds.map((variantId) =>
      tx.inventory.upsert({
        where: { variantId },
        update: {
          incomingQuantity: incomingByVariantId.get(variantId) ?? 0,
        },
        create: {
          variantId,
          availableQuantity: stockByVariantId.get(variantId) ?? 0,
          reservedQuantity: 0,
          incomingQuantity: incomingByVariantId.get(variantId) ?? 0,
        },
      }),
    ),
  );
}

export async function listPurchaseOrdersData(input: ListPurchaseOrdersInput) {
  const where: Prisma.PurchaseOrderWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { purchaseOrderNumber: { contains: input.search } },
      { supplier: { contains: input.search } },
      { invoiceNumber: { contains: input.search } },
      { supplierContactName: { contains: input.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ orderedAt: 'desc' }, { purchaseOrderId: 'desc' }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: purchaseOrderDetailInclude,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: rows.map((row) => mapPurchaseOrder(row as NonNullable<PurchaseOrderDetailRecord>)),
    meta: {
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function getPurchaseOrderDetailData(purchaseOrderId: number) {
  const purchaseOrder = await getPurchaseOrderByIdInternal(purchaseOrderId);
  if (!purchaseOrder) {
    throwPurchaseOrderError(404, 'PURCHASE_ORDER_NOT_FOUND');
  }

  return mapPurchaseOrder(purchaseOrder);
}

export async function createPurchaseOrderRecord(input: PurchaseOrderCreateInput, createdBy: number | null) {
  const normalizedInput = validatePurchaseOrderCreateInput(input);

  const variantIds = normalizedInput.items.map((item) => item.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { variantId: { in: variantIds } },
    select: { variantId: true },
  });
  if (variants.length !== variantIds.length) {
    throwPurchaseOrderError(400, 'PURCHASE_ORDER_VARIANT_MISSING');
  }

  const purchaseOrderNumber = buildPurchaseOrderNumber();

  const created = await prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        purchaseOrderNumber,
        supplier: normalizedInput.supplier,
        expectedReceivedAt: normalizedInput.expectedReceivedAt,
        invoiceNumber: normalizedInput.invoiceNumber,
        supplierContactName: normalizedInput.supplierContactName,
        supplierPhone: normalizedInput.supplierPhone,
        supplierEmail: normalizedInput.supplierEmail,
        status: PURCHASE_ORDER_STATUSES.PENDING,
        notes: normalizedInput.notes,
        createdBy,
        items: {
          create: normalizedInput.items.map((item) => ({
            variantId: item.variantId,
            orderedQty: item.orderedQty,
            receivedQty: 0,
            unitCost: item.unitCost,
          })),
        },
      },
      select: { purchaseOrderId: true },
    });

    await syncInventoryIncomingQuantities(tx, variantIds);

    return tx.purchaseOrder.findUniqueOrThrow({
      where: { purchaseOrderId: purchaseOrder.purchaseOrderId },
      include: purchaseOrderDetailInclude,
    });
  });

  return mapPurchaseOrder(created as NonNullable<PurchaseOrderDetailRecord>);
}

export async function receivePurchaseOrderRecord(
  purchaseOrderId: number,
  input: { items?: PurchaseOrderReceiptInput[]; notes?: string | null },
  updatedBy: number | null,
) {
  const normalizedNotes = validateNotes(input.notes);
  const items = validateReceiptItems(input.items);

  const updated = await prisma.$transaction(async (tx) => {
    const purchaseOrder = await tx.purchaseOrder.findUnique({
      where: { purchaseOrderId },
      include: purchaseOrderDetailInclude,
    });

    if (!purchaseOrder) {
      throwPurchaseOrderError(404, 'PURCHASE_ORDER_NOT_FOUND');
    }
    if (purchaseOrder.status === PURCHASE_ORDER_STATUSES.CANCELLED) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_CANCELLED');
    }
    if (purchaseOrder.status === PURCHASE_ORDER_STATUSES.RECEIVED) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_ALREADY_RECEIVED');
    }

    const itemById = new Map(
      purchaseOrder.items.map((item) => [item.purchaseOrderItemId, item] as const),
    );
    const itemByVariantId = new Map(
      purchaseOrder.items.map((item) => [item.variantId, item] as const),
    );
    const touchedIds = new Set<number>();
    const receiptStockChanges: Array<{
      variantId: number;
      quantity: number;
      userId: number | null;
      goodsReceiptId: number;
      purchaseOrderId: number;
      note: string;
    }> = [];
    const receiptNote = purchaseOrder.invoiceNumber
      ? `Received purchase order ${purchaseOrder.purchaseOrderNumber} (Invoice ${purchaseOrder.invoiceNumber})`
      : `Received purchase order ${purchaseOrder.purchaseOrderNumber}`;

    const goodsReceipt = await ((tx as any).goodsReceipt.create as any)({
      data: {
        purchaseOrderId,
        receiptNumber: buildGoodsReceiptNumber(),
        notes: normalizedNotes ?? purchaseOrder.notes ?? null,
        createdBy: updatedBy,
      },
      select: { goodsReceiptId: true },
    });

    for (const receipt of items) {
      const purchaseOrderItem =
        (receipt.purchaseOrderItemId ? itemById.get(receipt.purchaseOrderItemId) : null) ??
        (receipt.variantId ? itemByVariantId.get(receipt.variantId) : null);

      if (!purchaseOrderItem) {
        throwPurchaseOrderError(400, 'PURCHASE_ORDER_ITEM_NOT_FOUND');
      }
      if (touchedIds.has(purchaseOrderItem.purchaseOrderItemId)) {
        throwPurchaseOrderError(400, 'DUPLICATE_RECEIPT_ITEM');
      }

      const remainingQty = purchaseOrderItem.orderedQty - purchaseOrderItem.receivedQty;
      if (receipt.quantity > remainingQty) {
        throwPurchaseOrderError(400, 'RECEIPT_EXCEEDS_ORDERED_QTY');
      }

      await tx.purchaseOrderItem.update({
        where: { purchaseOrderItemId: purchaseOrderItem.purchaseOrderItemId },
        data: { receivedQty: { increment: receipt.quantity } },
      });

      await ((tx as any).goodsReceiptItem.create as any)({
        data: {
          goodsReceiptId: goodsReceipt.goodsReceiptId,
          purchaseOrderItemId: purchaseOrderItem.purchaseOrderItemId,
          variantId: purchaseOrderItem.variantId,
          quantityReceived: receipt.quantity,
          unitCost: purchaseOrderItem.unitCost,
        },
      });

      receiptStockChanges.push({
        variantId: purchaseOrderItem.variantId,
        quantity: receipt.quantity,
        userId: updatedBy,
        goodsReceiptId: goodsReceipt.goodsReceiptId,
        purchaseOrderId,
        note: receiptNote,
      });

      touchedIds.add(purchaseOrderItem.purchaseOrderItemId);
    }

    try {
      await applyPurchaseReceiptStockChanges(tx, receiptStockChanges);
    } catch (error: any) {
      if (error?.code === 'VARIANT_NOT_FOUND') {
        throwPurchaseOrderError(400, 'PURCHASE_ORDER_VARIANT_MISSING');
      }
      throw error;
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      select: {
        orderedQty: true,
        receivedQty: true,
      },
    });

    const isFullyReceived = refreshedItems.every((item) => item.receivedQty >= item.orderedQty);
    const hasAnyReceipt = refreshedItems.some((item) => item.receivedQty > 0);

    await tx.purchaseOrder.update({
      where: { purchaseOrderId },
      data: {
        status: isFullyReceived
          ? PURCHASE_ORDER_STATUSES.RECEIVED
          : hasAnyReceipt
            ? PURCHASE_ORDER_STATUSES.PARTIALLY_RECEIVED
            : PURCHASE_ORDER_STATUSES.PENDING,
        receivedAt: isFullyReceived ? new Date() : null,
        notes: typeof input.notes === 'string' ? normalizedNotes : undefined,
      },
    });

    await syncInventoryIncomingQuantities(
      tx,
      purchaseOrder.items.map((item) => item.variantId),
    );

    return tx.purchaseOrder.findUniqueOrThrow({
      where: { purchaseOrderId },
      include: purchaseOrderDetailInclude,
    });
  });

  return mapPurchaseOrder(updated as NonNullable<PurchaseOrderDetailRecord>);
}

export async function cancelPurchaseOrderRecord(
  purchaseOrderId: number,
  input: { notes?: string | null },
) {
  const normalizedNotes = validateNotes(input.notes);

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { purchaseOrderId },
      include: {
        items: {
          select: { variantId: true },
        },
      },
    });

    if (!existing) {
      throwPurchaseOrderError(404, 'PURCHASE_ORDER_NOT_FOUND');
    }
    if (existing.status === PURCHASE_ORDER_STATUSES.CANCELLED) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_ALREADY_CANCELLED');
    }
    if (existing.status === PURCHASE_ORDER_STATUSES.RECEIVED) {
      throwPurchaseOrderError(400, 'PURCHASE_ORDER_RECEIVED_CANNOT_CANCEL');
    }

    await tx.purchaseOrder.update({
      where: { purchaseOrderId },
      data: {
        status: PURCHASE_ORDER_STATUSES.CANCELLED,
        notes: typeof input.notes === 'string' ? normalizedNotes : undefined,
      },
    });

    await syncInventoryIncomingQuantities(
      tx,
      existing.items.map((item) => item.variantId),
    );

    return tx.purchaseOrder.findUniqueOrThrow({
      where: { purchaseOrderId },
      include: purchaseOrderDetailInclude,
    });
  });

  return mapPurchaseOrder(purchaseOrder as NonNullable<PurchaseOrderDetailRecord>);
}

export { PurchaseOrderServiceError };
