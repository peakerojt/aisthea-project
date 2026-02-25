import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure base roles exist
  const [customerRole, adminRole] = await Promise.all([
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
  ]);

  // Seed a test customer and admin user
  const customer = await prisma.user.upsert({
    where: { email: 'customer.order@example.com' },
    update: {},
    create: {
      email: 'customer.order@example.com',
      fullName: 'Customer Order Demo',
      status: 'Active',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin.order@example.com' },
    update: {},
    create: {
      email: 'admin.order@example.com',
      fullName: 'Admin Order Demo',
      status: 'Active',
    },
  });

  // Attach roles
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

  // Seed three demo orders for the customer
  // 1) Pending order
  const ord1 = await prisma.order.create({
    data: {
      userId: customer.userId,
      orderNumber: 'OD20260001',
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
      orderNumber: 'OD20260002',
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
      orderNumber: 'OD20260003',
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

  // Seed status history timeline for each order
  const now = new Date();

  await prisma.orderStatusHistory.createMany({
    data: [
      // Order 1: pending -> confirmed
      {
        orderId: ord1.orderId,
        status: 'Pending',
        changedAt: new Date(now.getTime() - 1000 * 60 * 30),
      },
      {
        orderId: ord1.orderId,
        status: 'Confirmed',
        changedAt: new Date(now.getTime() - 1000 * 60 * 20),
      },
      // Order 2: pending -> confirmed -> shipping
      {
        orderId: ord2.orderId,
        status: 'Pending',
        changedAt: new Date(now.getTime() - 1000 * 60 * 90),
      },
      {
        orderId: ord2.orderId,
        status: 'Confirmed',
        changedAt: new Date(now.getTime() - 1000 * 60 * 70),
      },
      {
        orderId: ord2.orderId,
        status: 'Shipping',
        changedAt: new Date(now.getTime() - 1000 * 60 * 50),
      },
      // Order 3: pending -> cancelled
      {
        orderId: ord3.orderId,
        status: 'Pending',
        changedAt: new Date(now.getTime() - 1000 * 60 * 120),
      },
      {
        orderId: ord3.orderId,
        status: 'Cancelled',
        changedAt: new Date(now.getTime() - 1000 * 60 * 110),
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

