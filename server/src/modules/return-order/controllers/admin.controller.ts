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

  const completeBankRefund = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        const body = parseOrError(completeBankRefundSchema, req.body);
        return service.completeManualBankRefund(id, getUserId(req), body);
      },
      { failureCode: 'COMPLETE_BANK_REFUND_FAILED' },
    );

  const uploadPayoutProofImage = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const body = parseOrError(uploadPayoutProofImageSchema, req.body);
        return service.uploadPayoutProofImage(getUserId(req), body);
      },
      { failureCode: 'UPLOAD_PAYOUT_PROOF_IMAGE_FAILED' },
    );

  const listRefundPayoutProofs = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.listRefundPayoutProofs(id);
      },
      { failureCode: 'GET_REFUND_PAYOUT_PROOFS_FAILED' },
    );

  const sendBankInfoReminder = async (req: AuthenticatedRequest, res: Response) =>
    runAction(
      res,
      async () => {
        const { id } = parseOrError(idParamSchema, req.params);
        return service.sendBankInfoReminder(id, getUserId(req));
      },
      { failureCode: 'SEND_BANK_INFO_REMINDER_FAILED' },
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
    completeBankRefund,
    uploadPayoutProofImage,
    listRefundPayoutProofs,
    sendBankInfoReminder,
    updateRefundStatus,
    reject,
  };
};
