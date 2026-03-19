import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'AISTHEA <noreply@aisthea.com>';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

const createTransporter = () => nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

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

/**
 * Send verification email to user with 6-digit code
 */
export const sendVerificationEmail = async (email: string, code: string, fullName: string) => {
    const mailOptions = {
        from: SMTP_FROM,
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
        const info = await createTransporter().sendMail(mailOptions);
        logger.debug('[emailService] Verification email sent', {
            to: email,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            messageId: info.messageId,
        });

        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send verification email', {
            mailError: serializeMailError(error),
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
            smtpFrom: SMTP_FROM,
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

    const mailOptions = {
        from: SMTP_FROM,
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
        const info = await createTransporter().sendMail(mailOptions);
        logger.debug('[emailService] Password reset email sent', {
            to: email,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            messageId: info.messageId,
        });
        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send password reset email', {
            mailError: serializeMailError(error),
            smtpHost: SMTP_HOST,
            smtpPort: SMTP_PORT,
            smtpUser: SMTP_USER,
            smtpFrom: SMTP_FROM,
            to: email,
        });
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async () => {
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
