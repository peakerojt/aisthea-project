import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import type { EmailDispatchResult, MailRequest } from './email.types';

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_REQUEST_TIMEOUT_MS = 10_000;
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;

let smtpTransporter: Transporter | null = null;

type DetailedMailError = Error & {
  code?: string;
  command?: string;
  response?: string;
  responseCode?: number;
};

export const serializeMailError = (error: unknown) => {
  if (error instanceof Error) {
    const mailError = error as DetailedMailError;

    return {
      name: mailError.name,
      message: mailError.message,
      code: mailError.code,
      command: mailError.command,
      responseCode: mailError.responseCode,
      response: mailError.response,
      stack: mailError.stack,
    };
  }

  return { value: error };
};

const getSmtpTransporter = () => {
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass) {
    throw new Error('SMTP is not configured');
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    });
  }

  return smtpTransporter;
};

const sendWithResend = async (mail: MailRequest): Promise<EmailDispatchResult> => {
  if (!env.resendApiKey) {
    throw new Error('Resend is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.resendFrom,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; error?: { name?: string; message?: string } }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || `Resend request failed with status ${response.status}`);
    }

    return {
      provider: 'resend',
      messageId: payload?.id,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const sendWithSmtp = async (mail: MailRequest): Promise<EmailDispatchResult> => {
  const info = await getSmtpTransporter().sendMail({
    from: env.smtpFrom,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return {
    provider: 'smtp',
    messageId: info.messageId,
  };
};

export const sendMail = async (mail: MailRequest): Promise<EmailDispatchResult> => {
  if (env.resendApiKey) {
    return sendWithResend(mail);
  }

  return sendWithSmtp(mail);
};

export const verifyEmailConnection = async () => {
  if (env.resendApiKey) {
    logger.info('[emailProvider] Resend provider configured', {
      provider: 'resend',
      resendFrom: env.resendFrom,
    });
    return true;
  }

  try {
    await getSmtpTransporter().verify();
    logger.info('[emailProvider] SMTP connection verified', {
      smtpHost: env.smtpHost,
      smtpPort: env.smtpPort,
      smtpUser: env.smtpUser,
    });
    return true;
  } catch (error) {
    logger.error('[emailProvider] SMTP connection failed', {
      mailError: serializeMailError(error),
      smtpHost: env.smtpHost,
      smtpPort: env.smtpPort,
      smtpUser: env.smtpUser,
    });
    return false;
  }
};
