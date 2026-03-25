import { Request, Response } from 'express';
import { initiateRefund, getRefundsForOrder, RefundError } from '../services/refund.service';
import { logger } from '../lib/logger';

type RefundRequest = Request & {
  user?: {
    userId?: number;
  };
};

const sendError = (res: Response, status: number, code: string) =>
  res.status(status).json({ success: false, code });

const parseOrderId = (req: Request) => parseInt(req.params.id as string, 10);

const handleRefundError = (
  res: Response,
  error: unknown,
  logScope: string,
  fallbackCode: string,
): void => {
  if (error instanceof RefundError) {
    sendError(res, error.status, error.code);
    return;
  }

  logger.error(logScope, { error });
  sendError(res, 500, fallbackCode);
};

export async function postInitiateRefund(req: Request, res: Response): Promise<void> {
  const orderId = parseOrderId(req);
  const adminUserId = (req as RefundRequest).user?.userId ?? 0;

  if (isNaN(orderId)) {
    sendError(res, 400, 'INVALID_ORDER_ID');
    return;
  }

  const { amount, type, method, reason } = req.body;

  if (!amount || !type || !method || !reason) {
    sendError(res, 400, 'MISSING_REQUIRED_FIELDS');
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    sendError(res, 400, 'INVALID_AMOUNT');
    return;
  }

  try {
    const refund = await initiateRefund(orderId, adminUserId, {
      amount: numAmount,
      type,
      method,
      reason,
    });

    res.status(201).json({
      success: true,
      code: 'REFUND_INITIATED',
      data: refund,
    });
  } catch (error: unknown) {
    handleRefundError(res, error, '[refundController] postInitiateRefund failed', 'INTERNAL_SERVER_ERROR');
  }
}

export async function getOrderRefunds(req: Request, res: Response): Promise<void> {
  const orderId = parseOrderId(req);

  if (isNaN(orderId)) {
    sendError(res, 400, 'INVALID_ORDER_ID');
    return;
  }

  try {
    const refunds = await getRefundsForOrder(orderId);
    res.json({ success: true, data: refunds });
  } catch (error: unknown) {
    handleRefundError(res, error, '[refundController] getOrderRefunds failed', 'FETCH_REFUND_HISTORY_FAILED');
  }
}
