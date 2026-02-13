/**
 * Cloudinary URL Optimization Utility
 * Generates sharp, optimized images for Retina displays
 */

export interface CloudinaryOptions {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:eco' | 'auto:good' | 'auto:best';
    crop?: 'fill' | 'fit' | 'scale' | 'pad' | 'thumb';
    gravity?: 'auto' | 'center' | 'face' | 'faces';
    dpr?: 'auto' | '1.0' | '2.0' | '3.0';
}

/**
 * Optimize Cloudinary URL for Retina displays
 * @param cloudinaryUrl - Original Cloudinary URL
 * @param options - Transformation options
 */
export function optimizeCloudinaryUrl(
    cloudinaryUrl: string,
    options: CloudinaryOptions = {}
): string {
    // Return original if not a Cloudinary URL
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
        return cloudinaryUrl;
    }

    const {
        width,
        height,
        quality = 'auto:good',
        crop = 'fill',
        gravity = 'auto',
        dpr = 'auto'
    } = options;

    // Extract parts from Cloudinary URL
    const uploadIndex = cloudinaryUrl.indexOf('/upload/');
    if (uploadIndex === -1) return cloudinaryUrl;

    const baseUrl = cloudinaryUrl.substring(0, uploadIndex + 8); // Include '/upload/'
    const assetPath = cloudinaryUrl.substring(uploadIndex + 8);

    // Remove existing transformations from assetPath if present
    const cleanAssetPath = assetPath.replace(/^[^/]+\//, '').replace(/^v\d+\//, '');

    // Build transformation string
    const transformations: string[] = ['f_auto', `q_${quality}`, `dpr_${dpr}`];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (crop) transformations.push(`c_${crop}`);
    if (gravity && crop === 'fill') transformations.push(`g_${gravity}`);

    return `${baseUrl}${transformations.join(',')}/${cleanAssetPath}`;
}

/**
 * Get optimized thumbnail URL (600x600 for 300px display)
 */
export function getCloudinaryThumbnail(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 600,
        height: 600,
        quality: 'auto:good',
        crop: 'fill',
        gravity: 'auto'
    });
}

/**
 * Get optimized product card image (600x800 for 300x400 display)
 */
export function getCloudinaryProductCard(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 600,
        height: 800,
        quality: 'auto:good',
        crop: 'fill',
        gravity: 'auto'
    });
}

/**
 * Get optimized full-size product image (1200px for 600px display)
 */
export function getCloudinaryFullSize(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 1200,
        quality: 'auto:best',
        crop: 'scale'
    });
}
