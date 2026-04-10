import { env } from '../../lib/env';
import { normalizeLocale, type AppLocale } from '../../i18n';
import enEmails from '../../i18n/locales/en/emails.json';
import viEmails from '../../i18n/locales/vi/emails.json';
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

const EMAIL_MESSAGES = {
  en: enEmails,
  vi: viEmails,
} as const;

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

const resolveLocale = (locale?: string | null): AppLocale => (locale ? normalizeLocale(locale) : 'vi');

const interpolate = (template: string, params?: Record<string, unknown>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(params?.[key] ?? ''));

const emailT = (locale: AppLocale, key: string, params?: Record<string, unknown>) => {
  const segments = key.split('.');
  let current: any = EMAIL_MESSAGES[locale];

  for (const segment of segments) {
    current = current?.[segment];
  }

  if (typeof current !== 'string') {
    return key;
  }

  return interpolate(current, params);
};

const renderOrderStatusLabel = (status: string, locale: AppLocale) => {
  const normalized = status.trim().toLowerCase();
  const translated = emailT(locale, `statusLabel.${normalized}`);
  return translated === `statusLabel.${normalized}` ? status : translated;
};

const isVnpayOrder = (paymentMethod?: string | null) =>
  (paymentMethod ?? '').trim().toUpperCase() === 'VNPAY';

export const renderVerificationEmail = (payload: VerificationEmailPayload): RenderedEmail => {
  const locale = resolveLocale(payload.locale);

  return {
    subject: emailT(locale, 'verification.subject'),
    html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'verification.greeting', { fullName: payload.fullName })}</p>
        <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'verification.intro')}
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
          ${emailT(locale, 'verification.codeHint')}
        </p>
        <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
          ${emailT(locale, 'verification.expiry')}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          ${emailT(locale, 'verification.footer')}
        </p>
      </td>
    </tr>
    `),
    text: `
    ${emailT(locale, 'verification.greeting', { fullName: payload.fullName }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'verification.intro')}

    ${payload.code}

    ${emailT(locale, 'verification.codeHint')}

    ${emailT(locale, 'verification.expiry')}

    ${emailT(locale, 'verification.footer')}
    `,
  };
};

export const renderPasswordResetEmail = (payload: PasswordResetEmailPayload): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  const resetLink = `${env.serverUrl}/api/auth/reset-password?token=${encodeURIComponent(payload.code)}`;

  return {
    subject: emailT(locale, 'passwordReset.subject'),
    html: renderShell(`
      <tr>
        <td style="padding: 20px 40px;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'passwordReset.greeting', { fullName: payload.fullName })}</p>
          <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
            ${emailT(locale, 'passwordReset.intro')}
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
            ${emailT(locale, 'passwordReset.codeHint')}
          </p>
          <p style="margin: 0 0 10px; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
            ${resetLink}
          </p>
          <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
            ${emailT(locale, 'passwordReset.expiry')}
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
      ${emailT(locale, 'passwordReset.greeting', { fullName: payload.fullName }).replace(/<strong>|<\/strong>/g, '')}

      ${emailT(locale, 'passwordReset.intro')}

      ${payload.code}

      ${emailT(locale, 'passwordReset.fallbackLink')}:
      ${resetLink}

      ${emailT(locale, 'passwordReset.expiry')}
    `,
  };
};

export const renderOrderPlacedEmail = (payload: OrderPlacedEmailPayload): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  const paymentMethod = payload.paymentMethod ?? emailT(locale, 'common.na');
  const vnpayPending = isVnpayOrder(payload.paymentMethod);
  const subject = emailT(
    locale,
    vnpayPending ? 'orderPlaced.vnpayPaid.subject' : 'orderPlaced.subject',
    { orderNumber: payload.orderNumber },
  );
  const intro = emailT(
    locale,
    vnpayPending ? 'orderPlaced.vnpayPaid.intro' : 'orderPlaced.intro',
    { orderNumber: payload.orderNumber },
  );
  const trackLinkLabel = emailT(
    locale,
    vnpayPending ? 'orderPlaced.vnpayPaid.trackLinkLabel' : 'orderPlaced.trackLinkLabel',
  );
  const footer = emailT(
    locale,
    vnpayPending ? 'orderPlaced.vnpayPaid.footer' : 'orderPlaced.footer',
  );
  const paymentNotice = vnpayPending
    ? `
        <div style="background-color: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.35); border-radius: 8px; padding: 16px; margin: 0 0 20px;">
          <p style="margin: 0; font-size: 13px; color: #f5f5f5; line-height: 1.6;">
            ${emailT(locale, 'orderPlaced.vnpayPaid.notice')}
          </p>
        </div>
      `
    : '';

  return {
    subject,
    html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'orderPlaced.greeting', { customerName: payload.customerName })}</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${intro}
        </p>
        ${paymentNotice}
        <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${emailT(locale, 'orderPlaced.orderTotalLabel')}</p>
          <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${formatCurrency(payload.totalAmount)}</p>
          <p style="margin: 0; font-size: 13px; color: #888888;">${emailT(locale, 'orderPlaced.paymentMethodLabel', { paymentMethod })}</p>
        </div>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          ${trackLinkLabel}
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.orderUrl}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          ${footer}
        </p>
      </td>
    </tr>
    `),
    text: `
    ${emailT(locale, 'orderPlaced.greeting', { customerName: payload.customerName }).replace(/<strong>|<\/strong>/g, '')}

    ${intro.replace(/<strong>|<\/strong>/g, '')}

    ${vnpayPending ? emailT(locale, 'orderPlaced.vnpayPaid.notice') : ''}

    ${emailT(locale, 'orderPlaced.orderTotalLabel')}: ${formatCurrency(payload.totalAmount)}
    ${emailT(locale, 'orderPlaced.paymentMethodLabel', { paymentMethod })}

    ${trackLinkLabel}
    ${payload.orderUrl}

    ${footer}
    `,
  };
};

export const renderOrderStatusEmail = (payload: OrderStatusEmailPayload): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  const statusLabel = renderOrderStatusLabel(payload.status, locale);
  const previousStatusLabel = payload.previousStatus
    ? renderOrderStatusLabel(payload.previousStatus, locale)
    : null;

  return {
    subject: emailT(locale, 'orderStatus.subject', { orderNumber: payload.orderNumber, statusLabel }),
    html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'orderStatus.greeting', { customerName: payload.customerName })}</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'orderStatus.intro', { orderNumber: payload.orderNumber })}
        </p>
        <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${emailT(locale, 'orderStatus.currentStatusLabel')}</p>
          <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${statusLabel}</p>
          ${previousStatusLabel ? `<p style="margin: 0 0 8px; font-size: 13px; color: #888888;">${emailT(locale, 'orderStatus.previousStatusLabel', { previousStatusLabel })}</p>` : ''}
          ${payload.note ? `<p style="margin: 0; font-size: 13px; color: #888888;">${emailT(locale, 'orderStatus.noteLabel', { note: payload.note })}</p>` : ''}
        </div>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          ${emailT(locale, 'orderStatus.trackLinkLabel')}
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.trackingUrl}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          ${emailT(locale, 'orderStatus.footer')}
        </p>
      </td>
    </tr>
    `),
    text: `
    ${emailT(locale, 'orderStatus.greeting', { customerName: payload.customerName }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'orderStatus.intro', { orderNumber: payload.orderNumber }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'orderStatus.currentStatusLabel')}: ${statusLabel}
    ${previousStatusLabel ? emailT(locale, 'orderStatus.previousStatusLabel', { previousStatusLabel }) : ''}
    ${payload.note ? emailT(locale, 'orderStatus.noteLabel', { note: payload.note }) : ''}

    ${emailT(locale, 'orderStatus.trackLinkLabel')}
    ${payload.trackingUrl}
    `,
  };
};

export const renderRefundAcceptedBankInfoRequiredEmail = (
  payload: RefundAcceptedBankInfoRequiredEmailPayload,
): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  return {
    subject: emailT(locale, 'refundAcceptedBankInfoRequired.subject'),
    html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'refundAcceptedBankInfoRequired.greeting', { customerName: payload.customerName })}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'refundAcceptedBankInfoRequired.intro', { orderNumber: payload.orderNumber })}
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'refundAcceptedBankInfoRequired.body')}
        </p>
        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
          ${emailT(locale, 'refundAcceptedBankInfoRequired.linkLabel')}
        </p>
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
          ${payload.profileBankLink}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 40px; border-top: 1px solid #222;">
        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
          ${emailT(locale, 'refundAcceptedBankInfoRequired.footer')}
        </p>
      </td>
    </tr>
    `),
    text: `
    ${emailT(locale, 'refundAcceptedBankInfoRequired.greeting', { customerName: payload.customerName }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'refundAcceptedBankInfoRequired.intro', { orderNumber: payload.orderNumber }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'refundAcceptedBankInfoRequired.body')}

    ${emailT(locale, 'refundAcceptedBankInfoRequired.linkLabel')}
    ${payload.profileBankLink}

    ${emailT(locale, 'refundAcceptedBankInfoRequired.footer')}
    `,
  };
};

export const renderRefundAcceptedAwaitingPayoutEmail = (
  payload: RefundAcceptedAwaitingPayoutEmailPayload,
): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  return {
    subject: emailT(locale, 'refundAcceptedAwaitingPayout.subject'),
    html: renderShell(`
    <tr>
      <td style="padding: 20px 40px;">
        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'refundAcceptedAwaitingPayout.greeting', { customerName: payload.customerName })}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'refundAcceptedAwaitingPayout.intro', { orderNumber: payload.orderNumber })}
        </p>
        <p style="margin: 0; font-size: 14px; color: #888888; line-height: 1.6;">
          ${emailT(locale, 'refundAcceptedAwaitingPayout.body')}
        </p>
      </td>
    </tr>
    `),
    text: `
    ${emailT(locale, 'refundAcceptedAwaitingPayout.greeting', { customerName: payload.customerName }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'refundAcceptedAwaitingPayout.intro', { orderNumber: payload.orderNumber }).replace(/<strong>|<\/strong>/g, '')}

    ${emailT(locale, 'refundAcceptedAwaitingPayout.body')}
    `,
  };
};

export const renderRefundCompletedBenefitIssuedEmail = (
  payload: RefundCompletedBenefitIssuedEmailPayload,
): RenderedEmail => {
  const locale = resolveLocale(payload.locale);
  const refundDateLabel = new Date(payload.refundDate).toLocaleDateString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
  );
  const voucherSummary =
    payload.voucherSummary ?? emailT(locale, 'refundCompletedBenefitIssued.defaultVoucherSummary');

  return {
    subject: emailT(locale, 'refundCompletedBenefitIssued.subject'),
    html: renderShell(`
      <tr>
        <td style="padding: 20px 40px;">
          <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">${emailT(locale, 'refundCompletedBenefitIssued.greeting', { customerName: payload.customerName })}</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #888888; line-height: 1.6;">
            ${emailT(locale, 'refundCompletedBenefitIssued.intro', { orderNumber: payload.orderNumber })}
          </p>
          <div style="background-color: #1a1a1a; border: 1px solid #222; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${emailT(locale, 'refundCompletedBenefitIssued.refundAmountLabel')}</p>
            <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #ffffff;">${formatCurrency(payload.refundAmount)}</p>
            <p style="margin: 0 0 8px; font-size: 13px; color: #888888;">${emailT(locale, 'refundCompletedBenefitIssued.refundDateLabel', { refundDateLabel })}</p>
            <p style="margin: 0; font-size: 13px; color: #888888;">${voucherSummary}</p>
          </div>
          <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
            ${emailT(locale, 'refundCompletedBenefitIssued.linkLabel')}
          </p>
          <p style="margin: 0; font-size: 11px; color: #444444; text-align: center; word-break: break-all;">
            ${payload.profileLink}
          </p>
        </td>
      </tr>
    `),
    text: `
      ${emailT(locale, 'refundCompletedBenefitIssued.greeting', { customerName: payload.customerName }).replace(/<strong>|<\/strong>/g, '')}

      ${emailT(locale, 'refundCompletedBenefitIssued.intro', { orderNumber: payload.orderNumber }).replace(/<strong>|<\/strong>/g, '')}

      ${emailT(locale, 'refundCompletedBenefitIssued.refundAmountLabel')}: ${formatCurrency(payload.refundAmount)}
      ${emailT(locale, 'refundCompletedBenefitIssued.refundDateLabel', { refundDateLabel })}
      ${voucherSummary}

      ${emailT(locale, 'refundCompletedBenefitIssued.linkLabel')}
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
