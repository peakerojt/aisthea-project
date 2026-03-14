import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import { logger } from '../lib/logger';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary credentials not configured. Image uploads will fail.');
} else {
    logger.info('Cloudinary configured', {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY?.substring(0, 4) + '...',
    });
}

export default cloudinary;
