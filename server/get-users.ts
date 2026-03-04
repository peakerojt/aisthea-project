import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PrismaClient } from './src/generated/client';
const prisma = new PrismaClient();

async function main() {
    // --- Customer: find user who owns the seeded return requests ---
    const returnReq = await prisma.returnRequest.findFirst({
        include: { user: true },
        orderBy: { returnRequestId: 'asc' },
    });

    // --- Admin: find user with admin role ---
    const adminRole = await prisma.role.findFirst({
        where: { roleName: 'admin' },
    });
    const adminUser = adminRole
        ? await prisma.user.findFirst({
            where: {
                userRoles: { some: { roleId: adminRole.roleId } },
            },
        })
        : null;

    // --- All users with DELIVERED orders (fallback) ---
    const deliveredOrder = await prisma.order.findFirst({
        where: { status: 'DELIVERED' },
        include: { user: true },
    });

    console.log('\n========== TEST ACCOUNTS ==========\n');

    if (returnReq?.user) {
        console.log('📦 CUSTOMER (linked to seeded Return Requests):');
        console.log('   Email   :', returnReq.user.email);
        console.log('   FullName:', returnReq.user.fullName);
        console.log('   UserId  :', returnReq.user.userId);
        console.log('   Password: (stored as hash — thường là "12345678" hoặc "password")');
    } else if (deliveredOrder?.user) {
        console.log('📦 CUSTOMER (has DELIVERED order):');
        console.log('   Email   :', deliveredOrder.user.email);
        console.log('   FullName:', deliveredOrder.user.fullName);
        console.log('   UserId  :', deliveredOrder.user.userId);
    } else {
        console.log('❌ Không tìm thấy customer có đơn DELIVERED.');
    }

    console.log();

    if (adminUser) {
        console.log('🔑 ADMIN:');
        console.log('   Email   :', adminUser.email);
        console.log('   FullName:', adminUser.fullName);
        console.log('   UserId  :', adminUser.userId);
    } else {
        // fallback: list available roles
        const roles = await prisma.role.findMany();
        console.log('❌ Không tìm thấy role "admin". Roles hiện có:',
            roles.map(r => `${r.roleId}:${r.roleName}`).join(', '));
    }

    // --- List all users + roles for reference ---
    console.log('\n---------- ALL USERS ----------');
    const allUsers = await prisma.user.findMany({
        include: { userRoles: { include: { role: true } } },
        take: 20,
        orderBy: { userId: 'asc' },
    });
    for (const u of allUsers) {
        const roles = u.userRoles.map((r: any) => r.role.roleName).join(', ') || 'no role';
        console.log(`  [${u.userId}] ${u.email.padEnd(35)} | ${u.fullName.padEnd(20)} | ${roles}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
