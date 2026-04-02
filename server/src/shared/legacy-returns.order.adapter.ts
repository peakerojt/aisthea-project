import { resolveLegacyOrderReturnData } from './legacy-returns.read.adapter';

type ReturnRequestOrderBridge = {
  getReturnDetailByOrderId: (orderId: number) => Promise<unknown>;
};

type LegacyOrderReturnLookup = (orderId: number) => Promise<unknown>;

export const loadLegacyOrderReturnView = async (
  getReturnForOrder: LegacyOrderReturnLookup,
  returnRequestService: Pick<ReturnRequestOrderBridge, 'getReturnDetailByOrderId'>,
  orderId: number,
) => {
  const [legacyRecord, detailRecord] = await Promise.all([
    getReturnForOrder(orderId),
    returnRequestService.getReturnDetailByOrderId(orderId),
  ]);

  return resolveLegacyOrderReturnData(legacyRecord, detailRecord);
};
