import { loadLegacyOrderReturnView } from '../legacy-returns.order.adapter';

jest.mock('../legacy-returns.read.adapter', () => ({
  resolveLegacyOrderReturnData: jest.fn(),
}));

import { resolveLegacyOrderReturnData } from '../legacy-returns.read.adapter';

describe('legacy-returns.order.adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the legacy order return read through one shared merge helper', async () => {
    const getReturnForOrder = jest.fn().mockResolvedValueOnce({ returnId: 81 });
    const returnRequestService = {
      getReturnDetailByOrderId: jest.fn().mockResolvedValueOnce({ returnRequestId: 181 }),
    };
    (resolveLegacyOrderReturnData as jest.Mock).mockReturnValueOnce({
      returnId: 181,
      workflowStatus: 'PENDING_ADMIN_REVIEW',
    });

    const result = await loadLegacyOrderReturnView(
      getReturnForOrder,
      returnRequestService,
      81,
    );

    expect(getReturnForOrder).toHaveBeenCalledWith(81);
    expect(returnRequestService.getReturnDetailByOrderId).toHaveBeenCalledWith(81);
    expect(resolveLegacyOrderReturnData).toHaveBeenCalledWith(
      { returnId: 81 },
      { returnRequestId: 181 },
    );
    expect(result).toEqual({
      returnId: 181,
      workflowStatus: 'PENDING_ADMIN_REVIEW',
    });
  });
});
