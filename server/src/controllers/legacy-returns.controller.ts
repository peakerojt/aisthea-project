import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  ReturnError,
  getReturnForOrder,
} from '../services/return.service';
import {
  ReturnRequestService,
} from '../modules/return-order/services/request.service';
import { logger } from '../lib/logger';
import { loadLegacyOrderReturnView } from '../shared/legacy-returns.order.adapter';

const returnRequestService = new ReturnRequestService();
const sendCode = (res: Response, status: number, code: string) =>
  res.status(status).json({ success: false, code });
const parsePositiveId = (value: unknown): number => Number(value);

const sendError = (res: Response, error: ReturnError | Error) => {
  if (error instanceof ReturnError) {
    return sendCode(res, error.status, error.code);
  }

  logger.error('[returnController] Unexpected error', { error });
  return sendCode(res, 500, 'INTERNAL_SERVER_ERROR');
};

export const getOrderReturn = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parsePositiveId(req.params.id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return sendCode(res, 400, 'INVALID_ORDER_ID');
    }

    const data = await loadLegacyOrderReturnView(
      getReturnForOrder,
      {
        getReturnDetailByOrderId: (targetOrderId: number) =>
          returnRequestService.getReturnDetailByOrderId(targetOrderId),
      },
      orderId,
    );

    return res.json({ success: true, data });
  } catch (error: any) {
    return sendError(res, error);
  }
};
