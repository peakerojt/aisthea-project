import { Request, Response } from 'express';
import { getRefundsForOrder, RefundError } from '../services/refund.service';
import { logger } from '../lib/logger';
import { hasRefundWorkflowAccess } from '../shared/role-access';

type RefundRequest = Request & {
  user?: {
    userId?: number;
    roles?: string[];
  };
};

const sendError = (
  res: Response,
  status: number,
  code: string,
  details?: Array<{ field?: string; code?: string; message?: string }>,
) =>
  res.status(status).json({
    success: false,
    code,
    ...(details && details.length > 0 ? { details } : {}),
  });

const parseOrderId = (req: Request) => parseInt(req.params.id as string, 10);
const hasRefundHistoryAccess = (req: RefundRequest) =>
  hasRefundWorkflowAccess(req.user);

const handleRefundError = (
  res: Response,
  error: unknown,
  logScope: string,
  fallbackCode: string,
): void => {
  if (error instanceof RefundError) {
    sendError(res, error.status, error.code, error.details);
    return;
  }

  logger.error(logScope, { error });
  sendError(res, 500, fallbackCode);
};

export async function getOrderRefunds(req: Request, res: Response): Promise<void> {
  const orderId = parseOrderId(req);
  const authReq = req as RefundRequest;

  if (isNaN(orderId)) {
    sendError(res, 400, 'INVALID_ORDER_ID');
    return;
  }

  if (!hasRefundHistoryAccess(authReq)) {
    sendError(res, 403, 'ADMIN_REQUIRED');
    return;
  }

  try {
    const refundHistory = await getRefundsForOrder(orderId);
    res.json({
      success: true,
      data: refundHistory.refunds,
      summary: refundHistory.summary,
    });
  } catch (error: unknown) {
    handleRefundError(res, error, '[refundController] getOrderRefunds failed', 'FETCH_REFUND_HISTORY_FAILED');
  }
}
