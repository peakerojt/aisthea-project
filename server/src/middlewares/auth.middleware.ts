
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '../generated/client';

dotenv.config();

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1) Try to get token from HTTP-only cookie first (cookie-based auth)
    let token = req.cookies?.accessToken;

    // 2) Fallback to Authorization header (Bearer token)
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err: any, user: any) => {
        if (err) return res.sendStatus(403);

        // 3) Check user status in DB — reject if account is Banned
        try {
            const dbUser = await prisma.user.findUnique({
                where: { userId: user.userId },
                select: { status: true },
            });

            if (!dbUser) {
                return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
            }

            if (dbUser.status === 'Banned') {
                // Clear the auth cookie so the client logs out automatically
                res.clearCookie('accessToken');
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
                    code: 'ACCOUNT_BANNED',
                });
            }

            req.user = user;
            next();
        } catch (dbError) {
            console.error('Auth middleware DB check error:', dbError);
            return res.status(500).json({ success: false, message: 'Lỗi xác thực.' });
        }
    });
};
