import type { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../middlewares/error.middleware';
import { cloudinaryService } from '../../services/cloudinary.service';
import { productRepository, ProductFilter } from './product.repository';
import type { CreateProductDto, UpdateProductDto } from './product.validator';

type VariantAttributeInput = {
  attributeValues: Array<{ attributeName: string; value: string }>;
};

type AttributeLookup = Map<
  string,
  {
    attributeId: number;
    valueIds: Map<string, number>;
  }
>;

const resolveAttributes = async (
  variants: VariantAttributeInput[],
  tx: Prisma.TransactionClient,
): Promise<AttributeLookup> => {
  const valuesByAttribute = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const attributeValue of variant.attributeValues) {
      const values = valuesByAttribute.get(attributeValue.attributeName) ?? new Set<string>();
      values.add(attributeValue.value);
      valuesByAttribute.set(attributeValue.attributeName, values);
    }
  }

  const lookup: AttributeLookup = new Map();

  for (const [attributeName, valuesSet] of valuesByAttribute.entries()) {
    const attribute = await productRepository.resolveAttribute(attributeName, tx);
    const values = Array.from(valuesSet);

    const existingValues = await productRepository.findAttributeValues(
      attribute.attributeId,
      values,
      tx,
    );

    const valueIds = new Map<string, number>(
      existingValues.map((entry) => [entry.value, entry.valueId]),
    );

    const missingValues = values.filter((value) => !valueIds.has(value));
    if (missingValues.length > 0) {
      await productRepository.createAttributeValues(attribute.attributeId, missingValues, tx);
      const createdValues = await productRepository.findAttributeValues(
        attribute.attributeId,
        missingValues,
        tx,
      );
      for (const entry of createdValues) {
        valueIds.set(entry.value, entry.valueId);
      }
    }

    lookup.set(attributeName, {
      attributeId: attribute.attributeId,
      valueIds,
    });
  }

  return lookup;
};

const toVariantAttributeRows = (
  variantId: number,
  attributeValues: Array<{ attributeName: string; value: string }>,
  lookup: AttributeLookup,
) => {
  return attributeValues.map(({ attributeName, value }) => {
    const attribute = lookup.get(attributeName);
    const valueId = attribute?.valueIds.get(value);

    if (!attribute || !valueId) {
      throw new AppError(
        400,
        'INVALID_VARIANT_ATTRIBUTE',
        'products:errors.invalidAttribute',
        { attributeName, value },
      );
    }

    return { variantId, valueId };
  });
};

const resolveDefaultVariantIndex = (
  variants: Array<{ isDefault?: boolean }>,
): number => {
  if (variants.length === 0) return 0;

  const explicitDefaultIndex = variants.findIndex((variant) => variant.isDefault === true);
  return explicitDefaultIndex >= 0 ? explicitDefaultIndex : 0;
};

export const productService = {
  async getProducts(filters: ProductFilter) {
    return productRepository.findMany(filters);
  },

  async getProductById(id: number) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
    }
    return product;
  },

  async getProductForEdit(id: number) {
    const product = await productRepository.findByIdForEdit(id);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
    }
    return product;
  },

  async createProduct(payload: CreateProductDto) {
    return prisma.$transaction(async (tx) => {
      const defaultVariantIndex = resolveDefaultVariantIndex(payload.variants);

      const product = await tx.product.create({
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          basePrice: payload.basePrice,
          categoryId: payload.categoryId,
          brandId: payload.brandId ?? null,
          status: payload.status ?? 'Active',
        },
      });

      const lookup = await resolveAttributes(payload.variants, tx);

      for (let index = 0; index < payload.variants.length; index += 1) {
        const variant = payload.variants[index];

        const createdVariant = await tx.productVariant.create({
          data: {
            productId: product.productId,
            sku: variant.sku,
            price: variant.price,
            stockQuantity: variant.stockQuantity,
            isDefault: index === defaultVariantIndex,
          },
        });

        const variantAttributes = toVariantAttributeRows(
          createdVariant.variantId,
          variant.attributeValues,
          lookup,
        );

        if (variantAttributes.length > 0) {
          await tx.variantAttribute.createMany({ data: variantAttributes });
        }
      }

      if ((payload.images ?? []).length > 0) {
        await tx.productImage.createMany({
          data: payload.images.map((image, index) => ({
            productId: product.productId,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl,
            isPrimary: image.isPrimary ?? index === 0,
          })),
        });
      }

      return {
        productId: product.productId,
        slug: product.slug,
        variantCount: payload.variants.length,
      };
    });
  },

  async updateProduct(productId: number, payload: UpdateProductDto) {
    return prisma.$transaction(async (tx) => {
      const defaultVariantIndex = resolveDefaultVariantIndex(payload.variants);

      await tx.product.update({
        where: { productId },
        data: {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          basePrice: payload.basePrice,
          categoryId: payload.categoryId,
          brandId: payload.brandId ?? null,
          status: payload.status ?? 'Active',
        },
      });

      if (payload.deletedImageIds.length > 0) {
        await tx.productImage.deleteMany({
          where: { imageId: { in: payload.deletedImageIds }, productId },
        });
      }

      if (payload.primaryImageId !== undefined) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });

        await tx.productImage.updateMany({
          where: { productId, imageId: payload.primaryImageId },
          data: { isPrimary: true },
        });
      }

      if (payload.newImages.length > 0) {
        await tx.productImage.createMany({
          data: payload.newImages.map((image) => ({
            productId,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl,
            isPrimary: image.isPrimary ?? false,
          })),
        });
      }

      const softDeleteWhere =
        payload.keptVariantIds.length > 0
          ? { productId, variantId: { notIn: payload.keptVariantIds }, isDeleted: false }
          : { productId, isDeleted: false };

      await tx.productVariant.updateMany({
        where: softDeleteWhere,
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const lookup = await resolveAttributes(payload.variants, tx);

      for (let index = 0; index < payload.variants.length; index += 1) {
        const variant = payload.variants[index];
        let variantId: number;

        if (variant.variantId) {
          await tx.productVariant.update({
            where: { variantId: variant.variantId },
            data: {
              sku: variant.sku,
              price: variant.price,
              stockQuantity: variant.stockQuantity,
              isDefault: index === defaultVariantIndex,
              isDeleted: false,
              deletedAt: null,
            },
          });

          await tx.variantAttribute.deleteMany({ where: { variantId: variant.variantId } });
          variantId = variant.variantId;
        } else {
          const createdVariant = await tx.productVariant.create({
            data: {
              productId,
              sku: variant.sku,
              price: variant.price,
              stockQuantity: variant.stockQuantity,
              isDefault: index === defaultVariantIndex,
            },
          });
          variantId = createdVariant.variantId;
        }

        const variantAttributes = toVariantAttributeRows(
          variantId,
          variant.attributeValues,
          lookup,
        );

        if (variantAttributes.length > 0) {
          await tx.variantAttribute.createMany({ data: variantAttributes });
        }
      }

      return {
        productId,
        variantCount: payload.variants.length,
      };
    });
  },

  async deleteProduct(id: number) {
    const product = await productRepository.findActiveWithDeleteRelations(id);

    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
    }

    const variantIds = product.variants.map((variant) => variant.variantId);
    const orderCount = await productRepository.countOrderItemsByVariantIds(variantIds);

    if (orderCount > 0) {
      await productRepository.softDelete(id);
      return {
        mode: 'archived' as const,
        message: 'Product archived - existing orders found.',
      };
    }

    const imageUrls = product.images.map((image) => image.imageUrl);
    await productRepository.hardDelete(id, variantIds);

    setImmediate(async () => {
      await Promise.all(
        imageUrls.map(async (url) => {
          const publicId = cloudinaryService.extractPublicId(url);
          if (!publicId) return;

          try {
            await cloudinaryService.deleteImage(publicId);
          } catch (error) {
            logger.warn('[productService] Cloudinary cleanup failed', { publicId, error });
          }
        }),
      );
    });

    return {
      mode: 'deleted' as const,
      message: `Product deleted with ${imageUrls.length} image(s).`,
    };
  },
};
