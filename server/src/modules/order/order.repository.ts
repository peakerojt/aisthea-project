import { prisma } from '../../utils/prisma';

export type OrderWithRelations = Awaited<ReturnType<typeof findOrderByIdWithRelations>>;

export async function findOrderByIdWithRelations(orderId: number) {
  return prisma.order.findUnique({
    where: { orderId },
    include: {
      user: true,
      items: {
        include: {
          variant: {
            include: {
              images: true,
              product: true,
            },
          },
        },
      },
      payments: true,
      statusHistory: true,
    },
  });
}

export async function appendOrderStatusHistory(orderId: number, status: string, changedAt?: Date) {
  return prisma.orderStatusHistory.create({
    data: {
      orderId,
      status,
      changedAt: changedAt ?? new Date(),
    },
  });
}

export async function updateOrderStatus(orderId: number, status: string) {
  return prisma.order.update({
    where: { orderId },
    data: {
      status,
    },
    include: {
      user: true,
      items: {
        include: {
          variant: {
            include: {
              images: true,
              product: true,
            },
          },
        },
      },
      payments: true,
      statusHistory: true,
    },
  });
}

