import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './utils/prisma';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';

import os from 'os';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

// Route test
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Server SQL Server đã kết nối thành công! 🚀</h1>');
});

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
