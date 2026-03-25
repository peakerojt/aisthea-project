import { createReturnRequestAdminHandlers } from './return-request.admin-controller';
import { createReturnRequestCustomerHandlers } from './return-request.customer-controller';
import {
  createReturnRequestControllerTools,
  ReturnRequestControllerTools,
} from './return-request.controller.shared';

export class ReturnRequestController {
  create!: ReturnType<typeof createReturnRequestCustomerHandlers>['create'];
  myReturns!: ReturnType<typeof createReturnRequestCustomerHandlers>['myReturns'];
  detail!: ReturnType<typeof createReturnRequestCustomerHandlers>['detail'];
  adminList!: ReturnType<typeof createReturnRequestAdminHandlers>['adminList'];
  approve!: ReturnType<typeof createReturnRequestAdminHandlers>['approve'];
  reject!: ReturnType<typeof createReturnRequestAdminHandlers>['reject'];
  markReceived!: ReturnType<typeof createReturnRequestAdminHandlers>['markReceived'];
  refund!: ReturnType<typeof createReturnRequestAdminHandlers>['refund'];

  constructor(tools: ReturnRequestControllerTools = createReturnRequestControllerTools()) {
    Object.assign(this, createReturnRequestCustomerHandlers(tools));
    Object.assign(this, createReturnRequestAdminHandlers(tools));
  }
}
