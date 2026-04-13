import { Response } from 'express';
import {
  completeBankRefundSchema,
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  refundStatusSchema,
  rejectSchema,
  uploadPayoutProofImageSchema,
} from '../validators/request.validator';
import {
  AuthenticatedRequest,
  ReturnRequestControllerTools,
  getWorkflowActor,
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
        const actor = getWorkflowActor(req);
        const { page, limit, status, sort: _sort, ...summaryFilters } = filters;
        const [pagedResult, summary] = await Promise.all([
          service.getAdminReturns(filters, actor),
          service.getAdminReturnSummary(summaryFilters, actor),
        ]);

        return {
          ...pagedResult,
          summary,
        };
      },
      { failureCode: 'GET_ADMIN_RETURNS_FAILED' },
    );

  const approve = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.approveReturnRequest(id, getUserId(req), getWorkflowActor(req));
      },
      { failureCode: 'APPROVE_RETURN_FAILED' },
    );

  const reject = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const { reason } = parseOrError(rejectSchema, req.body);
        return service.rejectReturnRequest(id, getUserId(req), reason, getWorkflowActor(req));
      },
      { failureCode: 'REJECT_RETURN_FAILED' },
    );

  const markReceived = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.markReturnReceived(id, getUserId(req), getWorkflowActor(req));
      },
      { failureCode: 'MARK_RECEIVED_FAILED' },
    );

  const markInTransit = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.markReturnInTransit(id, getUserId(req), getWorkflowActor(req));
      },
      { failureCode: 'MARK_IN_TRANSIT_FAILED' },
    );

  const acceptForRefund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.acceptReturnForRefund(id, getUserId(req), getWorkflowActor(req));
      },
      { failureCode: 'ACCEPT_FOR_REFUND_FAILED' },
    );

  const refund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(refundSchema, req.body);
        return service.refundReturnRequest(id, getUserId(req), body, getWorkflowActor(req));
      },
      { failureCode: 'REFUND_RETURN_FAILED' },
    );

  const completeBankRefund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(completeBankRefundSchema, req.body);
        return service.completeManualBankRefund(id, getUserId(req), body, getWorkflowActor(req));
      },
      { failureCode: 'COMPLETE_BANK_REFUND_FAILED' },
    );

  const uploadPayoutProofImage = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const body = parseOrError(uploadPayoutProofImageSchema, req.body);
        return service.uploadPayoutProofImage(getUserId(req), body, getWorkflowActor(req));
      },
      { failureCode: 'UPLOAD_PAYOUT_PROOF_IMAGE_FAILED' },
    );

  const listRefundPayoutProofs = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.listRefundPayoutProofs(id, getWorkflowActor(req));
      },
      { failureCode: 'GET_REFUND_PAYOUT_PROOFS_FAILED' },
    );

  const sendBankInfoReminder = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.sendBankInfoReminder(id, getUserId(req), getWorkflowActor(req));
      },
      { failureCode: 'SEND_BANK_INFO_REMINDER_FAILED' },
    );

  const updateRefundStatus = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(refundStatusSchema, req.body);
        return service.updateRefundStatus(id, getUserId(req), body, getWorkflowActor(req));
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
    completeBankRefund,
    uploadPayoutProofImage,
    listRefundPayoutProofs,
    sendBankInfoReminder,
    updateRefundStatus,
    reject,
  };
};
