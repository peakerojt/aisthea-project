
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
        res.status(200).json(result);
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
