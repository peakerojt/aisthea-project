import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('123456', 10);

    // Upsert Roles
    const adminRole = await prisma.role.upsert({
        where: { roleName: 'Admin' },
        update: {},
        create: { roleName: 'Admin' },
    });

    const customerRole = await prisma.role.upsert({
        where: { roleName: 'Customer' },
        update: {},
        create: { roleName: 'Customer' },
    });

    // Upsert Admin User
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@aisthea.com' },
        update: {},
        create: {
            email: 'admin@aisthea.com',
            fullName: 'System Administrator',
            passwordHash,
            status: 'Active',
            userRoles: {
                create: {
                    roleId: adminRole.roleId,
                },
            },
        },
    });

    // Upsert Customer User
    const customerUser = await prisma.user.upsert({
        where: { email: 'customer@aisthea.com' },
        update: {},
        create: {
            email: 'customer@aisthea.com',
            fullName: 'Test Customer',
            passwordHash,
            status: 'Active',
            userRoles: {
                create: {
                    roleId: customerRole.roleId,
                },
            },
        },
    });

    console.log({ adminUser, customerUser });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
