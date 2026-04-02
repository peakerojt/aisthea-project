import moment from 'moment';
import { isSettledPaymentStatus } from '../../config/paymentStatus.config';
import { logger } from '../../lib/logger';
import { prisma } from '../../utils/prisma';
import { buildSignedVnpUrl, createVnpSecureHash, extractSignedVnpQuery, type VnpParamRecord } from './vnpay.utils';

type PaymentSnapshot = {
  paymentId: number;
  paymentMethod: string | null;
  status?: string | null;
  transactionCode?: string | null;
};

type ServiceResult<T extends Record<string, unknown>> = {
  status: number;
  body: T;
};

type VnpayReturnBody = {
  message: string;
  code: string;
  orderId?: number;
  paymentStatus?: string;
};

type VnpayIpnBody = {
  RspCode: string;
  Message: string;
};

type VnpayQueryBody = {
  message: string;
  code: string;
  orderId?: number;
  paymentStatus?: string;
  queryStatus?: string;
};

const hasCompletedPayment = (payments: PaymentSnapshot[]) =>
  payments.some((payment) => isSettledPaymentStatus(payment.status));

const FAILED_VNPAY_QUERY_STATUSES = new Set(['01', '02', '04', '13', '24']);
const CANCELLED_VNPAY_RESPONSE_CODES = new Set(['24']);

const parsePositiveInt = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const loadOrder = (orderId: number) =>
  prisma.order.findUnique({
    where: { orderId },
    include: {
      payments: {
        orderBy: { paymentId: 'desc' },
      },
    },
  });

const buildVnpayQueryNeedsReviewNote = ({
  responseCode,
  transactionStatus,
  reason,
}: {
  responseCode: string;
  transactionStatus: string;
  reason?: string;
}) => {
  const detail = reason ? `${reason}. ` : '';
  return `${detail}VNPay query fallback inconclusive. Response code ${responseCode || '99'}, transaction status ${transactionStatus || 'unknown'}.`;
};

const upsertVnpayPayment = async ({
  orderId,
  payments,
  amount,
  status,
  transactionCode,
  note,
  resetTransactionCode = false,
}: {
  orderId: number;
  payments: PaymentSnapshot[];
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionCode?: string | null;
  note?: string | null;
  resetTransactionCode?: boolean;
}) => {
  const latestPayment = payments[0] ?? null;

  if (latestPayment && (latestPayment.paymentMethod ?? '').toUpperCase() === 'VNPAY') {
    await prisma.payment.update({
      where: { paymentId: latestPayment.paymentId },
      data: {
        amount,
        status,
        transactionCode: resetTransactionCode
          ? transactionCode ?? null
          : transactionCode ?? latestPayment.transactionCode ?? null,
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

export const createVnpayPaymentUrl = async ({
  userId,
  orderId,
  bankCode,
  orderDescription,
  orderType,
  language,
  ipAddr,
}: {
  userId?: number;
  orderId: unknown;
  bankCode?: string;
  orderDescription?: string;
  orderType?: string;
  language?: string;
  ipAddr?: string;
}): Promise<ServiceResult<Record<string, unknown>>> => {
  if (!userId) {
    return { status: 401, body: { errorCode: 'UNAUTHORIZED' } };
  }

  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET;
  const baseUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  if (!tmnCode || !secretKey || !baseUrl || !returnUrl) {
    return {
      status: 500,
      body: {
        errorCode: 'CREATE_PAYMENT_URL_FAILED',
        messageKey: 'payments:errors.configMissing',
      },
    };
  }

  const parsedOrderId = parsePositiveInt(orderId);
  if (!parsedOrderId) {
    return { status: 400, body: { errorCode: orderId ? 'INVALID_ORDER_ID' : 'MISSING_ORDER_ID' } };
  }

  const order = await loadOrder(parsedOrderId);
  if (!order) {
    return { status: 404, body: { errorCode: 'ORDER_NOT_FOUND' } };
  }

  if (order.userId !== userId) {
    return { status: 403, body: { errorCode: 'FORBIDDEN' } };
  }

  if ((order.paymentMethod ?? '').toUpperCase() !== 'VNPAY') {
    return { status: 400, body: { errorCode: 'ORDER_NOT_VNPAY' } };
  }

  if (hasCompletedPayment(order.payments)) {
    return { status: 409, body: { errorCode: 'ORDER_ALREADY_PAID' } };
  }

  await upsertVnpayPayment({
    orderId: order.orderId,
    payments: order.payments,
    amount: Number(order.totalAmount),
    status: 'PENDING',
    transactionCode: null,
    note: 'Awaiting VNPay reconciliation',
    resetTransactionCode: true,
  });

  process.env.TZ = 'Asia/Ho_Chi_Minh';
  const createDate = moment(new Date()).format('YYYYMMDDHHmmss');

  const params: VnpParamRecord = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: language || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: parsedOrderId,
    vnp_OrderInfo: orderDescription || `Thanh toan don hang ${parsedOrderId}`,
    vnp_OrderType: orderType || 'other',
    vnp_Amount: Math.round(Number(order.totalAmount) * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '',
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    params.vnp_BankCode = bankCode;
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        vnpUrl: buildSignedVnpUrl(baseUrl, params, secretKey),
      },
    },
  };
};

export const handleVnpayReturn = async (
  query: Record<string, unknown>,
): Promise<ServiceResult<VnpayReturnBody>> => {
  const { params, secureHash } = extractSignedVnpQuery(query);
  const secretKey = process.env.VNP_HASH_SECRET;

  if (!secretKey) {
    return { status: 500, body: { message: 'Missing VNPAY configuration', code: '97' } };
  }

  const signed = createVnpSecureHash(params, secretKey);
  if (secureHash !== signed) {
    return { status: 200, body: { message: 'Fail checksum', code: '97' } };
  }

  const parsedOrderId = parsePositiveInt(params.vnp_TxnRef);
  if (!parsedOrderId) {
    return { status: 200, body: { message: 'Invalid order', code: '01' } };
  }

  const order = await loadOrder(parsedOrderId);
  if (!order) {
    return { status: 200, body: { message: 'Order not found', code: '01' } };
  }

  const responseCode = String(params.vnp_ResponseCode ?? '');
  const gatewayAmount = Number(params.vnp_Amount ?? 0) / 100;
  const expectedAmount = Number(order.totalAmount);
  const transactionCode = typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo : null;

  if (responseCode !== '00') {
    const isCancelledResponse = CANCELLED_VNPAY_RESPONSE_CODES.has(responseCode);

    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount || expectedAmount,
      status: 'FAILED',
      transactionCode,
      note: `VNPay return failed with response code ${responseCode || '99'}`,
    });

    return {
      status: 200,
      body: {
        message: isCancelledResponse ? 'Cancelled' : 'Failed',
        code: responseCode || '99',
        orderId: order.orderId,
        paymentStatus: isCancelledResponse ? 'CANCELLED' : 'FAILED',
      },
    };
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

    return {
      status: 200,
      body: {
        message: 'Failed',
        code: '04',
        orderId: order.orderId,
        paymentStatus: 'FAILED',
      },
    };
  }

  if (hasCompletedPayment(order.payments)) {
    return {
      status: 200,
      body: {
        message: 'Success',
        code: '00',
        orderId: order.orderId,
        paymentStatus: 'PAID',
      },
    };
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

  return {
    status: 200,
    body: {
      message: 'Success',
      code: '00',
      orderId: order.orderId,
      paymentStatus: 'PAID',
    },
  };
};

export const handleVnpayIpn = async (
  query: Record<string, unknown>,
): Promise<ServiceResult<VnpayIpnBody>> => {
  const { params, secureHash } = extractSignedVnpQuery(query);
  const secretKey = process.env.VNP_HASH_SECRET;

  if (!secretKey) {
    return { status: 200, body: { RspCode: '99', Message: 'Missing VNPAY secret' } };
  }

  const orderId = typeof params.vnp_TxnRef === 'string' ? params.vnp_TxnRef : '';
  const rspCode = typeof params.vnp_ResponseCode === 'string' ? params.vnp_ResponseCode : '';
  const signed = createVnpSecureHash(params, secretKey);

  try {
    const parsedOrderId = parsePositiveInt(orderId);
    if (!parsedOrderId) {
      return { status: 200, body: { RspCode: '01', Message: 'Order not found' } };
    }

    const order = await loadOrder(parsedOrderId);
    if (!order) {
      return { status: 200, body: { RspCode: '01', Message: 'Order not found' } };
    }

    if (secureHash !== signed) {
      logger.error('VNPay IPN Checksum failed', { orderId, secureHash, signed });
      return { status: 200, body: { RspCode: '97', Message: 'Checksum failed' } };
    }

    const gatewayAmount = Number(params.vnp_Amount ?? 0) / 100;
    const expectedAmount = Number(order.totalAmount);

    if (hasCompletedPayment(order.payments)) {
      return {
        status: 200,
        body: { RspCode: '02', Message: 'This order has been updated to the payment status' },
      };
    }

    if (rspCode === '00') {
      if (Math.round(gatewayAmount) !== Math.round(expectedAmount)) {
        const mismatchNote = `VNPay amount mismatch. Expected ${expectedAmount}, received ${gatewayAmount}.`;

        await upsertVnpayPayment({
          orderId: order.orderId,
          payments: order.payments,
          amount: gatewayAmount,
          status: 'FAILED',
          transactionCode: typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo : null,
          note: mismatchNote,
        });

        logger.warn('VNPay payment amount mismatch', {
          orderId: order.orderId,
          expectedAmount,
          gatewayAmount,
        });

        return { status: 200, body: { RspCode: '04', Message: 'Invalid amount' } };
      }

      await upsertVnpayPayment({
        orderId: order.orderId,
        payments: order.payments,
        amount: gatewayAmount,
        status: 'COMPLETED',
        transactionCode: typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo : null,
        note: null,
      });

      logger.info('VNPay payment successful', {
        orderId: order.orderId,
        transactionCode: params.vnp_TransactionNo,
      });

      return { status: 200, body: { RspCode: '00', Message: 'Confirm Success' } };
    }

    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount || parseFloat(order.totalAmount.toString()),
      status: 'FAILED',
      transactionCode: typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo : null,
      note: `VNPay IPN failed with response code ${rspCode}`,
    });

    logger.warn('VNPay payment failed reported by IPN', { orderId: order.orderId, rspCode });
    return { status: 200, body: { RspCode: '00', Message: 'Confirm Success' } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('VNPay IPN Error', { error: message, stack });
    return { status: 200, body: { RspCode: '99', Message: 'Unknow error' } };
  }
};

export const handleVnpayQueryResult = async (
  query: Record<string, unknown>,
): Promise<ServiceResult<VnpayQueryBody>> => {
  const { params, secureHash } = extractSignedVnpQuery(query);
  const secretKey = process.env.VNP_HASH_SECRET;

  if (!secretKey) {
    return { status: 500, body: { message: 'Missing VNPAY configuration', code: '97' } };
  }

  const signed = createVnpSecureHash(params, secretKey);
  if (secureHash !== signed) {
    return { status: 200, body: { message: 'Fail checksum', code: '97' } };
  }

  const parsedOrderId = parsePositiveInt(params.vnp_TxnRef);
  if (!parsedOrderId) {
    return { status: 200, body: { message: 'Invalid order', code: '01' } };
  }

  const order = await loadOrder(parsedOrderId);
  if (!order) {
    return { status: 200, body: { message: 'Order not found', code: '01' } };
  }

  const responseCode = String(params.vnp_ResponseCode ?? '');
  const transactionStatus = String(params.vnp_TransactionStatus ?? '');
  const gatewayAmount = Number(params.vnp_Amount ?? 0) / 100;
  const expectedAmount = Number(order.totalAmount);
  const transactionCode = typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo : null;

  if (hasCompletedPayment(order.payments)) {
    return {
      status: 200,
      body: {
        message: 'Success',
        code: '00',
        orderId: order.orderId,
        paymentStatus: 'PAID',
        queryStatus: transactionStatus || undefined,
      },
    };
  }

  if (responseCode !== '00') {
    const note = buildVnpayQueryNeedsReviewNote({
      responseCode,
      transactionStatus,
    });

    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount || expectedAmount,
      status: 'PENDING',
      transactionCode,
      note,
    });

    logger.warn('VNPay query fallback needs review due to response code', {
      orderId: order.orderId,
      responseCode,
      transactionStatus,
    });

    return {
      status: 200,
      body: {
        message: 'Needs review',
        code: responseCode || '99',
        orderId: order.orderId,
        paymentStatus: 'NEEDS_REVIEW',
        queryStatus: transactionStatus || undefined,
      },
    };
  }

  if (transactionStatus === '00') {
    if (Math.round(gatewayAmount) !== Math.round(expectedAmount)) {
      const note = buildVnpayQueryNeedsReviewNote({
        responseCode,
        transactionStatus,
        reason: `VNPay query amount mismatch. Expected ${expectedAmount}, received ${gatewayAmount}`,
      });

      await upsertVnpayPayment({
        orderId: order.orderId,
        payments: order.payments,
        amount: gatewayAmount || expectedAmount,
        status: 'PENDING',
        transactionCode,
        note,
      });

      logger.warn('VNPay query fallback amount mismatch', {
        orderId: order.orderId,
        expectedAmount,
        gatewayAmount,
      });

      return {
        status: 200,
        body: {
          message: 'Needs review',
          code: '04',
          orderId: order.orderId,
          paymentStatus: 'NEEDS_REVIEW',
          queryStatus: transactionStatus,
        },
      };
    }

    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount,
      status: 'COMPLETED',
      transactionCode,
      note: 'Confirmed from VNPay query fallback',
    });

    logger.info('VNPay payment completed from query fallback', {
      orderId: order.orderId,
      transactionCode,
    });

    return {
      status: 200,
      body: {
        message: 'Success',
        code: '00',
        orderId: order.orderId,
        paymentStatus: 'PAID',
        queryStatus: transactionStatus,
      },
    };
  }

  if (FAILED_VNPAY_QUERY_STATUSES.has(transactionStatus)) {
    await upsertVnpayPayment({
      orderId: order.orderId,
      payments: order.payments,
      amount: gatewayAmount || expectedAmount,
      status: 'FAILED',
      transactionCode,
      note: `VNPay query fallback reported terminal status ${transactionStatus}.`,
    });

    logger.warn('VNPay query fallback reported cancelled payment', {
      orderId: order.orderId,
      transactionStatus,
    });

    return {
      status: 200,
      body: {
        message: 'Cancelled',
        code: '00',
        orderId: order.orderId,
        paymentStatus: 'CANCELLED',
        queryStatus: transactionStatus,
      },
    };
  }

  const note = buildVnpayQueryNeedsReviewNote({
    responseCode,
    transactionStatus,
  });

  await upsertVnpayPayment({
    orderId: order.orderId,
    payments: order.payments,
    amount: gatewayAmount || expectedAmount,
    status: 'PENDING',
    transactionCode,
    note,
  });

  logger.warn('VNPay query fallback returned unknown transaction status', {
    orderId: order.orderId,
    transactionStatus,
  });

  return {
    status: 200,
    body: {
      message: 'Needs review',
      code: '00',
      orderId: order.orderId,
      paymentStatus: 'NEEDS_REVIEW',
      queryStatus: transactionStatus || undefined,
    },
  };
};
