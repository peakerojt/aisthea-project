import { Request, Response } from 'express';
import {
  createReturnRequestSchema,
  idParamSchema,
} from '../validators/request.validator';
import {
  AuthenticatedRequest,
  ReturnRequestControllerTools,
  getWorkflowActor,
  getUserId,
  parseOrError,
  sendError,
} from './controller-tools';
import { ServiceError } from '../services/request.service';

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
        const view = req.query.view === 'summary' ? 'summary' : 'full';
        const orderIds = String(req.query.orderIds ?? '')
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0);
        const updatedSinceValue = String(req.query.updatedSince ?? '').trim();
        const updatedSince = updatedSinceValue ? new Date(updatedSinceValue) : null;
        return service.getMyReturns(userId, page, limit, view, {
          orderIds: orderIds.length ? orderIds : undefined,
          updatedSince:
            updatedSince && !Number.isNaN(updatedSince.getTime()) ? updatedSince : undefined,
        });
      },
      { failureCode: 'GET_MY_RETURNS_FAILED' },
    );
  };

  const detail = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const data = await service.getReturnDetail(id, getWorkflowActor(req));
        if (!data) {
          throw new ServiceError('NOT_FOUND', 'Return request not found', 404);
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
