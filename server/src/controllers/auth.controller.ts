
import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/schemas/auth.schema';
import { z, ZodError } from 'zod';

export const register = async (req: Request, res: Response) => {
    try {
        const { body } = await registerSchema.parseAsync({ body: req.body });
        const user = await registerUser(body);
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error: any) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error.message === 'Email already exists') {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { body } = await loginSchema.parseAsync({ body: req.body });
        const result = await loginUser(body);

        // Security: Set refresh token as httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return user and access token, exclude refresh token from body
        const { refreshToken, ...response } = result;
        res.status(200).json(response);
    } catch (error: any) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error.message === 'Invalid email or password' || error.message === 'User account is not active') {
            res.status(401).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
};
