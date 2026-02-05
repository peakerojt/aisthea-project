import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from './utils/prisma';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import passport from 'passport';
import { configureGoogleStrategy } from './config/passport.config';
import os from 'os';

dotenv.config();

const app = express();

// Initialize Passport
configureGoogleStrategy();
app.use(passport.initialize());

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Server SQL Server đã kết nối thành công! 🚀</h1>');
});

// Routes
// authRoutes is already imported and used above, but let me check where it was originally.
// Looking at the previous file content, it was used at line 29.
// So I should just remove my duplicate addition and only add product routes.
import productRoutes from './routes/product.routes';
app.use('/api/products', productRoutes);

// Start server
const PORT = Number(process.env.PORT) || 5000;

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   ➜  Local:   http://localhost:${PORT}/`);
    console.log(`   ➜  Network: http://${localIp}:${PORT}/`);
});
