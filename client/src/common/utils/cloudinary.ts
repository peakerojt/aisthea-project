/**
 * Cloudinary URL Optimization Utility
 *
 * Handles two URL formats from the database:
 *   Clean:       .../upload/aisthea_products_2026/1_1.jpg
 *   Pre-transformed: .../upload/c_fill,w_300,h_300/aisthea_products_2026/1_1.jpg
 */

export interface CloudinaryOptions {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:eco' | 'auto:good' | 'auto:best';
    crop?: 'fill' | 'fit' | 'scale' | 'pad' | 'thumb' | 'limit';
    gravity?: 'auto' | 'center' | 'face' | 'faces' | 'north' | 'south';
    dpr?: 'auto' | '1.0' | '2.0' | '3.0';
    sharpen?: boolean;
}

const GOOGLE_HOSTED_IMAGE_PATTERN = /(^|\.)googleusercontent\.com$/i;

/**
 * Strips existing Cloudinary transformation segments from the asset path.
 *
 * A transformation segment is a slash-delimited part that contains Cloudinary
 * parameter patterns like `c_`, `w_`, `h_`, `f_`, `q_`, `e_`, `g_`, `dpr_`.
 * Folder names like `aisthea_products_2026` do NOT match this pattern.
 *
 * Examples:
 *   "c_fill,w_300,h_300/aisthea_products_2026/1_1.jpg"
 *     → "aisthea_products_2026/1_1.jpg"
 *   "aisthea_products_2026/1_1.jpg"
 *     → "aisthea_products_2026/1_1.jpg"  (unchanged)
 */
function stripTransformations(assetPath: string): string {
    // Match leading segments that look like Cloudinary transformations.
    // A transformation segment contains params like: c_fill, w_300, h_300, f_auto, q_auto, e_sharpen, dpr_2
    // Pattern: one or more comma-separated tokens of the form [a-z]+_[a-zA-Z0-9.:]+
    const transformPattern = /^(?:[a-z]+_[a-zA-Z0-9.:]+(?:,[a-z]+_[a-zA-Z0-9.:]+)*\/)+/;
    return assetPath.replace(transformPattern, '');
}

/**
 * Optimize a Cloudinary URL with the given transformation options.
 */
export function optimizeCloudinaryUrl(
    cloudinaryUrl: string,
    options: CloudinaryOptions = {}
): string {
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
        return cloudinaryUrl;
    }

    const {
        width,
        height,
        quality = 'auto:best',
        crop = 'fill',
        gravity = 'center',
        dpr = '2.0',
        sharpen = true,
    } = options;

    const uploadIndex = cloudinaryUrl.indexOf('/upload/');
    if (uploadIndex === -1) return cloudinaryUrl;

    const baseUrl = cloudinaryUrl.substring(0, uploadIndex + 8); // includes '/upload/'
    const rawAssetPath = cloudinaryUrl.substring(uploadIndex + 8);
    const cleanAssetPath = stripTransformations(rawAssetPath);

    // Build transformation string
    const t: string[] = ['f_auto', `q_${quality}`, `dpr_${dpr}`];
    if (width) t.push(`w_${width}`);
    if (height) t.push(`h_${height}`);
    if (crop) t.push(`c_${crop}`);
    if (gravity) t.push(`g_${gravity}`);
    if (sharpen) t.push('e_sharpen:80');

    return `${baseUrl}${t.join(',')}/${cleanAssetPath}`;
}

function normalizeGoogleHostedImageUrl(imageUrl: string): string {
    try {
        const parsed = new URL(imageUrl);
        if (!GOOGLE_HOSTED_IMAGE_PATTERN.test(parsed.hostname)) {
            return imageUrl;
        }

        const normalizedPath = parsed.pathname.replace(/=s\d+(?:-[a-z0-9-]+)?$/i, '=s256-c');
        if (normalizedPath !== parsed.pathname) {
            parsed.pathname = normalizedPath;
            return parsed.toString();
        }

        parsed.searchParams.set('sz', '256');
        return parsed.toString();
    } catch {
        return imageUrl;
    }
}

/**
 * Product card thumbnail — 800×800 square @ 2× retina.
 * Uses c_fill + g_north to keep the top (collar area) of garments.
 */
export function getCloudinaryProductCard(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 800,
        height: 800,
        quality: 'auto:best',
        crop: 'fill',
        gravity: 'north',
        dpr: '2.0',
        sharpen: true,
    });
}

/**
 * Small thumbnail (used in cart, search results, etc.)
 */
export function getCloudinaryThumbnail(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 600,
        height: 600,
        quality: 'auto:best',
        crop: 'fill',
        gravity: 'north',
        sharpen: true,
    });
}

/**
 * Full-size product image (product detail page)
 */
export function getCloudinaryFullSize(cloudinaryUrl: string): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width: 1200,
        quality: 'auto:best',
        crop: 'limit',
        sharpen: true,
    });
}

/**
 * QR / document-like images should keep full content visible.
 */
export function getCloudinaryQrImage(cloudinaryUrl: string, width: number = 900, height: number = 900): string {
    return optimizeCloudinaryUrl(cloudinaryUrl, {
        width,
        height,
        quality: 'auto:best',
        crop: 'limit',
        gravity: 'center',
        dpr: 'auto',
        sharpen: false,
    });
}

/**
 * Generic image url alias
 */
export function getImageUrl(imageUrl: string): string {
    if (!imageUrl) return imageUrl;
    try {
        if (GOOGLE_HOSTED_IMAGE_PATTERN.test(new URL(imageUrl).hostname)) {
            return normalizeGoogleHostedImageUrl(imageUrl);
        }
    } catch {
        return imageUrl;
    }
    return optimizeCloudinaryUrl(imageUrl);
}
