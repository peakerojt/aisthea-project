/**
 * Image Compression Utility
 * Uses browser-image-compression for client-side image optimization before upload
 */
import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    /** Maximum file size in MB (default: 1) */
    maxSizeMB?: number;
    /** Maximum width or height in pixels (default: 1500) */
    maxWidthOrHeight?: number;
    /** Use web worker for compression (default: true) */
    useWebWorker?: boolean;
    /** Initial quality (0-1, default: 0.8) */
    initialQuality?: number;
}

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1500,
    useWebWorker: true,
    initialQuality: 0.8,
};

/**
 * Compress a single image file
 * Maintains aspect ratio and EXIF orientation
 */
export async function compressImage(
    file: File,
    options?: CompressionOptions
): Promise<CompressionResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const originalSize = file.size;

    // Skip compression if already under limit
    if (originalSize <= (mergedOptions.maxSizeMB! * 1024 * 1024)) {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
        };
    }

    try {
        const compressedFile = await imageCompression(file, {
            maxSizeMB: mergedOptions.maxSizeMB!,
            maxWidthOrHeight: mergedOptions.maxWidthOrHeight!,
            useWebWorker: mergedOptions.useWebWorker!,
            initialQuality: mergedOptions.initialQuality!,
            preserveExif: true,
        });

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            compressionRatio: originalSize / compressedFile.size,
        };
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return original file if compression fails
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
        };
    }
}

/**
 * Compress multiple images with controlled concurrency
 */
export async function compressImages(
    files: File[],
    options?: CompressionOptions,
    concurrency: number = 3
): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    // Process in batches for controlled concurrency
    for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(file => compressImage(file, options))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Convert File to base64 data URI for upload
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validate if file is an acceptable image type
 */
export function isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
}

/**
 * Get image dimensions from File
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
