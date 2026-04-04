import { createReturnRequestAdminHandlers } from './admin.controller';
import { createReturnRequestCustomerHandlers } from './customer.controller';
import {
  createReturnRequestControllerTools,
  ReturnRequestControllerTools,
} from './controller-tools';

export class ReturnRequestController {
  create!: ReturnType<typeof createReturnRequestCustomerHandlers>['create'];
  myReturns!: ReturnType<typeof createReturnRequestCustomerHandlers>['myReturns'];
  detail!: ReturnType<typeof createReturnRequestCustomerHandlers>['detail'];
  adminList!: ReturnType<typeof createReturnRequestAdminHandlers>['adminList'];
  approve!: ReturnType<typeof createReturnRequestAdminHandlers>['approve'];
  acceptForRefund!: ReturnType<typeof createReturnRequestAdminHandlers>['acceptForRefund'];
  markInTransit!: ReturnType<typeof createReturnRequestAdminHandlers>['markInTransit'];
  reject!: ReturnType<typeof createReturnRequestAdminHandlers>['reject'];
  markReceived!: ReturnType<typeof createReturnRequestAdminHandlers>['markReceived'];
  refund!: ReturnType<typeof createReturnRequestAdminHandlers>['refund'];
  completeBankRefund!: ReturnType<typeof createReturnRequestAdminHandlers>['completeBankRefund'];
  uploadPayoutProofImage!: ReturnType<typeof createReturnRequestAdminHandlers>['uploadPayoutProofImage'];
  listRefundPayoutProofs!: ReturnType<typeof createReturnRequestAdminHandlers>['listRefundPayoutProofs'];
  sendBankInfoReminder!: ReturnType<typeof createReturnRequestAdminHandlers>['sendBankInfoReminder'];
  updateRefundStatus!: ReturnType<typeof createReturnRequestAdminHandlers>['updateRefundStatus'];

  constructor(tools: ReturnRequestControllerTools = createReturnRequestControllerTools()) {
    Object.assign(this, createReturnRequestCustomerHandlers(tools));
    Object.assign(this, createReturnRequestAdminHandlers(tools));
  }
}
