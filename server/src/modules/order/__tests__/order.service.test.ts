import * as repo from '../order.repository';
import { cancelOrderForUser, getOrderDetailForUser, AppError } from '../order.service';

jest.mock('../order.repository');

const mockedRepo = repo as jest.Mocked<typeof repo>;

describe('order.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getOrderDetailForUser', () => {
    it('throws NOT_FOUND when order does not exist', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce(null as any);

      await expect(
        getOrderDetailForUser('123', { userId: 1, roles: ['Customer'] }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('throws FORBIDDEN when non-admin accesses other user order', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 999,
        status: 'Pending',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: 'W',
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      await expect(
        getOrderDetailForUser('10', { userId: 1, roles: ['Customer'] }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    });

    it('allows admin', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 999,
        status: 'Confirmed',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: 'W',
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: 'note',
        user: { email: 'x@example.com' },
        items: [
          {
            sku: 'SKU',
            productName: 'P',
            variantName: 'V',
            unitPrice: 50,
            quantity: 2,
            variant: null,
          },
        ],
        payments: [],
        statusHistory: [
          { status: 'Pending', changedAt: new Date('2026-02-24T08:00:00.000Z') },
          { status: 'Confirmed', changedAt: new Date('2026-02-24T08:10:00.000Z') },
        ],
      } as any);

      const dto = await getOrderDetailForUser('10', { userId: 1, roles: ['Admin'] });
      expect(dto.orderCode).toBe('OD20260001');
      expect(dto.status).toBe('confirmed');
      expect(dto.timeline).toHaveLength(2);
      expect(dto.note).toBe('note');
    });
  });

  describe('cancelOrderForUser', () => {
    it('rejects cancel when status is not pending/confirmed', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Shipping',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      await expect(
        cancelOrderForUser('10', { userId: 1, roles: ['Customer'] }),
      ).rejects.toMatchObject({ code: 'ORDER_CANNOT_BE_CANCELLED', status: 400 });
    });

    it('updates status and appends history', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Pending',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      mockedRepo.updateOrderStatus.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Cancelled',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      mockedRepo.appendOrderStatusHistory.mockResolvedValueOnce({} as any);

      const dto = await cancelOrderForUser('10', { userId: 1, roles: ['Customer'] });
      expect(mockedRepo.updateOrderStatus).toHaveBeenCalledWith(10, 'Cancelled');
      expect(mockedRepo.appendOrderStatusHistory).toHaveBeenCalledWith(10, 'Cancelled');
      expect(dto.status).toBe('cancelled');
    });
  });
});

