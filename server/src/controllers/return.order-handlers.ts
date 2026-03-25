import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ReturnError } from '../services/return.service';
import { ServiceError } from '../modules/return-order/services/return-request.service';
import { resolveLegacyOrderReturnData } from '../shared/legacy-return-read.adapter';
import { createReturnWithModernFallback } from '../shared/legacy-return-write.adapter';

type SendCode = (res: Response, status: number, code: string) => Response;
type SendError = (res: Response, error: ReturnError | Error) => Response;
type ParsePositiveId = (value: unknown) => number;

type LegacyCreateReturn = (
  orderId: number,
  userId: number,
  roles: string[],
  reason: string,
  proofImages: string[],
) => Promise<unknown>;

type LegacyOrderReturnLookup = (orderId: number) => Promise<unknown>;

type ReturnRequestOrderBridge = {
  createLegacyCompatibleReturnRequest: (
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) => Promise<{
    returnRequestId: number;
    orderId: number;
    status: string;
  }>;
  getReturnDetailByOrderId: (orderId: number) => Promise<unknown>;
};

type OrderHandlerDeps = {
  sendCode: SendCode;
  sendError: SendError;
  parsePositiveId: ParsePositiveId;
  requestReturn: LegacyCreateReturn;
  getReturnForOrder: LegacyOrderReturnLookup;
  returnRequestService: ReturnRequestOrderBridge;
};

export const createLegacyReturnOrderHandlers = ({
  sendCode,
  sendError,
  parsePositiveId,
  requestReturn,
  getReturnForOrder,
  returnRequestService,
}: OrderHandlerDeps) => {
  const postReturnRequest = async (req: AuthRequest, res: Response) => {
    try {
      const orderId = parsePositiveId(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return sendCode(res, 400, 'INVALID_ORDER_ID');
      }

      const user = req.user;
      if (!user || typeof user.userId !== 'number') {
        return sendCode(res, 401, 'UNAUTHORIZED');
      }

      const { reason, proofImages = [] } = req.body as {
        reason: string;
        proofImages?: string[];
      };

      if (!reason || reason.trim().length === 0) {
        return sendCode(res, 400, 'REASON_REQUIRED');
      }

      if (!Array.isArray(proofImages)) {
        return sendCode(res, 400, 'INVALID_PROOF_IMAGES');
      }

      const trimmedReason = reason.trim();

      const data = await createReturnWithModernFallback(
        returnRequestService,
        {
          orderId,
          userId: user.userId,
          roles: user.roles ?? [],
          reason: trimmedReason,
          proofImages,
        },
        requestReturn,
      );

      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error instanceof ServiceError) {
        return sendCode(res, error.status, error.code);
      }
      return sendError(res, error);
    }
  };

  const getOrderReturn = async (req: AuthRequest, res: Response) => {
    try {
      const orderId = parsePositiveId(req.params.id);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return sendCode(res, 400, 'INVALID_ORDER_ID');
      }

      const legacyRecord = await getReturnForOrder(orderId);
      const detailRecord = legacyRecord
        ? null
        : await returnRequestService.getReturnDetailByOrderId(orderId);
      const data = resolveLegacyOrderReturnData(legacyRecord, detailRecord);
      return res.json({ success: true, data });
    } catch (error: any) {
      return sendError(res, error);
    }
  };

  return {
    getOrderReturn,
    postReturnRequest,
  };
};
