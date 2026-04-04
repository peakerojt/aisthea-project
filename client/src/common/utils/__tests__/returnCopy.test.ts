import { describe, expect, it } from 'vitest';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) =>
  fallback.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));

describe('translateLegacyReturnCopy', () => {
  it('translates known legacy return creation notes', () => {
    expect(
      translateLegacyReturnCopy('Customer created return request. Awaiting COD payment confirmation', resolveText),
    ).toBe('Khách hàng đã gửi yêu cầu trả hàng. Đang chờ xác nhận thanh toán COD.');
  });

  it('translates refunded notes with payload text', () => {
    expect(translateLegacyReturnCopy('Refunded: Đã hoàn vào ví khách', resolveText)).toBe(
      'Đã hoàn tiền: Đã hoàn vào ví khách',
    );
  });

  it('translates refund status transitions to vietnamese labels', () => {
    expect(
      translateLegacyReturnCopy('Refund status updated: PENDING -> PROCESSING', resolveText),
    ).toBe('Cập nhật trạng thái hoàn tiền: Chờ hoàn tiền -> Đang hoàn tiền');
  });

  it('returns untouched user-authored notes', () => {
    expect(
      translateLegacyReturnCopy('Cần đối soát lại giao dịch hoàn tiền.', resolveText),
    ).toBe('Cần đối soát lại giao dịch hoàn tiền.');
  });

  it('translates known finance reconciliation notes from legacy payloads', () => {
    expect(
      translateLegacyReturnCopy('Finance is reconciling the gateway response', resolveText),
    ).toBe('Bộ phận tài chính đang đối soát phản hồi từ cổng thanh toán.');
  });

  it('translates known warehouse progress notes instead of leaking english copy', () => {
    expect(
      translateLegacyReturnCopy(
        'Warehouse confirmed return package received and inspection started',
        resolveText,
      ),
    ).toBe('Kho đã xác nhận nhận kiện hàng hoàn và bắt đầu kiểm tra.');
  });

  it('translates legacy prepaid-cancellation notes and refund completion logs', () => {
    expect(
      translateLegacyReturnCopy(
        'Cancelled before fulfillment after successful VNPay payment',
        resolveText,
      ),
    ).toBe('Đơn đã được hủy trước khi xử lý đơn sau khi thanh toán VNPay thành công.');

    expect(
      translateLegacyReturnCopy(
        'Refund completed via BANK_TRANSFER - txn VCB',
        resolveText,
      ),
    ).toBe('Đã hoàn tiền qua chuyển khoản ngân hàng - mã giao dịch VCB');
  });

  it('translates legacy cancellation-reason notes with payload text', () => {
    expect(
      translateLegacyReturnCopy(
        'Customer selected cancellation reason: Đổi ý',
        resolveText,
      ),
    ).toBe('Khách hàng chọn lý do hủy đơn: Đổi ý');
  });
});
