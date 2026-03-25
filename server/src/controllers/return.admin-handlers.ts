import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ReturnError } from '../services/return.service';
import { ServiceError } from '../modules/return-order/services/return-request.service';
import {
  mapReturnRequestAdminListToLegacy,
  shouldFallbackToReturnRequestList,
} from '../shared/legacy-return-read.adapter';
import {
  LEGACY_PROCESS_ACTIONS,
  LegacyProcessAction,
  processReturnWithModernFallback,
} from '../shared/legacy-return-write.adapter';

type SendCode = (res: Response, status: number, code: string) => Response;
type SendError = (res: Response, error: ReturnError | Error) => Response;
type SendWriteFallbackError = (res: Response, error: unknown) => Response;
type ParsePositiveId = (value: unknown) => number;
type IsAdminUser = (req: AuthRequest) => boolean;

type LegacyListReturns = (params: {
  page: number;
  pageSize: number;
  status?: string;
}) => Promise<{
  returns: unknown[];
  pagination?: { total?: number };
} & Record<string, unknown>>;

type LegacyProcessReturn = (
  returnId: number,
  adminUserId: number,
  action: LegacyProcessAction,
  note?: string,
) => Promise<unknown>;

type ReturnRequestAdminBridge = Parameters<typeof processReturnWithModernFallback>[0] & {
  getAdminReturns: (params: {
    page: number;
    limit: number;
    status?: string;
  }) => Promise<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
};

type AdminHandlerDeps = {
  sendCode: SendCode;
  sendError: SendError;
  sendWriteFallbackError: SendWriteFallbackError;
  parsePositiveId: ParsePositiveId;
  isAdminUser: IsAdminUser;
  listReturns: LegacyListReturns;
  processReturn: LegacyProcessReturn;
  returnRequestService: ReturnRequestAdminBridge;
};

export const createLegacyReturnAdminHandlers = ({
  sendCode,
  sendError,
  sendWriteFallbackError,
  parsePositiveId,
  isAdminUser,
  listReturns,
  processReturn,
  returnRequestService,
}: AdminHandlerDeps) => {
  const patchProcessReturn = async (req: AuthRequest, res: Response) => {
    try {
      const returnId = parsePositiveId(req.params.id);
      if (!Number.isFinite(returnId) || returnId <= 0) {
        return sendCode(res, 400, 'INVALID_RETURN_ID');
      }

      const user = req.user;
      if (!user || !isAdminUser(req)) {
        return sendCode(res, 403, 'ADMIN_REQUIRED');
      }

      const { action, note } = req.body as { action: LegacyProcessAction; note?: string };

      if (!LEGACY_PROCESS_ACTIONS.includes(action)) {
        return sendCode(res, 400, 'INVALID_ACTION');
      }

      try {
        const result = await processReturn(returnId, user.userId, action, note);
        return res.json(result);
      } catch (error: any) {
        if (error instanceof ReturnError && error.code === 'RETURN_NOT_FOUND') {
          try {
            const fallbackResult = await processReturnWithModernFallback(
              returnRequestService,
              returnId,
              user.userId,
              action,
              note,
            );
            return res.json(fallbackResult);
          } catch (fallbackError) {
            return sendWriteFallbackError(res, fallbackError);
          }
        }

        return sendError(res, error);
      }
    } catch (error: any) {
      return sendError(res, error);
    }
  };

  const getAdminReturns = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user || !isAdminUser(req)) {
        return sendCode(res, 403, 'ADMIN_REQUIRED');
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
      const status = req.query.status as string | undefined;

      const legacyData = await listReturns({ page, pageSize, status });
      const fallbackData = shouldFallbackToReturnRequestList(legacyData)
        ? await returnRequestService.getAdminReturns({
            page,
            limit: pageSize,
            status: status && status !== 'ALL' ? status : undefined,
          })
        : null;

      const data = fallbackData ? mapReturnRequestAdminListToLegacy(fallbackData) : legacyData;

      return res.json({ success: true, ...data });
    } catch (error: any) {
      return sendError(res, error);
    }
  };

  return {
    getAdminReturns,
    patchProcessReturn,
  };
};
