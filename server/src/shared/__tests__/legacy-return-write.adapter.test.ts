import { ServiceError } from '../../modules/return-order/services/return-request.service';
import {
  createReturnWithModernFallback,
  mapCreateReturnRequestToLegacy,
  processReturnWithModernFallback,
} from '../legacy-return-write.adapter';

describe('legacy-return-write.adapter', () => {
  it('maps return-request create results into the legacy create shape', () => {
    expect(
      mapCreateReturnRequestToLegacy({
        returnRequestId: 91,
        orderId: 81,
        status: 'REQUESTED',
      }),
    ).toEqual({
      returnId: 91,
      orderId: 81,
      status: 'REQUESTED',
    });
  });

  it('uses the modern compatibility path for create when the order is safe to migrate', async () => {
    const createLegacyCompatibleReturnRequest = jest.fn().mockResolvedValue({
      returnRequestId: 92,
      orderId: 82,
      status: 'REQUESTED',
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
      status: 'REQUESTED',
    });
  });

  it('falls back to legacy create when compatibility mode requires item selection', async () => {
    const createLegacyCompatibleReturnRequest = jest
      .fn()
      .mockRejectedValue(
        new ServiceError(
          'LEGACY_CREATE_REQUIRES_ITEM_SELECTION',
          'Legacy create flow requires explicit item selection before migration',
          409,
        ),
      );
    const fallback = jest.fn().mockResolvedValue({
      returnId: 41,
      status: 'PENDING_APPROVAL',
    });

    const result = await createReturnWithModernFallback(
      { createLegacyCompatibleReturnRequest },
      {
        orderId: 12,
        userId: 5,
        roles: ['Customer'],
        reason: 'Wrong item received',
        proofImages: ['https://example.com/proof-12.jpg'],
      },
      fallback,
    );

    expect(fallback).toHaveBeenCalledWith(
      12,
      5,
      ['Customer'],
      'Wrong item received',
      ['https://example.com/proof-12.jpg'],
    );
    expect(result).toEqual({
      returnId: 41,
      status: 'PENDING_APPROVAL',
    });
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

  it('processes refund fallback sequencing through the modern service bridge', async () => {
    const service = {
      approveReturnRequest: jest.fn().mockResolvedValue(undefined),
      rejectReturnRequest: jest.fn().mockResolvedValue(undefined),
      getReturnDetail: jest.fn().mockResolvedValue({ status: 'REQUESTED' }),
      markReturnReceived: jest.fn().mockResolvedValue(undefined),
      refundReturnRequest: jest.fn().mockResolvedValue(undefined),
    };

    const result = await processReturnWithModernFallback(
      service,
      24,
      9,
      'COMPLETE_REFUND',
      'Refunded in fallback flow',
    );

    expect(service.getReturnDetail).toHaveBeenCalledWith(24);
    expect(service.approveReturnRequest).toHaveBeenCalledWith(24, 9);
    expect(service.markReturnReceived).toHaveBeenCalledWith(24, 9);
    expect(service.refundReturnRequest).toHaveBeenCalledWith(24, 9, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'legacy-return-refund-24',
    });
    expect(result).toEqual({ success: true, code: 'REFUND_COMPLETED' });
  });
});
