import { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';
import { createVnpayPaymentUrl, handleVnpayIpn, handleVnpayQueryResult, handleVnpayReturn } from '../modules/payments/vnpay.service';

export const createPaymentUrl = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as { socket?: { remoteAddress?: string } }).socket?.remoteAddress;

    const result = await createVnpayPaymentUrl({
      userId: authReq.user?.userId,
      orderId: req.body?.orderId,
      bankCode: req.body?.bankCode,
      orderDescription: req.body?.orderDescription,
      orderType: req.body?.orderType,
      language: req.body?.language,
      ipAddr: typeof ipAddr === 'string' ? ipAddr : undefined,
    });

    res.status(result.status).json(result.body);
  } catch (error: unknown) {
    logger.error('[vnpayController] createPaymentUrl failed', { error });
    res.status(500).json({ errorCode: 'CREATE_PAYMENT_URL_FAILED' });
  }
};

export const vnpayReturn = async (req: Request, res: Response) => {
  const result = await handleVnpayReturn(req.query as Record<string, unknown>);
  return res.status(result.status).json(result.body);
};

export const vnpayIpn = async (req: Request, res: Response) => {
  const result = await handleVnpayIpn(req.query as Record<string, unknown>);
  return res.status(result.status).json(result.body);
};

export const vnpayQuery = async (req: Request, res: Response) => {
  const result = await handleVnpayQueryResult(req.query as Record<string, unknown>);
  return res.status(result.status).json(result.body);
};
