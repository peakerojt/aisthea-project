import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';
import { env } from '../lib/env';

const SMTP_HOST = env.smtpHost;
const SMTP_PORT = env.smtpPort;
const SMTP_USER = env.smtpUser;
const SMTP_PASS = env.smtpPass;
const SMTP_FROM = env.smtpFrom;
const RESEND_API_KEY = env.resendApiKey;
const RESEND_FROM = env.resendFrom;
const SERVER_URL = env.serverUrl;
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_REQUEST_TIMEOUT_MS = 10_000;
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;

const createTransporter = () => {
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        throw new Error('SMTP is not configured');
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    });
};

type MailRequest = {
    to: string;
    subject: string;
    html: string;
    text: string;
};

const serializeMailError = (error: unknown) => {
    if (error instanceof Error) {
        const mailError = error as Error & {
            code?: string;
            command?: string;
            response?: string;
            responseCode?: number;
        };

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

const sendWithResend = async (mail: MailRequest) => {
    if (!RESEND_API_KEY) {
        throw new Error('Resend is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: [mail.to],
                subject: mail.subject,
                html: mail.html,
                text: mail.text,
            }),
            signal: controller.signal,
        });

        const payload = await response.json().catch(() => null) as
            | { id?: string; error?: { name?: string; message?: string } }
            | null;

        if (!response.ok) {
            throw new Error(payload?.error?.message || `Resend request failed with status ${response.status}`);
        }

        return {
            provider: 'resend' as const,
            messageId: payload?.id,
        };
    } finally {
        clearTimeout(timeout);
    }
};

const sendWithSmtp = async (mail: MailRequest) => {
    const info = await createTransporter().sendMail({
        from: SMTP_FROM,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
    });

    return {
        provider: 'smtp' as const,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    };
};

const sendMail = async (mail: MailRequest) => {
    if (RESEND_API_KEY) {
        return sendWithResend(mail);
    }

    return sendWithSmtp(mail);
};

/**
 * Send verification email to user with 6-digit code
 */
export const sendVerificationEmail = async (email: string, code: string, fullName: string) => {
    const mailOptions: MailRequest = {
        to: email,
        subject: 'Your Verification Code - AISTHEA',
        html: `
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
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -1px; text-transform: uppercase;">AISTHEA</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${fullName}</strong>,</p>
                                        <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
                                            Thank you for joining AISTHEA. Please use the verification code below to complete your registration.
                                        </p>
                                        
                                        <!-- Verification Code -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding: 20px 0 30px;">
                                                    <div style="background-color: #1a1a1a; border: 2px solid #dc2626; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                                                        <span style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${code}</span>
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
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 30px 40px; border-top: 1px solid #222;">
                                        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
                                            If you didn't create an account with AISTHEA, you can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        text: `
            Hello ${fullName},
            
            Thank you for joining AISTHEA. Your verification code is:
            
            ${code}
            
            Enter this code in the verification screen to complete your registration.
            
            This code will expire in 24 hours.
            
            If you didn't create an account with AISTHEA, you can safely ignore this email.
        `,
    };

    try {
        const info = await sendMail(mailOptions);
        logger.debug('[emailService] Verification email sent', {
            provider: info.provider,
            to: email,
            messageId: info.messageId,
            accepted: 'accepted' in info ? info.accepted : undefined,
            rejected: 'rejected' in info ? info.rejected : undefined,
            response: 'response' in info ? info.response : undefined,
        });

        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send verification email', {
            mailError: serializeMailError(error),
            provider: RESEND_API_KEY ? 'resend' : 'smtp',
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
            smtpFrom: SMTP_FROM,
            resendFrom: RESEND_FROM,
            to: email,
        });
        throw new Error('Failed to send verification email');
    }
}


/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string, token: string, fullName: string) => {
    const resetLink = `${SERVER_URL}/api/auth/reset-password-init?token=${token}`;

    const mailOptions: MailRequest = {
        to: email,
        subject: 'Reset Your Password - AISTHEA',
        html: `
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
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -1px; text-transform: uppercase;">AISTHEA</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 20px 40px;">
                                        <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Hello <strong>${fullName}</strong>,</p>
                                        <p style="margin: 0 0 30px; font-size: 14px; color: #888888; line-height: 1.6;">
                                            We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
                                        </p>
                                        
                                        <!-- Reset Code -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding: 20px 0 24px;">
                                                    <div style="background-color: #1a1a1a; border: 2px solid #dc2626; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                                                        <span style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${token}</span>
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
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 30px 40px; border-top: 1px solid #222;">
                                        <p style="margin: 0; font-size: 11px; color: #444444; text-align: center;">
                                            &copy; ${new Date().getFullYear()} AISTHEA. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        text: `
            Hello ${fullName},

            We received a request to reset your password.

            Your 6-digit password reset code is:

            ${token}

            You can also open the following fallback reset link:
            ${resetLink}

            If you didn't request this, please ignore this email.

            This code and link will expire in 1 hour.
        `,
    };

    try {
        const info = await sendMail(mailOptions);
        logger.debug('[emailService] Password reset email sent', {
            provider: info.provider,
            to: email,
            messageId: info.messageId,
            accepted: 'accepted' in info ? info.accepted : undefined,
            rejected: 'rejected' in info ? info.rejected : undefined,
            response: 'response' in info ? info.response : undefined,
        });
        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send password reset email', {
            mailError: serializeMailError(error),
            provider: RESEND_API_KEY ? 'resend' : 'smtp',
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
            smtpFrom: SMTP_FROM,
            resendFrom: RESEND_FROM,
            to: email,
        });
        throw new Error('Failed to send password reset email');
    }
};

type RefundEmailOptions = {
    email: string;
    subject: string;
    html: string;
    text: string;
    logLabel: string;
};

const sendRefundWorkflowEmail = async (options: RefundEmailOptions) => {
    const mailOptions: MailRequest = {
        to: options.email,
        subject: options.subject,
        html: options.html,
        text: options.text,
    };

    try {
        const info = await sendMail(mailOptions);
        logger.debug(`[emailService] ${options.logLabel} email sent`, {
            provider: info.provider,
            to: options.email,
            messageId: info.messageId,
            accepted: 'accepted' in info ? info.accepted : undefined,
            rejected: 'rejected' in info ? info.rejected : undefined,
            response: 'response' in info ? info.response : undefined,
        });
        return true;
    } catch (error) {
        logger.error(`[emailService] Failed to send ${options.logLabel} email`, {
            mailError: serializeMailError(error),
            provider: RESEND_API_KEY ? 'resend' : 'smtp',
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
            smtpFrom: SMTP_FROM,
            resendFrom: RESEND_FROM,
            to: options.email,
        });
        throw new Error(`Failed to send ${options.logLabel} email`);
    }
};

export const sendRefundAcceptedBankInfoRequiredEmail = async (
    email: string,
    fullName: string,
    orderNumber: string,
    profileBankLink = `${env.clientUrl}/profile`,
) =>
    sendRefundWorkflowEmail({
        email,
        subject: 'Your refund request has been approved',
        logLabel: 'refund accepted bank info required',
        html: `
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your refund request for order <strong>${orderNumber}</strong> has been approved.</p>
            <p>Before our finance team can complete the payout, please update your bank information in your account profile.</p>
            <p><a href="${profileBankLink}">Update Bank Information</a></p>
            <p>You can add a bank account manually or upload a QR image as a reference.</p>
        `,
        text: `
            Hello ${fullName},

            Your refund request for order ${orderNumber} has been approved.

            Before our finance team can complete the payout, please update your bank information here:
            ${profileBankLink}

            You can add a bank account manually or upload a QR image as a reference.
        `,
    });

export const sendRefundAcceptedAwaitingPayoutEmail = async (
    email: string,
    fullName: string,
    orderNumber: string,
) =>
    sendRefundWorkflowEmail({
        email,
        subject: 'Your refund request is being processed',
        logLabel: 'refund accepted awaiting payout',
        html: `
            <p>Hello <strong>${fullName}</strong>,</p>
            <p>Your refund request for order <strong>${orderNumber}</strong> has been approved.</p>
            <p>We already have your bank information on file, and your payout is now waiting for manual processing by our finance team.</p>
        `,
        text: `
            Hello ${fullName},

            Your refund request for order ${orderNumber} has been approved.

            We already have your bank information on file, and your payout is now waiting for manual processing by our finance team.
        `,
    });

export const sendRefundCompletedBenefitIssuedEmail = async (params: {
    email: string;
    fullName: string;
    orderNumber: string;
    refundAmount: number;
    refundDate: Date;
    voucherSummary: string | null;
    profileLink?: string;
}) => {
    const profileLink = params.profileLink ?? `${env.clientUrl}/profile`;
    const refundDateLabel = params.refundDate.toLocaleDateString('vi-VN');
    const formattedAmount = params.refundAmount.toLocaleString('vi-VN');
    const voucherSummary = params.voucherSummary ?? 'An available voucher has been added to your account.';

    return sendRefundWorkflowEmail({
        email: params.email,
        subject: 'Your refund has been completed successfully',
        logLabel: 'refund completed benefit issued',
        html: `
            <p>Hello <strong>${params.fullName}</strong>,</p>
            <p>Your refund for order <strong>${params.orderNumber}</strong> has been completed successfully.</p>
            <p>Refund amount: <strong>${formattedAmount} VND</strong></p>
            <p>Refund date: <strong>${refundDateLabel}</strong></p>
            <p>${voucherSummary}</p>
            <p>You can review your available voucher information in your account:</p>
            <p><a href="${profileLink}">Open My Account</a></p>
        `,
        text: `
            Hello ${params.fullName},

            Your refund for order ${params.orderNumber} has been completed successfully.

            Refund amount: ${formattedAmount} VND
            Refund date: ${refundDateLabel}
            ${voucherSummary}

            You can review your available voucher information here:
            ${profileLink}
        `,
    });
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async () => {
    if (RESEND_API_KEY) {
        logger.info('[emailService] Resend provider configured', {
            provider: 'resend',
            resendFrom: RESEND_FROM,
        });
        return true;
    }

    try {
        await createTransporter().verify();
        logger.info('[emailService] SMTP connection verified', {
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
        });
        return true;
    } catch (error) {
        logger.error('[emailService] SMTP connection failed', {
            mailError: serializeMailError(error),
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
        });
        return false;
    }
};
