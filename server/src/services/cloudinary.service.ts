import cloudinary from '../config/cloudinary.config';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

/**
 * Result from Cloudinary upload operation
 */
export interface CloudinaryUploadResult {
    publicId: string;      // Cloudinary public ID (for deletion)
    url: string;           // Full HTTPS URL to the image
    secureUrl: string;     // Secure HTTPS URL
    format: string;        // Image format (jpg, png, etc.)
    width: number;         // Image width in pixels
    height: number;        // Image height in pixels
    bytes: number;         // File size in bytes
}

export interface UploadOptions {
    folder?: string;          // Folder path in Cloudinary
    transformation?: any;     // Cloudinary transformation options
    maxSizeBytes?: number;    // Maximum file size (default: 5MB)
    allowedFormats?: string[]; // Allowed image formats
}

/**
 * Product variant upload options
 */
export interface ProductVariantUploadOptions {
    productSku: string;       // Product SKU for folder structure
    variantColor?: string;    // Variant color (e.g., "red", "blue")
    category?: string;        // Product category for tagging
    tags?: string[];          // Additional custom tags
    isPrimary?: boolean;      // Is this the primary image for the variant
}

/**
 * Result from product variant image upload
 */
export interface ProductVariantUploadResult extends CloudinaryUploadResult {
    optimizedUrl: string;     // URL with f_auto, q_auto applied
    thumbnailUrl: string;     // 300x300 c_fill thumbnail URL
}

/**
 * Result from batch product variant image upload
 */
export interface ProductVariantBatchResult {
    successful: ProductVariantUploadResult[];
    failed: Array<{ index: number; error: string }>;
    totalUploaded: number;
    totalFailed: number;
}

/**
 * Cloudinary service for image uploads and management
 */
class CloudinaryService {
    private readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
    private readonly DEFAULT_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    /**
     * Upload a base64 image to Cloudinary
     */
    async uploadBase64(
        base64Data: string,
        options: UploadOptions = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            // Validate base64 format
            if (!base64Data.startsWith('data:image/')) {
                throw new Error('Invalid image data. Must be base64 encoded image.');
            }

            // Extract size from base64 string (approximate)
            const sizeBytes = Math.ceil(base64Data.length * 0.75);
            const maxSize = options.maxSizeBytes || this.DEFAULT_MAX_SIZE;

            if (sizeBytes > maxSize) {
                throw new Error(`Image too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
            }

            // Upload to Cloudinary
            const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(
                base64Data,
                {
                    folder: options.folder || 'uploads',
                    transformation: options.transformation,
                    allowed_formats: options.allowedFormats || this.DEFAULT_FORMATS,
                    resource_type: 'image',
                }
            );

            return this.formatUploadResult(uploadResult);
        } catch (error: any) {
            console.error('Cloudinary upload error:', error);
            console.error('Error details:', {
                message: error.message,
                http_code: error.http_code,
                error: error.error,
            });

            if (error.http_code === 400) {
                throw new Error(`Invalid image format. Allowed formats: ${this.DEFAULT_FORMATS.join(', ')}`);
            }

            if (error.http_code === 401) {
                throw new Error('Cloudinary authentication failed. Please check your credentials.');
            }

            throw new Error(error.message || 'Failed to upload image to Cloudinary');
        }
    }

    /**
     * Upload avatar for a specific user
     */
    async uploadAvatar(base64Data: string, userId: number): Promise<CloudinaryUploadResult> {
        return this.uploadBase64(base64Data, {
            folder: 'avatars',
            transformation: {
                width: 500,
                height: 500,
                crop: 'fill',
                gravity: 'face',
                quality: 'auto:good',
                format: 'jpg',
            },
        });
    }

    /**
     * Upload product image (legacy - simple upload)
     */
    async uploadProductImage(base64Data: string, productId: number): Promise<CloudinaryUploadResult> {
        return this.uploadBase64(base64Data, {
            folder: 'products',
            transformation: {
                width: 1200,
                height: 1200,
                crop: 'limit',
                quality: 'auto:good',
            },
        });
    }

    /**
     * Upload product variant image with enhanced features
     * - Dynamic folder structure: products/{sku}/{variantColor}/
     * - Random unique filename for SEO and uniqueness
     * - Auto-tags from metadata
     * - Returns both original and optimized thumbnail URLs
     */
    async uploadProductVariantImage(
        base64Data: string,
        options: ProductVariantUploadOptions
    ): Promise<ProductVariantUploadResult> {
        try {
            // Validate base64 format
            if (!base64Data.startsWith('data:image/')) {
                throw new Error('Invalid image data. Must be base64 encoded image.');
            }

            // Build dynamic folder path
            const folderParts = ['products', options.productSku];
            if (options.variantColor) {
                folderParts.push(options.variantColor.toLowerCase().replace(/\s+/g, '-'));
            }
            const folder = folderParts.join('/');

            // Generate unique filename with timestamp and random string
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 10);
            const publicIdName = `img_${timestamp}_${randomStr}`;

            // Build tags array
            const tags: string[] = ['product'];
            if (options.variantColor) {
                tags.push(`color:${options.variantColor.toLowerCase()}`);
            }
            if (options.category) {
                tags.push(`category:${options.category.toLowerCase()}`);
            }
            if (options.tags) {
                tags.push(...options.tags);
            }
            if (options.isPrimary) {
                tags.push('primary');
            }

            // Upload to Cloudinary with signed upload
            const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(
                base64Data,
                {
                    folder,
                    public_id: publicIdName,
                    tags,
                    resource_type: 'image',
                    allowed_formats: this.DEFAULT_FORMATS,
                    transformation: {
                        quality: 'auto:good',
                        fetch_format: 'auto',
                    },
                    context: {
                        product_sku: options.productSku,
                        variant_color: options.variantColor || '',
                        is_primary: options.isPrimary ? 'true' : 'false',
                    },
                }
            );

            // Generate thumbnail URL with transformations (2x for Retina)
            const thumbnailUrl = this.generateOptimizedUrl(uploadResult.public_id, {
                width: 600,  // 2x for Retina (displays at 300px CSS)
                height: 600,
                crop: 'fill',
                quality: 'auto:good',
                fetchFormat: 'auto',
                dpr: 'auto',  // Critical for Retina displays
            });

            // Generate optimized original URL
            const optimizedUrl = this.generateOptimizedUrl(uploadResult.public_id, {
                quality: 'auto:good',
                fetchFormat: 'auto',
                dpr: 'auto',
            });

            return {
                publicId: uploadResult.public_id,
                url: uploadResult.url,
                secureUrl: uploadResult.secure_url,
                optimizedUrl,
                thumbnailUrl,
                format: uploadResult.format,
                width: uploadResult.width,
                height: uploadResult.height,
                bytes: uploadResult.bytes,
            };
        } catch (error: any) {
            console.error('Product variant image upload error:', error);
            throw new Error(error.message || 'Failed to upload product variant image');
        }
    }

    /**
     * Batch upload multiple product variant images
     * Uses Promise.allSettled for fault tolerance
     */
    async uploadProductVariantImages(
        images: Array<{ base64Data: string; options: ProductVariantUploadOptions }>,
        concurrency: number = 10
    ): Promise<ProductVariantBatchResult> {
        const results: ProductVariantUploadResult[] = [];
        const errors: Array<{ index: number; error: string }> = [];

        // Process in batches for controlled concurrency
        for (let i = 0; i < images.length; i += concurrency) {
            const batch = images.slice(i, i + concurrency);
            const batchResults = await Promise.allSettled(
                batch.map((item, batchIndex) =>
                    this.uploadProductVariantImage(item.base64Data, item.options)
                        .then(result => ({ index: i + batchIndex, result }))
                )
            );

            for (const outcome of batchResults) {
                if (outcome.status === 'fulfilled') {
                    results.push(outcome.value.result);
                } else {
                    const errorIndex = results.length + errors.length;
                    errors.push({
                        index: errorIndex,
                        error: outcome.reason?.message || 'Unknown error',
                    });
                }
            }
        }

        return {
            successful: results,
            failed: errors,
            totalUploaded: results.length,
            totalFailed: errors.length,
        };
    }

    /**
     * Generate optimized URL with transformations
     */
    private generateOptimizedUrl(
        publicId: string,
        options: {
            width?: number;
            height?: number;
            crop?: string;
            quality?: string;
            fetchFormat?: string;
            dpr?: string;  // Add DPR support for Retina
        }
    ): string {
        const transformations: any = {};

        if (options.width) transformations.width = options.width;
        if (options.height) transformations.height = options.height;
        if (options.crop) transformations.crop = options.crop;
        if (options.quality) transformations.quality = options.quality;
        if (options.fetchFormat) transformations.fetch_format = options.fetchFormat;
        if (options.dpr) transformations.dpr = options.dpr;  // Enable DPR for Retina

        return cloudinary.url(publicId, {
            secure: true,
            transformation: transformations,
        });
    }

    /**
     * Upload store profile image
     */
    async uploadStoreImage(base64Data: string, storeId: number): Promise<CloudinaryUploadResult> {
        return this.uploadBase64(base64Data, {
            folder: 'stores',
            transformation: {
                width: 800,
                height: 600,
                crop: 'limit',
                quality: 'auto:good',
            },
        });
    }

    /**
     * Delete an image from Cloudinary by public ID
     */
    async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error: any) {
            console.error('Cloudinary delete error:', error);
            throw new Error('Failed to delete image from Cloudinary');
        }
    }

    /**
     * Extract public ID from Cloudinary URL
     * Example: https://res.cloudinary.com/demo/image/upload/v1234/avatars/user-123.jpg
     * Returns: avatars/user-123
     */
    extractPublicId(cloudinaryUrl: string): string | null {
        try {
            const urlParts = cloudinaryUrl.split('/');
            const uploadIndex = urlParts.indexOf('upload');

            if (uploadIndex === -1) {
                return null;
            }

            // Get everything after 'upload/v{version}/'
            const pathAfterVersion = urlParts.slice(uploadIndex + 2).join('/');

            // Remove file extension
            const publicId = pathAfterVersion.replace(/\.[^/.]+$/, '');

            return publicId;
        } catch (error) {
            console.error('Failed to extract publicId from URL:', cloudinaryUrl);
            return null;
        }
    }

    /**
     * Generate optimized image URL with transformations
     */
    getOptimizedUrl(
        cloudinaryUrl: string,
        width?: number,
        height?: number,
        crop: string = 'fill'
    ): string {
        const publicId = this.extractPublicId(cloudinaryUrl);

        if (!publicId) {
            return cloudinaryUrl; // Return original if not a Cloudinary URL
        }

        return cloudinary.url(publicId, {
            transformation: {
                width,
                height,
                crop,
                quality: 'auto:good',
                fetch_format: 'auto',
                dpr: 'auto',  // Critical for Retina displays
            },
        });
    }

    /**
     * Format Cloudinary upload response
     */
    private formatUploadResult(result: UploadApiResponse): CloudinaryUploadResult {
        return {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
        };
    }
}

export const cloudinaryService = new CloudinaryService();
