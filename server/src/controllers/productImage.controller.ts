import { Request, Response } from 'express';
import { cloudinaryService, ProductVariantUploadOptions } from '../services/cloudinary.service';
import { prisma } from '../utils/prisma';

/**
 * Upload single product image
 * POST /api/products/:productId/image
 */
export const uploadSingleProductImage = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        const product = await prisma.product.findUnique({
            where: { productId },
            select: { slug: true },
        });
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const options: ProductVariantUploadOptions = {
            productSku: product.slug,
            variantColor: req.body.variantColor,
            category: req.body.category,
            isPrimary: req.body.isPrimary === 'true',
            tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : undefined,
        };

        const result = await cloudinaryService.uploadProductVariantImage(base64Data, options);

        const productImage = await (prisma.productImage.create as any)({
            data: {
                productId,
                variantId: req.body.variantId ? Number(req.body.variantId) : null,
                imageUrl: result.secureUrl,
                thumbnailUrl: result.thumbnailUrl,
                isPrimary: options.isPrimary || false,
            },
        });

        return res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                imageId: productImage.imageId,
                imageUrl: result.optimizedUrl,
                thumbnailUrl: result.thumbnailUrl,
                publicId: result.publicId,
                width: result.width,
                height: result.height,
            },
        });
    } catch (error: any) {
        console.error('Upload product image error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to upload image' });
    }
};

/**
 * Bulk upload product images with concurrency via Promise.allSettled
 * POST /api/products/:id/images/bulk
 *
 * Accepts: multipart/form-data with field "files" (multiple)
 * Optional body fields: variantId, variantColor, category, firstAsPrimary
 */
export const bulkUploadProductImages = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.id);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No image files provided' });
        }

        const product = await prisma.product.findUnique({
            where: { productId },
            select: { slug: true },
        });
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Map files to upload payloads
        const uploadPayloads = files.map((file, index) => ({
            base64Data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            options: {
                productSku: product.slug,
                variantColor: req.body.variantColor,
                category: req.body.category,
                isPrimary: false,
                tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : undefined,
            } as ProductVariantUploadOptions,
        }));

        // Concurrent upload via Promise.allSettled — one failure won't abort others
        const settledResults = await Promise.allSettled(
            uploadPayloads.map(({ base64Data, options }) =>
                cloudinaryService.uploadProductVariantImage(base64Data, options)
            )
        );

        // Persist successful uploads to DB
        const savedImages: any[] = [];
        const failedIndexes: Array<{ index: number; error: string }> = [];

        await Promise.allSettled(
            settledResults.map(async (outcome, index) => {
                if (outcome.status === 'fulfilled') {
                    const result = outcome.value;
                    try {
                        const productImage = await (prisma.productImage.create as any)({
                            data: {
                                productId,
                                variantId: req.body.variantId ? Number(req.body.variantId) : null,
                                imageUrl: result.secureUrl,
                                thumbnailUrl: result.thumbnailUrl,
                                isPrimary: false,
                            },
                        });
                        savedImages.push({
                            imageId: productImage.imageId,
                            imageUrl: result.optimizedUrl,
                            thumbnailUrl: result.thumbnailUrl,
                            publicId: result.publicId,
                        });
                    } catch (dbError: any) {
                        failedIndexes.push({ index, error: dbError.message || 'DB save failed' });
                    }
                } else {
                    failedIndexes.push({
                        index,
                        error: outcome.reason?.message || 'Upload failed',
                    });
                }
            })
        );

        return res.status(201).json({
            success: true,
            message: `Tải lên ${savedImages.length} ảnh thành công${failedIndexes.length > 0 ? `, ${failedIndexes.length} thất bại` : ''}`,
            data: {
                uploaded: savedImages,
                failed: failedIndexes,
                summary: {
                    totalUploaded: savedImages.length,
                    totalFailed: failedIndexes.length,
                },
            },
        });
    } catch (error: any) {
        console.error('Bulk upload product images error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to upload images' });
    }
};

/**
 * Upload multiple product images (legacy batch)
 * POST /api/products/:productId/images
 */
export const uploadMultipleProductImages = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No image files provided' });
        }

        const product = await prisma.product.findUnique({
            where: { productId },
            select: { slug: true },
        });
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const images = files.map((file, index) => ({
            base64Data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            options: {
                productSku: product.slug,
                variantColor: req.body.variantColor,
                category: req.body.category,
                isPrimary: index === 0 && req.body.firstAsPrimary === 'true',
                tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : undefined,
            } as ProductVariantUploadOptions,
        }));

        const concurrency = Number(req.body.concurrency) || 5;
        const batchResult = await cloudinaryService.uploadProductVariantImages(images, concurrency);

        const savedImages = [];
        for (const result of batchResult.successful) {
            const productImage = await (prisma.productImage.create as any)({
                data: {
                    productId,
                    variantId: req.body.variantId ? Number(req.body.variantId) : null,
                    imageUrl: result.secureUrl,
                    thumbnailUrl: result.thumbnailUrl,
                    isPrimary: false,
                },
            });
            savedImages.push({
                imageId: productImage.imageId,
                imageUrl: result.optimizedUrl,
                thumbnailUrl: result.thumbnailUrl,
                publicId: result.publicId,
            });
        }

        return res.status(201).json({
            success: true,
            message: `Uploaded ${batchResult.totalUploaded} images, ${batchResult.totalFailed} failed`,
            data: {
                uploaded: savedImages,
                failed: batchResult.failed,
                summary: {
                    totalUploaded: batchResult.totalUploaded,
                    totalFailed: batchResult.totalFailed,
                },
            },
        });
    } catch (error: any) {
        console.error('Batch upload product images error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to upload images' });
    }
};

/**
 * Set a product image as the primary (cover) image — transactional
 * PATCH /api/products/:id/images/:imageId/primary
 *
 * Uses prisma.$transaction to atomically:
 *   1. Set isPrimary = false for ALL images of this product
 *   2. Set isPrimary = true for the selected imageId
 */
export const setPrimaryImage = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.id);
        const imageId = Number(req.params.imageId);

        if (isNaN(productId) || isNaN(imageId)) {
            return res.status(400).json({ success: false, error: 'Invalid product or image ID' });
        }

        // Verify the image belongs to this product
        const image = await (prisma.productImage.findFirst as any)({
            where: { imageId, productId },
        });
        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found for this product' });
        }

        // Atomic transaction: reset all → set target
        const [, updatedImage] = await prisma.$transaction([
            // Step 1: Unset all primaries for this product
            (prisma.productImage.updateMany as any)({
                where: { productId },
                data: { isPrimary: false },
            }),
            // Step 2: Set the selected image as primary
            (prisma.productImage.update as any)({
                where: { imageId },
                data: { isPrimary: true },
            }),
        ]);

        return res.json({
            success: true,
            message: 'Đã cập nhật ảnh bìa thành công',
            data: updatedImage,
        });
    } catch (error: any) {
        console.error('Set primary image error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to set primary image' });
    }
};

/**
 * Delete a product image
 * DELETE /api/products/images/:imageId
 */
export const deleteProductImage = async (req: Request, res: Response) => {
    try {
        const imageId = Number(req.params.imageId);
        if (isNaN(imageId)) {
            return res.status(400).json({ success: false, error: 'Invalid image ID' });
        }

        const image = await prisma.productImage.findUnique({ where: { imageId } });
        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }

        // Delete from Cloudinary
        const publicId = cloudinaryService.extractPublicId(image.imageUrl);
        if (publicId) {
            await cloudinaryService.deleteImage(publicId);
        }

        await prisma.productImage.delete({ where: { imageId } });

        return res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error: any) {
        console.error('Delete product image error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete image' });
    }
};

/**
 * Get all images for a product
 * GET /api/products/:productId/images
 */
export const getProductImages = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        const images = await prisma.productImage.findMany({
            where: { productId },
            orderBy: [
                { isPrimary: 'desc' },
                { imageId: 'asc' },
            ],
        });

        return res.json({ success: true, data: images });
    } catch (error: any) {
        console.error('Get product images error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch images' });
    }
};
