
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthRequest extends Request {
    user?: any; // Define user type properly later
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

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
