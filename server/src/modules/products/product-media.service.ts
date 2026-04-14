import type { Express } from 'express';
import { prisma } from '../../lib/prisma';
import {
  cloudinaryService,
  type ProductVariantUploadOptions,
} from '../../services/cloudinary.service';

type ProductImageBody = Record<string, string | undefined>;
type UploadedProductImage = {
  imageId: number;
  imageUrl: string;
  thumbnailUrl: string;
  publicId: string;
};

const toBase64Data = (file: Express.Multer.File) =>
  `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

const parseTags = (tags?: string) =>
  tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined;

const findVariantIdByAttributeValue = async (productId: number, associatedAttributeValue?: string) => {
  if (!associatedAttributeValue) return null;

  const variant = await prisma.productVariant.findFirst({
    where: {
      productId,
      isDeleted: false,
      variantAttributes: {
        some: {
          value: {
            value: associatedAttributeValue,
          },
        },
      },
    },
    select: { variantId: true },
  });

  return variant?.variantId ?? null;
};

const buildUploadOptions = (
  productSku: string,
  body: ProductImageBody,
  isPrimary = false,
): ProductVariantUploadOptions => ({
  productSku,
  variantColor: body.variantColor,
  category: body.category,
  isPrimary,
  tags: parseTags(body.tags),
});

export const productMediaService = {
  async getProductImages(productId: number) {
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
    });
  },

  async uploadSingleProductImage(productId: number, file: Express.Multer.File, body: ProductImageBody) {
    const product = await prisma.product.findUnique({
      where: { productId },
      select: { slug: true },
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const result = await cloudinaryService.uploadProductVariantImage(
      toBase64Data(file),
      buildUploadOptions(product.slug, body, body.isPrimary === 'true'),
    );

    const variantId =
      (body.variantId ? Number.parseInt(body.variantId, 10) : null) ??
      (await findVariantIdByAttributeValue(productId, body.associatedAttributeValue));

    const productImage = await prisma.productImage.create({
      data: {
        productId,
        variantId,
        imageUrl: result.secureUrl,
        thumbnailUrl: result.thumbnailUrl,
        isPrimary: body.isPrimary === 'true',
      },
    });

    return {
      imageId: productImage.imageId,
      imageUrl: result.secureUrl,
      thumbnailUrl: result.thumbnailUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    };
  },

  async uploadMultipleProductImages(productId: number, files: Express.Multer.File[], body: ProductImageBody) {
    const product = await prisma.product.findUnique({
      where: { productId },
      select: { slug: true },
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const images = files.map((file, index) => ({
      base64Data: toBase64Data(file),
      options: buildUploadOptions(product.slug, body, index === 0 && body.firstAsPrimary === 'true'),
    }));

    const concurrency = Number(body.concurrency) || 5;
    const batchResult = await cloudinaryService.uploadProductVariantImages(images, concurrency);
    const variantId = body.variantId ? Number.parseInt(body.variantId, 10) : null;

    const uploaded: UploadedProductImage[] = [];
    for (const result of batchResult.successful) {
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          variantId,
          imageUrl: result.secureUrl,
          thumbnailUrl: result.thumbnailUrl,
          isPrimary: false,
        },
      });

      uploaded.push({
        imageId: productImage.imageId,
        imageUrl: result.secureUrl,
        thumbnailUrl: result.thumbnailUrl,
        publicId: result.publicId,
      });
    }

    return {
      data: {
        uploaded,
        failed: batchResult.failed,
        summary: {
          totalUploaded: batchResult.totalUploaded,
          totalFailed: batchResult.totalFailed,
        },
      },
    };
  },

  async bulkUploadProductImages(productId: number, files: Express.Multer.File[], body: ProductImageBody) {
    const product = await prisma.product.findUnique({
      where: { productId },
      select: { slug: true },
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const uploadPayloads = files.map((file) => ({
      base64Data: toBase64Data(file),
      options: buildUploadOptions(product.slug, body, false),
    }));

    const settledResults = await Promise.allSettled(
      uploadPayloads.map(({ base64Data, options }) =>
        cloudinaryService.uploadProductVariantImage(base64Data, options),
      ),
    );

    const uploaded: UploadedProductImage[] = [];
    const failed: Array<{ index: number; error: string }> = [];
    const variantId = body.variantId ? Number.parseInt(body.variantId, 10) : null;

    await Promise.allSettled(
      settledResults.map(async (outcome, index) => {
        if (outcome.status === 'fulfilled') {
          try {
            const productImage = await prisma.productImage.create({
              data: {
                productId,
                variantId,
                imageUrl: outcome.value.secureUrl,
                thumbnailUrl: outcome.value.thumbnailUrl,
                isPrimary: false,
              },
            });

            uploaded.push({
              imageId: productImage.imageId,
              imageUrl: outcome.value.secureUrl,
              thumbnailUrl: outcome.value.thumbnailUrl,
              publicId: outcome.value.publicId,
            });
          } catch (error) {
            failed.push({
              index,
              error: error instanceof Error ? error.message : 'DB_SAVE_FAILED',
            });
          }
        } else {
          failed.push({
            index,
            error: outcome.reason instanceof Error ? outcome.reason.message : 'UPLOAD_FAILED',
          });
        }
      }),
    );

    return {
      data: {
        uploaded,
        failed,
        summary: {
          totalUploaded: uploaded.length,
          totalFailed: failed.length,
        },
      },
    };
  },

  async setPrimaryImage(productId: number, imageId: number) {
    const image = await prisma.productImage.findFirst({
      where: { imageId, productId },
    });

    if (!image) {
      throw new Error('IMAGE_NOT_FOUND_FOR_PRODUCT');
    }

    const [, updatedImage] = await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { imageId },
        data: { isPrimary: true },
      }),
    ]);

    return updatedImage;
  },

  async deleteProductImage(imageId: number) {
    const image = await prisma.productImage.findUnique({ where: { imageId } });
    if (!image) {
      throw new Error('IMAGE_NOT_FOUND');
    }

    const publicId = cloudinaryService.extractPublicId(image.imageUrl);
    if (publicId) {
      await cloudinaryService.deleteImage(publicId);
    }

    await prisma.productImage.delete({ where: { imageId } });
  },
};
