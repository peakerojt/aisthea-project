jest.mock('../../../lib/env', () => ({
  env: {
    serverUrl: 'http://localhost:5000',
    clientUrl: 'http://localhost:3000',
  },
}));

import {
  renderOrderPlacedEmail,
  renderOrderStatusEmail,
  renderPasswordResetEmail,
  renderRefundAcceptedAwaitingPayoutEmail,
  renderRefundAcceptedBankInfoRequiredEmail,
  renderRefundCompletedBenefitIssuedEmail,
  renderVerificationEmail,
} from '../email.templates';

describe('auth email templates', () => {
  it('renders verification email subject and OTP content', () => {
    const rendered = renderVerificationEmail({
      userId: 5,
      fullName: 'Test User',
      code: '123456',
    });

    expect(rendered.subject).toBe('Your Verification Code - AISTHEA');
    expect(rendered.html).toContain('123456');
    expect(rendered.text).toContain('123456');
  });

  it('renders password reset email with the current backend handoff route', () => {
    const rendered = renderPasswordResetEmail({
      userId: 8,
      fullName: 'Reset User',
      code: '654321',
    });

    expect(rendered.subject).toBe('Reset Your Password - AISTHEA');
    expect(rendered.html).toContain('http://localhost:5000/api/auth/reset-password?token=654321');
    expect(rendered.text).toContain('/api/auth/reset-password?token=654321');
  });

  it('renders order placed email with order details', () => {
    const rendered = renderOrderPlacedEmail({
      orderId: 321,
      orderNumber: 'ORD-321',
      customerName: 'Order User',
      totalAmount: 465000,
      paymentMethod: 'COD',
      createdAt: '2026-04-07T12:00:00.000Z',
      orderUrl: 'http://localhost:3000/account/orders/321',
    });

    expect(rendered.subject).toContain('ORD-321');
    expect(rendered.html).toContain('http://localhost:3000/account/orders/321');
    expect(rendered.text).toContain('COD');
  });

  it('renders order status email with status label and tracking link', () => {
    const rendered = renderOrderStatusEmail({
      orderId: 321,
      orderNumber: 'ORD-321',
      customerName: 'Order User',
      status: 'Shipping',
      previousStatus: 'Processing',
      note: 'Carrier picked up the parcel.',
      trackingUrl: 'http://localhost:3000/account/orders/321',
    });

    expect(rendered.subject).toContain('On the way');
    expect(rendered.html).toContain('Carrier picked up the parcel.');
    expect(rendered.text).toContain('http://localhost:3000/account/orders/321');
  });

  it('renders refund accepted email that asks for bank info', () => {
    const rendered = renderRefundAcceptedBankInfoRequiredEmail({
      returnRequestId: 77,
      customerName: 'Refund User',
      orderNumber: 'OD-777',
      profileBankLink: 'http://localhost:3000/profile',
    });

    expect(rendered.subject).toBe('Your refund request has been approved');
    expect(rendered.html).toContain('OD-777');
    expect(rendered.text).toContain('http://localhost:3000/profile');
  });

  it('renders refund accepted email for awaiting payout', () => {
    const rendered = renderRefundAcceptedAwaitingPayoutEmail({
      returnRequestId: 78,
      customerName: 'Refund User',
      orderNumber: 'OD-778',
    });

    expect(rendered.subject).toBe('Your refund request is being processed');
    expect(rendered.html).toContain('OD-778');
    expect(rendered.text).toContain('waiting for manual processing');
  });

  it('renders refund completed email with benefit summary', () => {
    const rendered = renderRefundCompletedBenefitIssuedEmail({
      returnRequestId: 79,
      customerName: 'Refund User',
      orderNumber: 'OD-779',
      refundAmount: 150000,
      refundDate: '2026-04-07T10:00:00.000Z',
      voucherSummary: 'A freeship voucher is now available in your account.',
      profileLink: 'http://localhost:3000/profile',
    });

    expect(rendered.subject).toBe('Your refund has been completed successfully');
    expect(rendered.html).toContain('150.000');
    expect(rendered.html).toContain('A freeship voucher is now available in your account.');
    expect(rendered.text).toContain('http://localhost:3000/profile');
  });
});
