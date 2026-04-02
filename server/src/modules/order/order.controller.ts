import { NextFunction, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { cancelOrderBodySchema, orderIdParamSchema } from './order.validator';
import { AppError } from '../../middlewares/error.middleware';
import { cancelOrderForUser, getOrderDetailForUser } from './order.service';

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = orderIdParamSchema.parse(req.params);
    const user = req.user;

    if (!user || typeof user.userId !== 'number' || !Array.isArray(user.roles)) {
      throw new AppError(401, 'UNAUTHORIZED', 'common:errors.unauthorized');
    }

    const data = await getOrderDetailForUser(id, {
      userId: user.userId,
      roles: user.roles,
    });

    return res.json({
      success: true,
      messageKey: 'common:success.ok',
      message: 'Request processed successfully.',
      data,
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return next(new AppError(400, 'VALIDATION_ERROR', 'common:errors.validation', undefined, error?.issues));
    }
    return next(error);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = orderIdParamSchema.parse(req.params);
    const payload = cancelOrderBodySchema.parse(req.body ?? {});
    const user = req.user;

    if (!user || typeof user.userId !== 'number' || !Array.isArray(user.roles)) {
      throw new AppError(401, 'UNAUTHORIZED', 'common:errors.unauthorized');
    }

    const data = await cancelOrderForUser(id, {
      userId: user.userId,
      roles: user.roles,
    }, payload);

    return res.json({
      success: true,
      messageKey: 'common:success.ok',
      message: 'Request processed successfully.',
      data,
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return next(new AppError(400, 'VALIDATION_ERROR', 'common:errors.validation', undefined, error?.issues));
    }
    return next(error);
  }
};

