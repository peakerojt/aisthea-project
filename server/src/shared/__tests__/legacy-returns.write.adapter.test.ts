import { ServiceError } from '../../modules/return-order/services/request.service';
import {
  createReturnWithModernFallback,
  mapCreateReturnRequestToLegacy,
  processReturnWithModernFallback,
} from '../legacy-returns.write.adapter';

describe('legacy-returns.write.adapter', () => {
  it('maps return-request create results into the legacy create shape', () => {
    expect(
      mapCreateReturnRequestToLegacy({
        returnRequestId: 91,
        orderId: 81,
        status: 'REQUESTED',
        statusBucket: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
      }),
    ).toEqual({
      returnId: 91,
      orderId: 81,
      status: 'REQUESTED',
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'MANUAL_REVIEW',
    });
  });

  it('canonicalizes legacy workflow aliases when mapping create results into the legacy shape', () => {
    expect(
      mapCreateReturnRequestToLegacy({
        returnRequestId: 93,
        orderId: 83,
        status: 'COMPLETED',
      }),
    ).toEqual({
      returnId: 93,
      orderId: 83,
      status: 'COMPLETED',
      statusBucket: undefined,
      workflowStatus: 'CLOSED',
      refundStatus: 'NOT_APPLICABLE',
    });
  });

  it('uses the modern compatibility path for create when the order is safe to migrate', async () => {
    const createLegacyCompatibleReturnRequest = jest.fn().mockResolvedValue({
      returnRequestId: 92,
      orderId: 82,
      status: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'NOT_APPLICABLE',
    });
    const fallback = jest.fn();

    const result = await createReturnWithModernFallback(
      { createLegacyCompatibleReturnRequest },
      {
        orderId: 82,
        userId: 5,
        roles: ['Customer'],
        reason: 'Wrong item received',
        proofImages: ['https://example.com/proof-82.jpg'],
      },
      fallback,
    );

    expect(createLegacyCompatibleReturnRequest).toHaveBeenCalledWith(5, {
      orderId: 82,
      reason: 'Wrong item received',
      proofImages: ['https://example.com/proof-82.jpg'],
    });
    expect(fallback).not.toHaveBeenCalled();
    expect(result).toEqual({
      returnId: 92,
      orderId: 82,
      status: 'PENDING_ADMIN_REVIEW',
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'NOT_APPLICABLE',
    });
  });

  it('surfaces ITEM_SELECTION_REQUIRED without falling back to legacy create', async () => {
    const createLegacyCompatibleReturnRequest = jest
      .fn()
      .mockRejectedValue(
        new ServiceError(
          'ITEM_SELECTION_REQUIRED',
          'Explicit item selection is required for this legacy create request',
          409,
        ),
      );
    const fallback = jest.fn();

    await expect(
      createReturnWithModernFallback(
        { createLegacyCompatibleReturnRequest },
        {
          orderId: 12,
          userId: 5,
          roles: ['Customer'],
          reason: 'Wrong item received',
          proofImages: ['https://example.com/proof-12.jpg'],
        },
        fallback,
      ),
    ).rejects.toMatchObject({
      code: 'ITEM_SELECTION_REQUIRED',
      status: 409,
    });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('rethrows ServiceError values that are not the legacy item-selection sentinel', async () => {
    const createLegacyCompatibleReturnRequest = jest
      .fn()
      .mockRejectedValue(new ServiceError('ORDER_NOT_DELIVERED', 'Only DELIVERED orders can be returned', 400));
    const fallback = jest.fn();

    await expect(
      createReturnWithModernFallback(
        { createLegacyCompatibleReturnRequest },
        {
          orderId: 12,
          userId: 5,
          roles: ['Customer'],
          reason: 'Wrong item received',
          proofImages: [],
        },
        fallback,
      ),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_DELIVERED',
      status: 400,
    });

    expect(fallback).not.toHaveBeenCalled();
  });

  it('rethrows RETURN_ALREADY_EXISTS without falling back to legacy create', async () => {
    const createLegacyCompatibleReturnRequest = jest
      .fn()
      .mockRejectedValue(
        new ServiceError(
          'RETURN_ALREADY_EXISTS',
          'This order already has an active return request',
          409,
        ),
      );
    const fallback = jest.fn();

    await expect(
      createReturnWithModernFallback(
        { createLegacyCompatibleReturnRequest },
        {
          orderId: 12,
          userId: 5,
          roles: ['Customer'],
          reason: 'Wrong item received',
          proofImages: [],
        },
        fallback,
      ),
    ).rejects.toMatchObject({
      code: 'RETURN_ALREADY_EXISTS',
      status: 409,
    });

    expect(fallback).not.toHaveBeenCalled();
  });

  it('processes refund fallback sequencing through the modern service bridge', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({ status: 'PENDING_ADMIN_REVIEW' }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(
      service,
      24,
      9,
      'COMPLETE_REFUND',
      'Refunded in fallback flow',
    );

    expect(service.getReturnDetail).toHaveBeenCalledWith(24, expect.anything());
    expect(service.approveReturnRequest).toHaveBeenCalledWith(24, 9, expect.anything());
    expect(service.markReturnInTransit).toHaveBeenCalledWith(24, 9, expect.anything());
    expect(service.markReturnReceived).toHaveBeenCalledWith(24, 9, expect.anything());
    expect(service.acceptReturnForRefund).toHaveBeenCalledWith(24, 9, expect.anything());
    expect(service.refundReturnRequest).toHaveBeenCalledWith(24, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-24',
    }, expect.anything());
    expect(result).toEqual({ success: true, code: 'REFUND_COMPLETED' });
  });

  it('prefers workflowStatus over legacy status buckets during refund fallback sequencing', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({
        status: 'REQUESTED',
        workflowStatus: 'IN_RETURN_TRANSIT',
      }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(service, 25, 9, 'COMPLETE_REFUND');

    expect(service.approveReturnRequest).not.toHaveBeenCalled();
    expect(service.markReturnInTransit).not.toHaveBeenCalled();
    expect(service.getReturnDetail).toHaveBeenCalledWith(25, expect.anything());
    expect(service.markReturnReceived).toHaveBeenCalledWith(25, 9, expect.anything());
    expect(service.acceptReturnForRefund).toHaveBeenCalledWith(25, 9, expect.anything());
    expect(service.refundReturnRequest).toHaveBeenCalledWith(25, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-25',
    }, expect.anything());
    expect(result).toEqual({ success: true, code: 'REFUND_COMPLETED' });
  });

  it('canonicalizes legacy workflow aliases during fallback sequencing', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({
        status: 'REQUESTED',
        workflowStatus: 'PENDING_APPROVAL',
      }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(service, 29, 9, 'COMPLETE_REFUND');

    expect(service.approveReturnRequest).toHaveBeenCalledWith(29, 9, expect.anything());
    expect(service.markReturnInTransit).toHaveBeenCalledWith(29, 9, expect.anything());
    expect(service.markReturnReceived).toHaveBeenCalledWith(29, 9, expect.anything());
    expect(service.acceptReturnForRefund).toHaveBeenCalledWith(29, 9, expect.anything());
    expect(service.refundReturnRequest).toHaveBeenCalledWith(29, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-29',
    }, expect.anything());
    expect(result).toEqual({ success: true, code: 'REFUND_COMPLETED' });
  });

  it('blocks refund fallback when refundStatus is locked until payment confirmation', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({
        status: 'PENDING_PAYMENT_CONFIRMATION',
        workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      processReturnWithModernFallback(service, 26, 9, 'COMPLETE_REFUND'),
    ).rejects.toMatchObject({
      code: 'RETURN_REFUND_LOCKED',
      status: 409,
    });

    expect(service.approveReturnRequest).not.toHaveBeenCalled();
    expect(service.markReturnInTransit).not.toHaveBeenCalled();
    expect(service.markReturnReceived).not.toHaveBeenCalled();
    expect(service.acceptReturnForRefund).not.toHaveBeenCalled();
    expect(service.refundReturnRequest).not.toHaveBeenCalled();
  });

  it('supports direct stage transitions through the modern fallback bridge', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({
        status: 'APPROVED',
        workflowStatus: 'APPROVED',
      }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(service, 27, 9, 'MARK_IN_TRANSIT');

    expect(service.approveReturnRequest).not.toHaveBeenCalled();
    expect(service.getReturnDetail).toHaveBeenCalledWith(27, expect.anything());
    expect(service.markReturnInTransit).toHaveBeenCalledWith(27, 9, expect.anything());
    expect(service.markReturnReceived).not.toHaveBeenCalled();
    expect(service.acceptReturnForRefund).not.toHaveBeenCalled();
    expect(service.refundReturnRequest).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, code: 'RETURN_MARKED_IN_TRANSIT' });
  });

  it('supports refund-status actions through the modern fallback bridge', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
      }),
      markReturnInTransit: jest.fn().mockResolvedValue(undefined),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      acceptReturnForRefund: jest.fn().mockResolvedValue(undefined),
      updateRefundStatus: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(
      service,
      28,
      9,
      'SET_REFUND_PROCESSING',
      'Gateway reconciliation started',
    );

    expect(service.updateRefundStatus).toHaveBeenCalledWith(28, 9, {
      refundStatus: 'PROCESSING',
      comment: 'Gateway reconciliation started',
    }, expect.anything());
    expect(service.refundReturnRequest).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, code: 'RETURN_REFUND_PROCESSING' });
  });
});
