import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Default Permissions ────────────────────────────────────────────────────
const DEFAULT_PERMISSIONS = [
  // PRODUCT module
  { code: 'VIEW_PRODUCT', module: 'PRODUCT', description: 'Xem danh sách và chi tiết sản phẩm' },
  { code: 'CREATE_PRODUCT', module: 'PRODUCT', description: 'Thêm sản phẩm mới' },
  { code: 'EDIT_PRODUCT', module: 'PRODUCT', description: 'Sửa thông tin sản phẩm' },
  { code: 'DELETE_PRODUCT', module: 'PRODUCT', description: 'Xóa sản phẩm' },
  // ORDER module
  { code: 'VIEW_ORDER', module: 'ORDER', description: 'Xem danh sách và chi tiết đơn hàng' },
  { code: 'EDIT_ORDER', module: 'ORDER', description: 'Cập nhật trạng thái đơn hàng' },
  // INVENTORY module
  { code: 'VIEW_INVENTORY', module: 'INVENTORY', description: 'Xem tồn kho và lịch sử nhập kho' },
  { code: 'EDIT_INVENTORY', module: 'INVENTORY', description: 'Cập nhật số lượng tồn kho' },
  // CUSTOMER module
  { code: 'VIEW_CUSTOMER', module: 'CUSTOMER', description: 'Xem danh sách khách hàng' },
  { code: 'EDIT_CUSTOMER', module: 'CUSTOMER', description: 'Chỉnh sửa thông tin khách hàng' },
  { code: 'CUSTOMER_BANK_ACCOUNT_MANAGE', module: 'CUSTOMER', description: 'Quản lý tài khoản ngân hàng nhận hoàn tiền của khách hàng' },
  // REVENUE module
  { code: 'VIEW_REVENUE', module: 'REVENUE', description: 'Xem báo cáo doanh thu và phân tích' },
  // COUPON module
  { code: 'MANAGE_COUPON', module: 'COUPON', description: 'Thêm, sửa, xóa mã giảm giá' },
  { code: 'REFUND_BENEFIT_VIEW', module: 'COUPON', description: 'Xem danh sách ưu đãi hoàn tiền đã phát hành' },
  // RETURN module
  { code: 'RETURN_REFUND_FINANCE_VIEW', module: 'RETURN', description: 'Xem chi tiết thông tin tài chính của yêu cầu hoàn tiền' },
  { code: 'RETURN_REFUND_FINANCE_COMPLETE', module: 'RETURN', description: 'Xác nhận hoàn tiền chuyển khoản và tải chứng từ' },
];

async function main() {
  // ── 1. Ensure base roles exist ──────────────────────────────────────────────
  const [customerRole, adminRole, superAdminRole] = await Promise.all([
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
      where: { roleName: 'Super Admin' },
      update: {},
      create: { roleName: 'Super Admin' },
    }),
  ]);

  // ── 2. Upsert all permissions ───────────────────────────────────────────────
  const permissions = await Promise.all(
    DEFAULT_PERMISSIONS.map((p) =>
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
