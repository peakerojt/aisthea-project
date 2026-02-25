import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { orderIdParamSchema } from './order.validator';
import { AppError, cancelOrderForUser, getOrderDetailForUser } from './order.service';

const sendError = (res: Response, error: AppError | Error) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  console.error('Unexpected error while handling order request:', error);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = orderIdParamSchema.parse(req.params);
    const user = req.user;

    if (!user || typeof user.userId !== 'number' || !Array.isArray(user.roles)) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const data = await getOrderDetailForUser(id, {
      userId: user.userId,
      roles: user.roles,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return sendError(res, error);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = orderIdParamSchema.parse(req.params);
    const user = req.user;

    if (!user || typeof user.userId !== 'number' || !Array.isArray(user.roles)) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const data = await cancelOrderForUser(id, {
      userId: user.userId,
      roles: user.roles,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return sendError(res, error);
  }
};

