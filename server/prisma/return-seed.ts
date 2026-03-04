/**
 * Return Order seed data — run with:
 *   npx ts-node prisma/return-seed.ts
 *
 * Requirements: At least one DELIVERED order with OrderItems must exist.
 * This seed creates sample ReturnRequests across 3 status stages.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load .env from server root regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding return order data...');

    // Find a DELIVERED order for testing
    const deliveredOrder = await (prisma as any).order.findFirst({
        where: { status: 'DELIVERED' },
        include: {
            items: true,
            user: true,
            statusHistory: {
                where: { status: 'DELIVERED' },
                orderBy: { changedAt: 'desc' },
                take: 1,
            },
        },
    });

    if (!deliveredOrder) {
        console.warn('⚠️  No DELIVERED order found. Please ensure seed data includes a DELIVERED order.');
        return;
    }

    const userId = deliveredOrder.userId;
    const orderId = deliveredOrder.orderId;
    const deliveredAt = deliveredOrder.statusHistory[0]?.changedAt ?? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // First item from the order
    const firstItem = deliveredOrder.items[0];
    if (!firstItem) {
        console.warn('⚠️  No order items found in DELIVERED order.');
        return;
    }

    // 1. REQUESTED return
    const requested = await (prisma as any).returnRequest.upsert({
        where: { returnRequestId: -1 }, // Forces a create (won't match)
        update: {},
        create: {
            orderId,
            userId,
            status: 'REQUESTED',
            reason: 'DEFECTIVE',
            note: 'Sản phẩm bị lỗi màn hình ngay khi nhận',
            totalRefundAmount: Number(firstItem.unitPrice) * 1,
            deliveredAt,
            items: {
                create: [{
                    orderItemId: firstItem.orderItemId,
                    quantity: 1,
                    unitPrice: firstItem.unitPrice,
                    reason: 'DEFECTIVE',
                }],
            },
            statusLogs: {
                create: [{
                    fromStatus: null,
                    toStatus: 'REQUESTED',
                    changedBy: userId,
                    comment: 'Seeded - Customer created return request',
                }],
            },
        },
        include: { items: true, statusLogs: true },
    }).catch(async () => {
        // upsert trick doesn't work reliably; just create
        return (prisma as any).returnRequest.create({
            data: {
                orderId,
                userId,
                status: 'REQUESTED',
                reason: 'DEFECTIVE',
                note: 'Sản phẩm bị lỗi màn hình ngay khi nhận',
                totalRefundAmount: Number(firstItem.unitPrice) * 1,
                deliveredAt,
                items: {
                    create: [{
                        orderItemId: firstItem.orderItemId,
                        quantity: 1,
                        unitPrice: firstItem.unitPrice,
                        reason: 'DEFECTIVE',
                    }],
                },
                statusLogs: {
                    create: [{
                        fromStatus: null,
                        toStatus: 'REQUESTED',
                        changedBy: userId,
                        comment: 'Seeded - Customer created return request',
                    }],
                },
            },
        });
    });

    console.log('✅ Created REQUESTED return #', requested.returnRequestId);

    // 2. APPROVED return
    const approved = await (prisma as any).returnRequest.create({
        data: {
            orderId,
            userId,
            status: 'APPROVED',
            reason: 'WRONG_ITEM',
            note: 'Nhận được màu khác',
            totalRefundAmount: Number(firstItem.unitPrice) * 1,
            deliveredAt,
            items: {
                create: [{
                    orderItemId: firstItem.orderItemId,
                    quantity: 1,
                    unitPrice: firstItem.unitPrice,
                    reason: 'WRONG_ITEM',
                }],
            },
            statusLogs: {
                create: [
                    { fromStatus: null, toStatus: 'REQUESTED', changedBy: userId, comment: 'Seeded' },
                    { fromStatus: 'REQUESTED', toStatus: 'APPROVED', changedBy: 1, comment: 'Seeded - Approved' },
                ],
            },
        },
    }).catch((e: any) => console.warn('Could not seed APPROVED return:', e.message));

    if (approved) console.log('✅ Created APPROVED return #', approved.returnRequestId);

    // 3. REFUNDED return (full cycle)
    const refunded = await (prisma as any).returnRequest.create({
        data: {
            orderId,
            userId,
            status: 'REFUNDED',
            reason: 'CHANGED_MIND',
            totalRefundAmount: Number(firstItem.unitPrice) * 1,
            deliveredAt,
            items: {
                create: [{
                    orderItemId: firstItem.orderItemId,
                    quantity: 1,
                    unitPrice: firstItem.unitPrice,
                }],
            },
            statusLogs: {
                create: [
                    { fromStatus: null, toStatus: 'REQUESTED', changedBy: userId, comment: 'Seeded' },
                    { fromStatus: 'REQUESTED', toStatus: 'APPROVED', changedBy: 1, comment: 'Seeded' },
                    { fromStatus: 'APPROVED', toStatus: 'RECEIVED', changedBy: 1, comment: 'Seeded' },
                    { fromStatus: 'RECEIVED', toStatus: 'REFUNDED', changedBy: 1, comment: 'Seeded - Refunded via WALLET_CREDIT' },
                ],
            },
            refundTransactions: {
                create: [{
                    amount: Number(firstItem.unitPrice),
                    method: 'WALLET_CREDIT',
                    status: 'COMPLETED',
                    idempotencyKey: `seed-refund-${Date.now()}`,
                    transactionRef: `RF-SEED-${Date.now()}`,
                    processedBy: 1,
                }],
            },
        },
    }).catch((e: any) => console.warn('Could not seed REFUNDED return:', e.message));

    if (refunded) console.log('✅ Created REFUNDED return #', refunded.returnRequestId);

    console.log('🎉 Return order seed complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
