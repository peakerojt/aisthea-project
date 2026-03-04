import { prisma } from './utils/prisma';

async function run() {
    console.log('Testing findOrderTrackingById(13)...');
    try {
        const order = await prisma.order.findUnique({ where: { orderId: 13 }, include: { items: true, statusHistory: true, shipment: true } });
        console.log(JSON.stringify(order, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
