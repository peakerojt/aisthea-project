import { trackingRepository } from './modules/tracking/tracking.repository';
import { prisma } from './utils/prisma';

async function run() {
    console.log('Testing findOrderTrackingById(13)...');
    try {
        const result = await trackingRepository.findOrderTrackingById(13);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
