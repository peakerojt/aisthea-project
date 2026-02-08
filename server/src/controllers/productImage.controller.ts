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

        // Get file from multer
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        // Get product slug for folder naming
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { slug: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Convert to base64
        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        // Extract upload options from body
        const options: ProductVariantUploadOptions = {
            productSku: product.slug, // Use slug as folder identifier
            variantColor: req.body.variantColor,
            category: req.body.category,
            isPrimary: req.body.isPrimary === 'true',
            tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : undefined,
        };

        // Upload to Cloudinary
        const result = await cloudinaryService.uploadProductVariantImage(base64Data, options);

        // Save to database
        const productImage = await (prisma.productImage.create as any)({
            data: {
                productId,
                variantId: req.body.variantId ? Number(req.body.variantId) : null,
                imageUrl: result.secureUrl,
                thumbnailUrl: result.thumbnailUrl,
                isPrimary: options.isPrimary || false,
            },
        });

        res.status(201).json({
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
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload image',
        });
    }
};

/**
 * Upload multiple product images (batch upload)
 * POST /api/products/:productId/images
 */
export const uploadMultipleProductImages = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        // Get files from multer
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No image files provided' });
        }

        // Get product slug for folder naming
        const product = await prisma.product.findUnique({
            where: { productId },
            select: { slug: true }
        });

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Prepare images for batch upload
        const images = files.map((file, index) => ({
            base64Data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            options: {
                productSku: product.slug, // Use slug as folder identifier
                variantColor: req.body.variantColor,
                category: req.body.category,
                isPrimary: index === 0 && req.body.firstAsPrimary === 'true',
                tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : undefined,
            } as ProductVariantUploadOptions,
        }));

        // Batch upload with concurrency control
        const concurrency = Number(req.body.concurrency) || 10;
        const batchResult = await cloudinaryService.uploadProductVariantImages(images, concurrency);

        // Save successful uploads to database
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

        res.status(201).json({
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
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload images',
        });
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

        // Find the image
        const image = await prisma.productImage.findUnique({
            where: { imageId },
        });

        if (!image) {
            return res.status(404).json({ success: false, error: 'Image not found' });
        }

        // Extract and delete from Cloudinary
        const publicId = cloudinaryService.extractPublicId(image.imageUrl);
        if (publicId) {
            await cloudinaryService.deleteImage(publicId);
        }

        // Delete from database
        await prisma.productImage.delete({
            where: { imageId },
        });

        res.json({
            success: true,
            message: 'Image deleted successfully',
        });
    } catch (error: any) {
        console.error('Delete product image error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete image',
        });
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

        res.json({
            success: true,
            data: images,
        });
    } catch (error: any) {
        console.error('Get product images error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch images',
        });
    }
};
