import { Request, Response } from 'express';
import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';
import { prisma } from '../utils/prisma';
import { logger } from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

const SUCCESSFUL_PAYMENT_STATUSES = ['COMPLETED', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'];

function sortObject(obj: any) {
  const sorted: any = {};
  const keys = Object.keys(obj).map((key) => encodeURIComponent(key)).sort();

  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }

  return sorted;
}

const hasCompletedPayment = (payments: Array<{ status: string | null | undefined }>) =>
  payments.some((payment) => SUCCESSFUL_PAYMENT_STATUSES.includes((payment.status ?? '').toUpperCase()));

const upsertVnpayPayment = async ({
  orderId,
  payments,
  amount,
  status,
  transactionCode,
  note,
}: {
  orderId: number;
  payments: Array<{
    paymentId: number;
    paymentMethod: string | null;
    transactionCode?: string | null;
  }>;
  amount: number;
  status: 'COMPLETED' | 'FAILED';
  transactionCode?: string | null;
  note?: string | null;
}) => {
  const latestPayment = payments[0] ?? null;

  if (latestPayment && (latestPayment.paymentMethod ?? '').toUpperCase() === 'VNPAY') {
    await prisma.payment.update({
      where: { paymentId: latestPayment.paymentId },
      data: {
        amount,
        status,
        transactionCode: transactionCode ?? latestPayment.transactionCode ?? null,
        note: note ?? null,
      },
    });
    return;
  }

  await prisma.payment.create({
    data: {
      orderId,
      paymentMethod: 'VNPAY',
      amount,
      status,
      transactionCode: transactionCode ?? null,
      note: note ?? null,
    },
  });
};

export const createPaymentUrl = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(401).json({ errorCode: 'UNAUTHORIZED' });
    }

    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const createDate = moment(new Date()).format('YYYYMMDDHHmmss');

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    let vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      return res.status(500).json({ errorCode: 'CREATE_PAYMENT_URL_FAILED', messageKey: 'payments:errors.configMissing' });
    }

    const ipAddr =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any).socket?.remoteAddress;

    const { bankCode, orderId, orderDescription, orderType } = req.body;

    if (!orderId) {
      return res.status(400).json({ errorCode: 'MISSING_ORDER_ID' });
    }

    const parsedOrderId = parseInt(String(orderId), 10);
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: parsedOrderId },
      include: {
        payments: {
          orderBy: { paymentId: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ errorCode: 'ORDER_NOT_FOUND' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ errorCode: 'FORBIDDEN' });
    }

    if ((order.paymentMethod ?? '').toUpperCase() !== 'VNPAY') {
      return res.status(400).json({ errorCode: 'ORDER_NOT_VNPAY' });
    }

    if (hasCompletedPayment(order.payments)) {
      return res.status(409).json({ errorCode: 'ORDER_ALREADY_PAID' });
    }

    const locale = req.body.language || 'vn';
    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: parsedOrderId,
      vnp_OrderInfo: orderDescription || `Thanh toan don hang ${parsedOrderId}`,
      vnp_OrderType: orderType || 'other',
      vnp_Amount: Math.round(Number(order.totalAmount) * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: String(ipAddr ?? ''),
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    const sortedParams = sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const signed = crypto.createHmac('sha512', secretKey).update(Buffer.from(signData, 'utf-8')).digest('hex');
    sortedParams.vnp_SecureHash = signed;
    vnpUrl += `?${querystring.stringify(sortedParams, { encode: false })}`;

    res.status(200).json({ success: true, data: { vnpUrl } });
  } catch (error) {
    logger.error('[vnpayController] createPaymentUrl failed', { error });
    res.status(500).json({ errorCode: 'CREATE_PAYMENT_URL_FAILED' });
  }
};

export const vnpayReturn = async (req: Request, res: Response) => {
  let vnpParams = req.query;
  const secureHash = vnpParams.vnp_SecureHash;

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  vnpParams = sortObject(vnpParams);

  const secretKey = process.env.VNP_HASH_SECRET;
  if (!secretKey) {
    return res.status(500).json({ message: 'Missing VNPAY configuration', code: '97' });
  }

  const signData = querystring.stringify(vnpParams, { encode: false });
  const signed = crypto.createHmac('sha512', secretKey).update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (secureHash !== signed) {
    return res.status(200).json({ message: 'Fail checksum', code: '97' });
  }

  const parsedOrderId = parseInt(String(vnpParams.vnp_TxnRef ?? ''), 10);
  if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
    return res.status(200).json({ message: 'Invalid order', code: '01' });
  }

  const order = await prisma.order.findUnique({
    where: { orderId: parsedOrderId },
    include: {
      payments: {
        orderBy: { paymentId: 'desc' },
      },
    },
  });

  if (!order) {
    return res.status(200).json({ message: 'Order not found', code: '01' });
  }

  const responseCode = String(vnpParams.vnp_ResponseCode ?? '');
  const gatewayAmount = Number(vnpParams.vnp_Amount) / 100;
  const expectedAmount = Number(order.totalAmount);
  const transactionCode = (vnpParams.vnp_TransactionNo as string) ?? null;

  if (responseCode !== '00') {
    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount || expectedAmount,
      status: 'FAILED',
      transactionCode,
      note: `VNPay return failed with response code ${responseCode || '99'}`,
    });

    return res.status(200).json({
      message: 'Failed',
      code: responseCode || '99',
      orderId: order.orderId,
      paymentStatus: 'FAILED',
    });
  }

  if (Math.round(gatewayAmount) !== Math.round(expectedAmount)) {
    const mismatchNote = `VNPay amount mismatch. Expected ${expectedAmount}, received ${gatewayAmount}.`;

    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount,
      status: 'FAILED',
      transactionCode,
      note: mismatchNote,
    });

    logger.warn('VNPay return amount mismatch', {
      orderId: order.orderId,
      expectedAmount,
      gatewayAmount,
    });

    return res.status(200).json({
      message: 'Failed',
      code: '04',
      orderId: order.orderId,
      paymentStatus: 'FAILED',
    });
  }

  if (hasCompletedPayment(order.payments)) {
    return res.status(200).json({
      message: 'Success',
      code: '00',
      orderId: order.orderId,
      paymentStatus: 'COMPLETED',
    });
  }

  await upsertVnpayPayment({
    orderId: order.orderId,
    payments: order.payments,
    amount: gatewayAmount,
    status: 'COMPLETED',
    transactionCode,
    note: 'Confirmed from VNPay return fallback',
  });

  logger.info('VNPay payment completed from return fallback', {
    orderId: order.orderId,
    transactionCode,
  });

  return res.status(200).json({
    message: 'Success',
    code: '00',
    orderId: order.orderId,
    paymentStatus: 'COMPLETED',
  });
};

export const vnpayIpn = async (req: Request, res: Response) => {
  let vnpParams = req.query;
  const secureHash = vnpParams.vnp_SecureHash;

  const orderId = vnpParams.vnp_TxnRef as string;
  const rspCode = vnpParams.vnp_ResponseCode;

  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  vnpParams = sortObject(vnpParams);
  const secretKey = process.env.VNP_HASH_SECRET;

  if (!secretKey) {
    return res.status(200).json({ RspCode: '99', Message: 'Missing VNPAY secret' });
  }

  const signData = querystring.stringify(vnpParams, { encode: false });
  const signed = crypto.createHmac('sha512', secretKey).update(Buffer.from(signData, 'utf-8')).digest('hex');

  try {
    const parsedOrderId = parseInt(orderId, 10);
    const order = await prisma.order.findUnique({
      where: { orderId: parsedOrderId },
      include: {
        payments: {
          orderBy: { paymentId: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (secureHash === signed) {
      const gatewayAmount = Number(vnpParams.vnp_Amount) / 100;
      const expectedAmount = Number(order.totalAmount);
      const alreadyPaid = hasCompletedPayment(order.payments);

      if (alreadyPaid) {
        return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
      }

      if (rspCode == '00') {
        if (Math.round(gatewayAmount) !== Math.round(expectedAmount)) {
          const mismatchNote = `VNPay amount mismatch. Expected ${expectedAmount}, received ${gatewayAmount}.`;
          await upsertVnpayPayment({
            orderId: order.orderId,
            payments: order.payments,
            amount: gatewayAmount,
            status: 'FAILED',
            transactionCode: (vnpParams.vnp_TransactionNo as string) ?? null,
            note: mismatchNote,
          });

          logger.warn('VNPay payment amount mismatch', {
            orderId: order.orderId,
            expectedAmount,
            gatewayAmount,
          });

          return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
        }

        await upsertVnpayPayment({
          orderId: order.orderId,
          payments: order.payments,
          amount: gatewayAmount,
          status: 'COMPLETED',
          transactionCode: vnpParams.vnp_TransactionNo as string,
          note: null,
        });

        logger.info('VNPay payment successful', { orderId: order.orderId, transactionCode: vnpParams.vnp_TransactionNo });
        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      }

      await upsertVnpayPayment({
        orderId: order.orderId,
        payments: order.payments,
        amount: gatewayAmount || parseFloat(order.totalAmount.toString()),
        status: 'FAILED',
        transactionCode: (vnpParams.vnp_TransactionNo as string) ?? null,
        note: `VNPay IPN failed with response code ${rspCode}`,
      });

      logger.warn('VNPay payment failed reported by IPN', { orderId: order.orderId, rspCode });
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    }

    logger.error('VNPay IPN Checksum failed', { orderId, secureHash, signed });
    return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
  } catch (error: any) {
    logger.error('VNPay IPN Error', { error: error.message, stack: error.stack });
    return res.status(200).json({ RspCode: '99', Message: 'Unknow error' });
  }
};
