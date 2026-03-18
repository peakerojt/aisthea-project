import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';
import { env } from '../lib/env'; // Ensure env is loaded before proceeding

const SMTP_FROM = process.env.SMTP_FROM || 'AISTHEA <noreply@aisthea.com>';

// Helper function to create the transporter dynamically at runtime 
// so it guarantees process.env has fully loaded.
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: parseInt(process.env.SMTP_PORT || '587') === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
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

        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send verification email', { error, smtpUser: process.env.SMTP_USER });
        throw new Error('Failed to send verification email');
    }
}


/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string, token: string, fullName: string) => {
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
                                        
                                        <!-- Verification Code -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td align="center" style="padding: 20px 0 30px;">
                                                    <div style="background-color: #1a1a1a; border: 2px solid #dc2626; border-radius: 8px; padding: 24px 40px; display: inline-block;">
                                                        <span style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${token}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 0 0 10px; font-size: 12px; color: #666666; text-align: center;">
                                            Enter this code in the forgot password screen to reset your password.
                                        </p>
                                        
                                        <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
                                            This code will expire in 1 hour.
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
            
            Your password reset code is:
            
            ${token}
            
            Enter this code in the forgot password screen to reset your password.
            
            If you didn't request this, please ignore this email.
            
            This code will expire in 1 hour.
        `,
    };

    try {
        await createTransporter().sendMail(mailOptions);
        return true;
    } catch (error) {
        logger.error('[emailService] Failed to send password reset email', { error, smtpUser: process.env.SMTP_USER });
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async () => {
    try {
        await createTransporter().verify();
        logger.info('[emailService] SMTP connection verified');
        return true;
    } catch (error) {
        logger.error('[emailService] SMTP connection failed', { error });
        return false;
    }
};
