const prismaMock = {
  coupon: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { updateCoupon } from '../coupon.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('coupon.controller updateCoupon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks editing inactive coupons', async () => {
    prismaMock.coupon.findUnique.mockResolvedValueOnce({
      couponId: 10,
      code: 'LOCKEDOFF',
      type: 'FIXED_AMOUNT',
      value: 10000,
      startDate: new Date('2026-04-14T00:00:00.000Z'),
      endDate: new Date('2026-04-16T00:00:00.000Z'),
      usageLimit: 100,
      usedCount: 0,
      isActive: false,
    });

    const req: any = {
      params: { id: 10 },
      body: { code: 'LOCKEDOFF' },
    };
    const res = createResponse();

    await updateCoupon(req, res);

    expect(prismaMock.coupon.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Mã giảm giá vô hiệu không thể chỉnh sửa.',
      code: 'COUPON_EDIT_LOCKED',
    });
  });

  it('blocks editing expired coupons', async () => {
    prismaMock.coupon.findUnique.mockResolvedValueOnce({
      couponId: 11,
      code: 'SUMMER50',
      type: 'PERCENTAGE',
      value: 5,
      startDate: new Date('2026-03-17T00:00:00.000Z'),
      endDate: new Date('2026-03-18T00:00:00.000Z'),
      usageLimit: 100,
      usedCount: 2,
      isActive: true,
    });

    const req: any = {
      params: { id: 11 },
      body: { code: 'SUMMER50' },
    };
    const res = createResponse();

    await updateCoupon(req, res);

    expect(prismaMock.coupon.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Mã giảm giá đã hết hạn không thể chỉnh sửa.',
      code: 'COUPON_EDIT_LOCKED',
    });
  });
});
