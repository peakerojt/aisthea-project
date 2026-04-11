import { Request, Response } from 'express';
import { logger } from '../../lib/logger';
import {
  PurchaseOrderServiceError,
  cancelPurchaseOrderRecord,
  createPurchaseOrderRecord,
  getPurchaseOrderDetailData,
  listPurchaseOrdersData,
  normalizePurchaseOrderStatus,
  receivePurchaseOrderRecord,
} from './purchase-order.service';

const sendPurchaseOrderError = (res: Response, status: number, errorCode: string) =>
  res.status(status).json({ success: false, errorCode });

function parsePositiveInt(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function handlePurchaseOrderError(
  res: Response,
  error: unknown,
  fallbackErrorCode: string,
  logMessage: string,
) {
  if (error instanceof PurchaseOrderServiceError) {
    return sendPurchaseOrderError(res, error.status, error.code);
  }

  logger.error(logMessage, { error });
  return sendPurchaseOrderError(res, 500, fallbackErrorCode);
}

export async function listPurchaseOrders(req: Request, res: Response) {
  try {
    const page = Math.max(parsePositiveInt(String(req.query.page ?? '1')) ?? 1, 1);
    const pageSize = Math.min(Math.max(parsePositiveInt(String(req.query.pageSize ?? '20')) ?? 20, 1), 100);
    const status = normalizePurchaseOrderStatus(req.query.status);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const result = await listPurchaseOrdersData({ page, pageSize, status, search });
    return res.json({ success: true, ...result });
  } catch (error) {
    return handlePurchaseOrderError(
      res,
      error,
      'FETCH_PURCHASE_ORDERS_FAILED',
      '[purchaseOrderController] listPurchaseOrders failed',
    );
  }
}

export async function getPurchaseOrderById(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return sendPurchaseOrderError(res, 400, 'INVALID_PURCHASE_ORDER_ID');
    }

    const purchaseOrder = await getPurchaseOrderDetailData(purchaseOrderId);
    return res.json({ success: true, data: purchaseOrder });
  } catch (error) {
    return handlePurchaseOrderError(
      res,
      error,
      'FETCH_PURCHASE_ORDER_FAILED',
      '[purchaseOrderController] getPurchaseOrderById failed',
    );
  }
}

export async function createPurchaseOrder(req: Request, res: Response) {
  try {
    const createdBy = (req as any).user?.userId ?? null;
    const purchaseOrder = await createPurchaseOrderRecord(req.body ?? {}, createdBy);
    return res.status(201).json({ success: true, code: 'PURCHASE_ORDER_CREATED', data: purchaseOrder });
  } catch (error) {
    return handlePurchaseOrderError(
      res,
      error,
      'CREATE_PURCHASE_ORDER_FAILED',
      '[purchaseOrderController] createPurchaseOrder failed',
    );
  }
}

export async function receivePurchaseOrder(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return sendPurchaseOrderError(res, 400, 'INVALID_PURCHASE_ORDER_ID');
    }

    const updatedBy = (req as any).user?.userId ?? null;
    const purchaseOrder = await receivePurchaseOrderRecord(purchaseOrderId, req.body ?? {}, updatedBy);
    return res.json({ success: true, code: 'PURCHASE_ORDER_RECEIVED', data: purchaseOrder });
  } catch (error) {
    return handlePurchaseOrderError(
      res,
      error,
      'RECEIVE_PURCHASE_ORDER_FAILED',
      '[purchaseOrderController] receivePurchaseOrder failed',
    );
  }
}

export async function cancelPurchaseOrder(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return sendPurchaseOrderError(res, 400, 'INVALID_PURCHASE_ORDER_ID');
    }

    const purchaseOrder = await cancelPurchaseOrderRecord(purchaseOrderId, req.body ?? {});
    return res.json({ success: true, code: 'PURCHASE_ORDER_CANCELLED', data: purchaseOrder });
  } catch (error) {
    return handlePurchaseOrderError(
      res,
      error,
      'CANCEL_PURCHASE_ORDER_FAILED',
      '[purchaseOrderController] cancelPurchaseOrder failed',
    );
  }
}
