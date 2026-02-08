import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Use HTTPS URLs
});

// Validate configuration on startup
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  Cloudinary credentials not configured. Image uploads will fail.');
    console.warn('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
} else {
    console.log('✓ Cloudinary configured:');
    console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('  API Key:', process.env.CLOUDINARY_API_KEY?.substring(0, 4) + '...');
    console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.substring(process.env.CLOUDINARY_API_SECRET.length - 4) : 'missing');
}

export default cloudinary;
