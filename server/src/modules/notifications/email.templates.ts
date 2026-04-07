import { env } from '../../lib/env';
import {
  AUTH_EMAIL_EVENT_TYPE,
  ORDER_EMAIL_EVENT_TYPE,
  REFUND_EMAIL_EVENT_TYPE,
  type OrderPlacedEmailPayload,
  type OrderStatusEmailPayload,
  type PasswordResetEmailPayload,
  type RefundAcceptedAwaitingPayoutEmailPayload,
  type RefundAcceptedBankInfoRequiredEmailPayload,
  type RefundCompletedBenefitIssuedEmailPayload,
  type RenderedEmail,
  type VerificationEmailPayload,
} from './email.types';

const renderShell = (content: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #111111; border-radius: 8px; border: 1px solid #222;">
            <tr>
              <td style="padding: 40px 40px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -1px; text-transform: uppercase;">AISTHEA</h1>
              </td>
            </tr>
            ${content}
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const renderOrderStatusLabel = (status: string) => {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'pending') return 'Pending confirmation';
  if (normalized === 'processing') return 'Confirmed and preparing';
  if (normalized === 'shipping') return 'On the way';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'cancelled') return 'Cancelled';

  return status;
};

export const renderVerificationEmail = (payload: VerificationEmailPayload): RenderedEmail => ({
  subject: 'Your Verification Code - AISTHEA',
  html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.fullName}</strong>,</p>
        <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
          Thank you for joining AISTHEA. Please use the verification code below to complete your registration.
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 20px 0 30px;">
              <div style="background-color: #1a1a1a; border: 2px solid #dc2626; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                <span style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${payload.code}</span>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          Enter this code in the verification screen
        </p>
        <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
          This code will expire in 24 hours.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          If you didn't create an account with AISTHEA, you can safely ignore this email.
        </p>
      </td>
    </tr>
  `),
  text: `
    Hello ${payload.fullName},

    Thank you for joining AISTHEA. Your verification code is:

    ${payload.code}

    Enter this code in the verification screen to complete your registration.

    This code will expire in 24 hours.

    If you didn't create an account with AISTHEA, you can safely ignore this email.
  `,
});

export const renderPasswordResetEmail = (payload: PasswordResetEmailPayload): RenderedEmail => {
  const resetLink = `${env.serverUrl}/api/auth/reset-password?token=${encodeURIComponent(payload.code)}`;

  return {
    subject: 'Reset Your Password - AISTHEA',
    html: renderShell(`
      <tr>
        <td style="padding: 20px 40px;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.fullName}</strong>,</p>
          <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
            We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td align="center" style="padding: 20px 0 24px;">
                <div style="background-color: #1a1a1a; border: 2px solid #dc2626; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                  <span style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${payload.code}</span>
                </div>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
            Enter this 6-digit code on the reset password screen, or use the fallback link below if you already opened the reset page from email.
          </p>
          <p style="margin: 0 0 10px; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
            ${resetLink}
          </p>
          <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
            This code and link will expire in 1 hour.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px 40px; border-top: 1px solid #222;">
          <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
            &copy; ${new Date().getFullYear()} AISTHEA. All rights reserved.
          </p>
        </td>
      </tr>
    `),
    text: `
      Hello ${payload.fullName},

      We received a request to reset your password.

      Your 6-digit password reset code is:

      ${payload.code}

      You can also open the following fallback reset link:
      ${resetLink}

      If you didn't request this, please ignore this email.

      This code and link will expire in 1 hour.
    `,
  };
};

export const renderOrderPlacedEmail = (payload: OrderPlacedEmailPayload): RenderedEmail => ({
  subject: `Order Received: ${payload.orderNumber} - AISTHEA`,
  html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.customerName}</strong>,</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #888888; line-height: 1.6;">
          Thank you for your order. We have received <strong>${payload.orderNumber}</strong> and will email you again when its status changes.
        </p>
        <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Order total</p>
          <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${formatCurrency(payload.totalAmount)}</p>
          <p style="margin: 0; font-size: 13px; color: #888888;">Payment method: ${payload.paymentMethod ?? 'N/A'}</p>
        </div>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          View your order details:
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.orderUrl}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          If this order was not placed by you, please contact AISTHEA support.
        </p>
      </td>
    </tr>
  `),
  text: `
    Hello ${payload.customerName},

    We have received your order ${payload.orderNumber}.

    Order total: ${formatCurrency(payload.totalAmount)}
    Payment method: ${payload.paymentMethod ?? 'N/A'}

    View your order details:
    ${payload.orderUrl}
  `,
});

export const renderOrderStatusEmail = (payload: OrderStatusEmailPayload): RenderedEmail => ({
  subject: `Order Update: ${payload.orderNumber} is ${renderOrderStatusLabel(payload.status)} - AISTHEA`,
  html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.customerName}</strong>,</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #888888; line-height: 1.6;">
          Your order <strong>${payload.orderNumber}</strong> has been updated.
        </p>
        <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Current status</p>
          <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${renderOrderStatusLabel(payload.status)}</p>
          ${payload.previousStatus ? `<p style="margin: 0 0 8px; font-size: 13px; color: #888888;">Previous status: ${renderOrderStatusLabel(payload.previousStatus)}</p>` : ''}
          ${payload.note ? `<p style="margin: 0; font-size: 13px; color: #888888;">Note: ${payload.note}</p>` : ''}
        </div>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          Follow your order here:
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.trackingUrl}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          Thank you for shopping with AISTHEA.
        </p>
      </td>
    </tr>
  `),
  text: `
    Hello ${payload.customerName},

    Your order ${payload.orderNumber} has been updated.

    Current status: ${renderOrderStatusLabel(payload.status)}
    ${payload.previousStatus ? `Previous status: ${renderOrderStatusLabel(payload.previousStatus)}` : ''}
    ${payload.note ? `Note: ${payload.note}` : ''}

    Follow your order here:
    ${payload.trackingUrl}
  `,
});

export const renderRefundAcceptedBankInfoRequiredEmail = (
  payload: RefundAcceptedBankInfoRequiredEmailPayload,
): RenderedEmail => ({
  subject: 'Your refund request has been approved',
  html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.customerName}</strong>,</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
          Your refund request for order <strong>${payload.orderNumber}</strong> has been approved.
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #888888; line-height: 1.6;">
          Before our finance team can complete the payout, please update your bank information in your account profile.
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          Update your bank information here:
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.profileBankLink}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          You can add a bank account manually or upload a QR image as a reference.
        </p>
      </td>
    </tr>
  `),
  text: `
    Hello ${payload.customerName},

    Your refund request for order ${payload.orderNumber} has been approved.

    Before our finance team can complete the payout, please update your bank information here:
    ${payload.profileBankLink}

    You can add a bank account manually or upload a QR image as a reference.
  `,
});

export const renderRefundAcceptedAwaitingPayoutEmail = (
  payload: RefundAcceptedAwaitingPayoutEmailPayload,
): RenderedEmail => ({
  subject: 'Your refund request is being processed',
  html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.customerName}</strong>,</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
          Your refund request for order <strong>${payload.orderNumber}</strong> has been approved.
        </p>
        <p style="margin: 0; font-size: 14px; color: #888888; line-height: 1.6;">
          We already have your bank information on file, and your payout is now waiting for manual processing by our finance team.
        </p>
      </td>
    </tr>
  `),
  text: `
    Hello ${payload.customerName},

    Your refund request for order ${payload.orderNumber} has been approved.

    We already have your bank information on file, and your payout is now waiting for manual processing by our finance team.
  `,
});

export const renderRefundCompletedBenefitIssuedEmail = (
  payload: RefundCompletedBenefitIssuedEmailPayload,
): RenderedEmail => {
  const refundDateLabel = new Date(payload.refundDate).toLocaleDateString('vi-VN');
  const voucherSummary =
    payload.voucherSummary ?? 'An available voucher has been added to your account.';

  return {
    subject: 'Your refund has been completed successfully',
    html: renderShell(`
      <tr>
        <td style="padding: 20px 40px;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${payload.customerName}</strong>,</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
            Your refund for order <strong>${payload.orderNumber}</strong> has been completed successfully.
          </p>
          <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Refund amount</p>
            <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${formatCurrency(payload.refundAmount)}</p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #888888;">Refund date: ${refundDateLabel}</p>
            <p style="margin: 0; font-size: 13px; color: #888888;">${voucherSummary}</p>
          </div>
          <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
            Review your voucher information here:
          </p>
          <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
            ${payload.profileLink}
          </p>
        </td>
      </tr>
    `),
    text: `
      Hello ${payload.customerName},

      Your refund for order ${payload.orderNumber} has been completed successfully.

      Refund amount: ${formatCurrency(payload.refundAmount)}
      Refund date: ${refundDateLabel}
      ${voucherSummary}

      Review your voucher information here:
      ${payload.profileLink}
    `,
  };
};

export const renderEmail = (
  eventType:
    | typeof AUTH_EMAIL_EVENT_TYPE[keyof typeof AUTH_EMAIL_EVENT_TYPE]
    | typeof ORDER_EMAIL_EVENT_TYPE[keyof typeof ORDER_EMAIL_EVENT_TYPE]
    | typeof REFUND_EMAIL_EVENT_TYPE[keyof typeof REFUND_EMAIL_EVENT_TYPE],
  payload:
    | VerificationEmailPayload
    | PasswordResetEmailPayload
    | OrderPlacedEmailPayload
    | OrderStatusEmailPayload
    | RefundAcceptedBankInfoRequiredEmailPayload
    | RefundAcceptedAwaitingPayoutEmailPayload
    | RefundCompletedBenefitIssuedEmailPayload,
): RenderedEmail => {
  if (eventType === AUTH_EMAIL_EVENT_TYPE.VERIFICATION) {
    return renderVerificationEmail(payload as VerificationEmailPayload);
  }

  if (eventType === AUTH_EMAIL_EVENT_TYPE.PASSWORD_RESET) {
    return renderPasswordResetEmail(payload as PasswordResetEmailPayload);
  }

  if (eventType === ORDER_EMAIL_EVENT_TYPE.ORDER_PLACED) {
    return renderOrderPlacedEmail(payload as OrderPlacedEmailPayload);
  }

  if (eventType === ORDER_EMAIL_EVENT_TYPE.ORDER_STATUS_UPDATED) {
    return renderOrderStatusEmail(payload as OrderStatusEmailPayload);
  }

  if (eventType === REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_BANK_INFO_REQUIRED) {
    return renderRefundAcceptedBankInfoRequiredEmail(
      payload as RefundAcceptedBankInfoRequiredEmailPayload,
    );
  }

  if (eventType === REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_AWAITING_PAYOUT) {
    return renderRefundAcceptedAwaitingPayoutEmail(
      payload as RefundAcceptedAwaitingPayoutEmailPayload,
    );
  }

  return renderRefundCompletedBenefitIssuedEmail(
    payload as RefundCompletedBenefitIssuedEmailPayload,
  );
};
