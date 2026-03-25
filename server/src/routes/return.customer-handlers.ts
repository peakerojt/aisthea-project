import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ReturnRequestService } from '../modules/return-order/services/return-request.service';
import { hasSupportAccess } from '../shared/role-access';
import {
  buildLegacyCustomerReturnsPayload,
  resolveLegacyRouteDetailData,
} from '../shared/legacy-return-read.adapter';
import { prisma } from '../utils/prisma';

const returnRequestService = new ReturnRequestService();

const getPagination = (req: AuthRequest) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Number(req.query.limit || 10));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const getMyLegacyReturns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { page, limit, skip } = getPagination(req);

    const [legacyReturns, legacyTotal] = await Promise.all([
      (prisma.orderReturn.findMany as any)({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { orderNumber: true, totalAmount: true } },
        },
      }),
      (prisma.orderReturn.count as any)({ where: { userId } }),
    ]);

    const fallbackResult = legacyReturns.length === 0 && legacyTotal === 0
      ? await returnRequestService.getMyReturns(userId, page, limit)
      : null;

    return res.json({
      success: true,
      data: {
        ...buildLegacyCustomerReturnsPayload({
          legacyReturns,
          legacyTotal,
          fallbackResult,
          page,
          limit,
        }),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getLegacyReturnDetail = async (req: AuthRequest, res: Response) => {
  try {
    const returnId = Number(req.params.id);
    if (!Number.isFinite(returnId) || returnId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid return ID' });
    }

    const legacyRecord = await (prisma.orderReturn.findUnique as any)({
      where: { returnId },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: { select: { userId: true, fullName: true, email: true, avatarUrl: true } },
      },
    });
    const fallbackDetail = legacyRecord ? null : await returnRequestService.getReturnDetail(returnId);
    const ret = resolveLegacyRouteDetailData(legacyRecord, fallbackDetail);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });

    if (!hasSupportAccess(req.user) && ret.userId !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({
      success: true,
      data: ret,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
