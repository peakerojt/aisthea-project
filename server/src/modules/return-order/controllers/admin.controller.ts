import { Response } from 'express';
import {
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  refundStatusSchema,
  rejectSchema,
} from '../validators/request.validator';
import {
  AuthenticatedRequest,
  ReturnRequestControllerTools,
  getUserId,
  parseOrError,
} from './controller-tools';

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

  const markInTransit = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.markReturnInTransit(id, getUserId(req));
      },
      { failureCode: 'MARK_IN_TRANSIT_FAILED' },
    );

  const acceptForRefund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.acceptReturnForRefund(id, getUserId(req));
      },
      { failureCode: 'ACCEPT_FOR_REFUND_FAILED' },
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

  const updateRefundStatus = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(refundStatusSchema, req.body);
        return service.updateRefundStatus(id, getUserId(req), body);
      },
      { failureCode: 'UPDATE_REFUND_STATUS_FAILED' },
    );

  return {
    adminList,
    approve,
    acceptForRefund,
    markInTransit,
    markReceived,
    refund,
    updateRefundStatus,
    reject,
  };
};
