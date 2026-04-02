/**
 * return.service.ts (client)
 * Customer/common compatibility facade for the Return & Refund module.
 */

import { returnCustomerListReadService } from '@/common/services/return.customer-list-read.service';
import {
  ReturnCustomerWriteError,
  returnCustomerWriteService,
} from '@/common/services/return.customer-write.service';
import { returnDetailReadService } from '@/common/services/return.detail-read.service';
import { returnOrderReadService } from '@/common/services/return.order-read.service';
import { returnSummaryService } from '@/common/services/return.summary.service';
import type {
  CreateReturnPayload,
  MyReturnListResponse,
  MyReturnSummary,
  OrderReturn,
  ReturnListResponse,
  ReturnRequest,
  ReturnRequestDetail,
} from '@/common/services/return.types';

export type {
  CreateReturnPayload,
  MyReturnListResponse,
  MyReturnSummary,
  OrderReturn,
  RawReturnStatus,
  RefundMethod,
  RefundWorkflowStatus,
  ReturnListResponse,
  ReturnReason,
  ReturnRequest,
  ReturnRequestAttachment,
  ReturnRequestDetail,
  ReturnRequestItem,
  ReturnRequestStatusLog,
  ReturnRefundTransaction,
  ReturnServiceEnvelope,
  ReturnStatus,
} from '@/common/services/return.types';

export { ReturnCustomerWriteError } from '@/common/services/return.customer-write.service';

export const returnService = {
  async create(payload: CreateReturnPayload): Promise<ReturnRequest> {
    return returnCustomerWriteService.create(payload);
  },

  async getForOrder(orderId: number): Promise<OrderReturn | null> {
    return returnOrderReadService.getForOrder(orderId);
  },

  async myReturns(page = 1, limit = 8): Promise<MyReturnListResponse> {
    return returnCustomerListReadService.myReturns(page, limit);
  },

  async myReturnSummaries(
    page = 1,
    limit = 8,
    options?: { orderIds?: number[]; updatedSince?: string },
  ): Promise<MyReturnSummary[]> {
    return returnSummaryService.myReturnSummaries(page, limit, options);
  },

  async detail(returnId: number): Promise<ReturnRequestDetail> {
    return returnDetailReadService.detail(returnId);
  },
};
