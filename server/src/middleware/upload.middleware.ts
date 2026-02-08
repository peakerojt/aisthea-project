import multer from 'multer';

/**
 * Multer configuration for handling file uploads
 * Files are stored in memory as Buffer for easy base64 conversion
 */

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to only accept images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// Create multer instance with configuration
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
});

/**
 * Convert uploaded file buffer to base64 data URI
 */
export function fileToBase64(file: Express.Multer.File): string {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
}
