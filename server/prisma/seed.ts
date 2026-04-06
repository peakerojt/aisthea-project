import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_PERMISSION_CATALOG } from '../src/shared/default-permissions';

const prisma = new PrismaClient();

async function main() {
  // ── 1. Ensure base roles exist ──────────────────────────────────────────────
  const [customerRole, adminRole, supportRole, superAdminRole] = await Promise.all([
    prisma.role.upsert({
      where: { roleName: 'Customer' },
      update: {},
      create: { roleName: 'Customer' },
    }),
    prisma.role.upsert({
      where: { roleName: 'Admin' },
      update: {},
      create: { roleName: 'Admin' },
    }),
    prisma.role.upsert({
      where: { roleName: 'Support' },
      update: {},
      create: { roleName: 'Support' },
    }),
    prisma.role.upsert({
      where: { roleName: 'Super Admin' },
      update: {},
      create: { roleName: 'Super Admin' },
    }),
  ]);

  // ── 2. Upsert all permissions ───────────────────────────────────────────────
  const permissions = await Promise.all(
    DEFAULT_PERMISSION_CATALOG.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: { module: p.module, description: p.description },
        create: p,
      })
    )
  );

  // ── 3. Assign ALL permissions to Super Admin ────────────────────────────────
  await Promise.all(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.roleId,
            permissionId: perm.permissionId,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.roleId,
          permissionId: perm.permissionId,
        },
      })
    )
  );

  console.log(`✅ Seeded ${permissions.length} permissions and assigned all to "Super Admin"`);

  // ── 4. Seed a test customer and admin user ──────────────────────────────────
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'customer.order@example.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'customer.order@example.com',
      fullName: 'Customer Order Demo',
      status: 'Active',
      passwordHash: defaultPasswordHash,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin.order@example.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'admin.order@example.com',
      fullName: 'Admin Order Demo',
      status: 'Active',
      passwordHash: defaultPasswordHash,
    },
  });

  const support = await prisma.user.upsert({
    where: { email: 'support.returns@example.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'support.returns@example.com',
      fullName: 'Support Returns Demo',
      status: 'Active',
      passwordHash: defaultPasswordHash,
    },
  });

  // ── 5. Attach roles ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: customer.userId,
          roleId: customerRole.roleId,
        },
      },
      update: {},
      create: {
        userId: customer.userId,
        roleId: customerRole.roleId,
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.userId,
          roleId: adminRole.roleId,
        },
      },
      update: {},
      create: {
        userId: admin.userId,
        roleId: adminRole.roleId,
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: support.userId,
          roleId: supportRole.roleId,
        },
      },
      update: {},
      create: {
        userId: support.userId,
        roleId: supportRole.roleId,
      },
    }),
  ]);



  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
