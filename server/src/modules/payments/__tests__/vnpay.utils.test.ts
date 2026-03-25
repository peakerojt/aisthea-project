import crypto from 'crypto';
import querystring from 'qs';

import {
  buildSignedVnpUrl,
  createVnpSecureHash,
  extractSignedVnpQuery,
  sortVnpParams,
} from '../vnpay.utils';

describe('vnpay.utils', () => {
  it('sorts and encodes VNPay params using plus for spaces', () => {
    const sorted = sortVnpParams({
      vnp_OrderInfo: 'Thanh toan don hang 19',
      vnp_TxnRef: '19',
      vnp_Amount: 32600000,
    });

    expect(Object.keys(sorted)).toEqual(['vnp_Amount', 'vnp_OrderInfo', 'vnp_TxnRef']);
    expect(sorted.vnp_OrderInfo).toBe('Thanh+toan+don+hang+19');
  });

  it('builds signed VNPay URL and extracts signed query safely', () => {
    const secretKey = 'super-secret-key';
    const params = {
      vnp_TmnCode: 'TESTTMN',
      vnp_TxnRef: '19',
      vnp_Amount: '32600000',
      vnp_OrderInfo: 'Thanh toan don hang 19',
    };

    const expectedHash = crypto
      .createHmac('sha512', secretKey)
      .update(
        Buffer.from(
          querystring.stringify(sortVnpParams(params), { encode: false }),
          'utf-8',
        ),
      )
      .digest('hex');

    expect(createVnpSecureHash(params, secretKey)).toBe(expectedHash);

    const url = buildSignedVnpUrl(
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      params,
      secretKey,
    );
    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.get('vnp_SecureHash')).toBe(expectedHash);

    const extracted = extractSignedVnpQuery({
      vnp_TmnCode: parsedUrl.searchParams.get('vnp_TmnCode'),
      vnp_TxnRef: parsedUrl.searchParams.get('vnp_TxnRef'),
      vnp_Amount: parsedUrl.searchParams.get('vnp_Amount'),
      vnp_OrderInfo: parsedUrl.searchParams.get('vnp_OrderInfo'),
      vnp_SecureHash: parsedUrl.searchParams.get('vnp_SecureHash'),
      vnp_SecureHashType: 'SHA512',
      ignored: ['value'],
    });

    expect(extracted.secureHash).toBe(expectedHash);
    expect(extracted.params).toEqual({
      ignored: 'value',
      vnp_TmnCode: 'TESTTMN',
      vnp_TxnRef: '19',
      vnp_Amount: '32600000',
      vnp_OrderInfo: 'Thanh toan don hang 19',
    });
  });
});
