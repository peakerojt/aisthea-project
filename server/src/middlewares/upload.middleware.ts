import multer from 'multer';

/**
 * Multer configuration for handling file uploads
 * Files are stored in memory as Buffer for easy base64 conversion
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to only accept specific image types (not generic image/*)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Only image files are allowed (jpeg, png, webp, gif). Received: ${file.mimetype}`));
    }
};

// File filter for Excel / CSV uploads
const excelFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel',  // .xls
        'text/csv',
        'application/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file Excel (.xlsx) hoặc CSV (.csv)'));
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

// Multer instance for Excel / CSV file imports (up to 50 MB)
export const uploadExcel = multer({
    storage,
    fileFilter: excelFileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
    },
});

/**
 * Convert uploaded file buffer to base64 data URI
 */
export function fileToBase64(file: Express.Multer.File): string {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
}
