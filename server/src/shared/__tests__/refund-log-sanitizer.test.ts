import {
  maskEmailForRefundLogs,
  maskIdentifierForRefundLogs,
  sanitizeRefundLogContext,
  serializeRefundErrorForLogs,
} from '../refund-log-sanitizer';

describe('refund-log-sanitizer', () => {
  it('masks refund identifiers while preserving a traceable preview', () => {
    expect(maskIdentifierForRefundLogs('refund-key-1234')).toBe('refu***234');
    expect(maskIdentifierForRefundLogs('VCB-181')).toBe('VCB***1');
  });

  it('masks customer email addresses in refund log contexts', () => {
    expect(maskEmailForRefundLogs('customer@example.com')).toBe('c***@example.com');
    expect(
      sanitizeRefundLogContext({
        email: 'customer@example.com',
      }),
    ).toEqual({
      email: 'c***@example.com',
    });
  });

  it('sanitizes sensitive provider and note payload fields', () => {
    expect(
      sanitizeRefundLogContext({
        secureHash: 'abcdef1234567890',
        signed: 'signed-hash-0987654321',
        transactionCode: 'TXN-RETURN-42',
        proofImageUrls: ['https://cdn.example.com/refund-proof-1.png'],
        note: 'Transferred via VCB-181. Receipt at https://cdn.example.com/file.png',
      }),
    ).toEqual({
      secureHash: 'abcd***890',
      signed: 'sign***321',
      transactionCode: 'TXN-***-42',
      proofImageUrls: { count: 1 },
      note: 'Transferred via VCB***1. Receipt at [URL]',
    });
  });

  it('serializes refund-related errors without leaking full raw text', () => {
    const error = new Error(
      'Gateway failure for transaction ABCD-12345678 at https://provider.example.com/error',
    );

    expect(serializeRefundErrorForLogs(error)).toEqual(
      expect.objectContaining({
        name: 'Error',
        message: 'Gateway failure for transaction ABCD***678 at [URL]',
      }),
    );
  });
});
