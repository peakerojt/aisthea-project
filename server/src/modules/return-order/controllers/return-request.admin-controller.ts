import { Response } from 'express';
import {
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  rejectSchema,
} from '../validators/return-request.validator';
import {
  AuthenticatedRequest,
  ReturnRequestControllerTools,
  getUserId,
  parseOrError,
} from './return-request.controller.shared';

export const createReturnRequestAdminHandlers = (
  tools: ReturnRequestControllerTools,
) => {
  const { runAction, service } = tools;

  const adminList = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const filters = parseOrError(listAdminReturnsSchema, req.query);
        return service.getAdminReturns(filters);
      },
      { failureCode: 'GET_ADMIN_RETURNS_FAILED' },
    );

  const approve = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.approveReturnRequest(id, getUserId(req));
      },
      { failureCode: 'APPROVE_RETURN_FAILED' },
    );

  const reject = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const { reason } = parseOrError(rejectSchema, req.body);
        return service.rejectReturnRequest(id, getUserId(req), reason);
      },
      { failureCode: 'REJECT_RETURN_FAILED' },
    );

  const markReceived = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.markReturnReceived(id, getUserId(req));
      },
      { failureCode: 'MARK_RECEIVED_FAILED' },
    );

  const refund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(refundSchema, req.body);
        return service.refundReturnRequest(id, getUserId(req), body);
      },
      { failureCode: 'REFUND_RETURN_FAILED' },
    );

  return {
    adminList,
    approve,
    markReceived,
    refund,
    reject,
  };
};
