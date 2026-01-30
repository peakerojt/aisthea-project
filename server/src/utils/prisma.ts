
import { PrismaClient } from '../generated/client';

import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient();
