import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import * as bcrypt from 'bcryptjs';
import { PrismaClient } from './src/generated/client';
const prisma = new PrismaClient();

async function main() {
    const email = 'return.customer@test.com';
    const newPassword = 'Test@123456';

    const hash = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
        where: { email },
        data: {
            passwordHash: hash,
            status: 'Active', // đảm bảo account không bị Pending
        },
    });

    console.log('✅ Password reset thành công!');
    console.log('   Email   :', updated.email);
    console.log('   Password: Test@123456');
    console.log('   Status  :', updated.status);
}

main().catch(console.error).finally(() => prisma.$disconnect());
