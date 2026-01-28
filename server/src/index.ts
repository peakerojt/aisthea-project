import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '../src/generated/client/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Prisma Adapter cho SQL Server (Prisma 7)
const connectionString = process.env.DATABASE_URL as string;
const adapter = new PrismaMssql(connectionString);
const prisma = new PrismaClient({ adapter });

// Route test
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Server SQL Server đã kết nối thành công! 🚀</h1>');
});

// Start server
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
