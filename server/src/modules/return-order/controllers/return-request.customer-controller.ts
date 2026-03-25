import { Request, Response } from 'express';
import { hasSupportAccess } from '../../../shared/role-access';
import {
  createReturnRequestSchema,
  idParamSchema,
} from '../validators/return-request.validator';
import {
  AuthenticatedRequest,
  ReturnRequestControllerTools,
  getUserId,
  parseOrError,
  sendError,
} from './return-request.controller.shared';
import { ServiceError } from '../services/return-request.service';

export const createReturnRequestCustomerHandlers = (
  tools: ReturnRequestControllerTools,
) => {
  const { runAction, service } = tools;

  const create = async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = getUserId(authReq);
    if (!userId) return sendError(res, 'UNAUTHORIZED', 'Unauthorized', 401);

    return runAction(
      res,
      async () => {
        const body = parseOrError(createReturnRequestSchema, req.body);
        return service.createReturnRequest(userId, body);
      },
      {
        successStatus: 201,
        failureCode: 'CREATE_RETURN_REQUEST_FAILED',
        logScope: '[returnRequestController] create failed',
      },
    );
  };

  const myReturns = async (req: AuthenticatedRequest, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'UNAUTHORIZED', 'Unauthorized', 401);

    return runAction(
      res,
      async () => {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);
        return service.getMyReturns(userId, page, limit);
      },
      { failureCode: 'GET_MY_RETURNS_FAILED' },
    );
  };

  const detail = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const data = await service.getReturnDetail(id);
        if (!data) {
          throw new ServiceError('NOT_FOUND', 'Return request not found', 404);
        }

        if (!hasSupportAccess(req.user) && data.userId !== getUserId(req)) {
          throw new ServiceError(
            'FORBIDDEN',
            'Insufficient access rights',
            403,
          );
        }

        return data;
      },
      { failureCode: 'GET_RETURN_DETAIL_FAILED' },
    );

  return {
    create,
    detail,
    myReturns,
  };
};
