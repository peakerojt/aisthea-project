import { Request, Response } from 'express';
import { initiateRefund, getRefundsForOrder, RefundError } from '../services/refund.service';
import { logger } from '../lib/logger';

export async function postInitiateRefund(req: Request, res: Response): Promise<void> {
  const orderId = parseInt(req.params.id as string, 10);
  const adminUserId = (req as any).user?.userId ?? 0;

  if (isNaN(orderId)) {
    res.status(400).json({ success: false, code: 'INVALID_ORDER_ID' });
    return;
  }

  const { amount, type, method, reason } = req.body;

  if (!amount || !type || !method || !reason) {
    res.status(400).json({
      success: false,
      code: 'MISSING_REQUIRED_FIELDS',
    });
    return;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({
      success: false,
      code: 'INVALID_AMOUNT',
    });
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
    if (error instanceof RefundError) {
      res.status(error.status).json({ success: false, code: error.code });
      return;
    }

    logger.error('[refundController] postInitiateRefund failed', { error });
    res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR' });
  }
}

export async function getOrderRefunds(req: Request, res: Response): Promise<void> {
  const orderId = parseInt(req.params.id as string, 10);

  if (isNaN(orderId)) {
    res.status(400).json({ success: false, code: 'INVALID_ORDER_ID' });
    return;
  }

  try {
    const refunds = await getRefundsForOrder(orderId);
    res.json({ success: true, data: refunds });
  } catch (error) {
    logger.error('[refundController] getOrderRefunds failed', { error });
    res.status(500).json({ success: false, code: 'FETCH_REFUND_HISTORY_FAILED' });
  }
}
