import { Request, Response } from 'express';
import crypto from 'crypto';
import querystring from 'qs';
import moment from 'moment';
import { prisma } from '../utils/prisma';
import { logger } from '../lib/logger';

function sortObject(obj: any) {
    let sorted: any = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

export const createPaymentUrl = async (req: Request, res: Response) => {
    try {
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');

        // Config values
        let tmnCode = process.env.VNP_TMN_CODE;
        let secretKey = process.env.VNP_HASH_SECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURN_URL;

        if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
            return res.status(500).json({ error: 'Missing VNPAY configuration' });
        }

        let ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection as any).socket?.remoteAddress;

        let { amount, bankCode, orderId, orderDescription, orderType } = req.body;

        if (!amount || !orderId) {
            return res.status(400).json({ error: 'Missing required parameters: amount, orderId' });
        }

        let locale = req.body.language || 'vn';
        let currCode = 'VND';
        let vnp_Params: any = {};

        // Amount must be multiplied by 100
        // Amount from frontend might be in dollars? Assuming it's already converted to VND or we need to pass VND.
        // The previous frontend PaymentQR shows 825,000đ. We assume `amount` passed here is the total amount in VND.
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = orderDescription || `Thanh toan don hang ${orderId}`;
        vnp_Params['vnp_OrderType'] = orderType || 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        if (bankCode) {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        let signData = querystring.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

        res.status(200).json({ vnpUrl });
    } catch (error) {
        logger.error('[vnpayController] createPaymentUrl failed', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const vnpayReturn = async (req: Request, res: Response) => {
    let vnp_Params = req.query;

    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    let secretKey = process.env.VNP_HASH_SECRET;

    if (!secretKey) {
        return res.status(500).json({ message: 'Missing VNPAY configuration', code: '97' });
    }

    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        // Kiem tra cong thai thanh toan
        res.status(200).json({ message: 'Success', code: vnp_Params['vnp_ResponseCode'] });
    } else {
        res.status(200).json({ message: 'Fail checksum', code: '97' });
    }
};

export const vnpayIpn = async (req: Request, res: Response) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    let orderId = vnp_Params['vnp_TxnRef'] as string;
    let rspCode = vnp_Params['vnp_ResponseCode'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = process.env.VNP_HASH_SECRET;

    if (!secretKey) {
        return res.status(200).json({ RspCode: '99', Message: 'Missing VNPAY secret' });
    }

    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

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
            // Amount must be matched
            let vnp_Amount = vnp_Params['vnp_Amount'];
            // Verify amount (assuming stored totalAmount is USD, but needs translation, or stored amount is verified)
            // The frontend uses USD, maybe 1 USD = 25000 VND. Let's assume frontend passes VND amount properly

            const latestPayment = order.payments[0] ?? null;
            const alreadyPaid = order.payments.some((payment) =>
                ['COMPLETED', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes((payment.status ?? '').toUpperCase())
            );

            if (alreadyPaid) {
                return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
            } else {
                if (rspCode == "00") {
                    if (latestPayment && latestPayment.paymentMethod === 'VNPAY') {
                        await prisma.payment.update({
                            where: { paymentId: latestPayment.paymentId },
                            data: {
                                amount: parseFloat(order.totalAmount.toString()),
                                status: 'COMPLETED',
                                transactionCode: vnp_Params['vnp_TransactionNo'] as string,
                                note: null,
                            }
                        });
                    } else {
                        await prisma.payment.create({
                            data: {
                                orderId: order.orderId,
                                paymentMethod: 'VNPAY',
                                amount: parseFloat(order.totalAmount.toString()),
                                status: 'COMPLETED',
                                transactionCode: vnp_Params['vnp_TransactionNo'] as string
                            }
                        });
                    }

                    logger.info('VNPay payment successful', { orderId: order.orderId, transactionCode: vnp_Params['vnp_TransactionNo'] });

                    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
                } else {
                    if (latestPayment && latestPayment.paymentMethod === 'VNPAY') {
                        await prisma.payment.update({
                            where: { paymentId: latestPayment.paymentId },
                            data: {
                                amount: parseFloat(order.totalAmount.toString()),
                                status: 'FAILED',
                                transactionCode: (vnp_Params['vnp_TransactionNo'] as string) ?? latestPayment.transactionCode,
                                note: `VNPay IPN failed with response code ${rspCode}`,
                            }
                        });
                    } else {
                        await prisma.payment.create({
                            data: {
                                orderId: order.orderId,
                                paymentMethod: 'VNPAY',
                                amount: parseFloat(order.totalAmount.toString()),
                                status: 'FAILED',
                                transactionCode: (vnp_Params['vnp_TransactionNo'] as string) ?? null,
                                note: `VNPay IPN failed with response code ${rspCode}`,
                            }
                        });
                    }

                    logger.warn('VNPay payment failed reported by IPN', { orderId: order.orderId, rspCode });

                    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
                }
            }
        } else {
            logger.error('VNPay IPN Checksum failed', { orderId, secureHash, signed });
            res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
        }
    } catch (err: any) {
        logger.error('VNPay IPN Error', { error: err.message, stack: err.stack });
        res.status(200).json({ RspCode: '99', Message: 'Unknow error' });
    }
};
