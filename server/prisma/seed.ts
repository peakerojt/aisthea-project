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
  // REVENUE module
  { code: 'VIEW_REVENUE', module: 'REVENUE', description: 'Xem báo cáo doanh thu và phân tích' },
  // COUPON module
  { code: 'MANAGE_COUPON', module: 'COUPON', description: 'Thêm, sửa, xóa mã giảm giá' },
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

  // ── 6. Seed three demo orders for the customer ──────────────────────────────
  // 1) Pending order
  const ord1 = await prisma.order.create({
    data: {
      userId: customer.userId,
      orderNumber: `OD2026SEED1_${Date.now()}`,
      customerName: customer.fullName,
      customerPhone: '0900000001',
      shippingCity: 'TP.HCM',
      shippingDistrict: 'Quan 1',
      shippingWard: 'Ben Nghe',
      shippingAddressDetail: '123 Le Loi',
      totalAmount: 398000 + 30000 - 20000,
      status: 'Pending',
      paymentMethod: 'COD',
      paymentStatus: 'Unpaid',
      note: 'Giao giờ hành chính',
      items: {
        create: [
          {
            productName: 'Áo thun',
            sku: 'SKU-RED-M',
            variantName: 'Đỏ / M',
            unitPrice: 199000,
            quantity: 2,
          },
        ],
      },
    },
  });

  // 2) Confirmed + Shipping order
  const ord2 = await prisma.order.create({
    data: {
      userId: customer.userId,
      orderNumber: `OD2026SEED2_${Date.now()}`,
      customerName: customer.fullName,
      customerPhone: '0900000002',
      shippingCity: 'TP.HCM',
      shippingDistrict: 'Quan 3',
      shippingWard: 'Vo Thi Sau',
      shippingAddressDetail: '456 Cach Mang Thang 8',
      totalAmount: 550000,
      status: 'Shipping',
      paymentMethod: 'BankTransfer',
      paymentStatus: 'Paid',
      trackingNumber: 'TRACK123456',
      carrier: 'GHN',
      items: {
        create: [
          {
            productName: 'Quần jean',
            sku: 'SKU-BLUE-32',
            variantName: 'Xanh / 32',
            unitPrice: 350000,
            quantity: 1,
          },
          {
            productName: 'Áo sơ mi',
            sku: 'SKU-WHITE-L',
            variantName: 'Trắng / L',
            unitPrice: 200000,
            quantity: 1,
          },
        ],
      },
    },
  });

  // 3) Cancelled order
  const ord3 = await prisma.order.create({
    data: {
      userId: customer.userId,
      orderNumber: `OD2026SEED3_${Date.now()}`,
      customerName: customer.fullName,
      customerPhone: '0900000003',
      shippingCity: 'Ha Noi',
      shippingDistrict: 'Cau Giay',
      shippingWard: 'Dich Vong',
      shippingAddressDetail: '789 Tran Dang Ninh',
      totalAmount: 299000,
      status: 'Cancelled',
      paymentMethod: 'COD',
      paymentStatus: 'Unpaid',
      note: 'Khách yêu cầu hủy',
      items: {
        create: [
          {
            productName: 'Áo khoác',
            sku: 'SKU-BLACK-M',
            variantName: 'Đen / M',
            unitPrice: 299000,
            quantity: 1,
          },
        ],
      },
    },
  });

  // ── 7. Seed status history ──────────────────────────────────────────────────
  const now = new Date();

  await prisma.orderStatusHistory.createMany({
    data: [
      { orderId: ord1.orderId, status: 'Pending', changedAt: new Date(now.getTime() - 1000 * 60 * 30) },
      { orderId: ord1.orderId, status: 'Confirmed', changedAt: new Date(now.getTime() - 1000 * 60 * 20) },
      { orderId: ord2.orderId, status: 'Pending', changedAt: new Date(now.getTime() - 1000 * 60 * 90) },
      { orderId: ord2.orderId, status: 'Confirmed', changedAt: new Date(now.getTime() - 1000 * 60 * 70) },
      { orderId: ord2.orderId, status: 'Shipping', changedAt: new Date(now.getTime() - 1000 * 60 * 50) },
      { orderId: ord3.orderId, status: 'Pending', changedAt: new Date(now.getTime() - 1000 * 60 * 120) },
      { orderId: ord3.orderId, status: 'Cancelled', changedAt: new Date(now.getTime() - 1000 * 60 * 110) },
    ],
  });

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
