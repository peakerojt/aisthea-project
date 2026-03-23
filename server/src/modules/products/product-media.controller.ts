import { Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { productMediaService } from './product-media.service';

const parseId = (rawValue: string) => Number.parseInt(rawValue, 10);

const getFiles = (req: Request) => req.files as Express.Multer.File[] | undefined;

const getBody = (req: Request) => req.body as Record<string, string | undefined>;

const productMediaErrorMap: Record<string, { status: number; code: string }> = {
  PRODUCT_NOT_FOUND: { status: 404, code: 'PRODUCT_NOT_FOUND' },
  IMAGE_NOT_FOUND_FOR_PRODUCT: { status: 404, code: 'IMAGE_NOT_FOUND_FOR_PRODUCT' },
  IMAGE_NOT_FOUND: { status: 404, code: 'IMAGE_NOT_FOUND' },
};

const sendMappedError = (res: Response, error: unknown, fallbackCode: string) => {
  const code = error instanceof Error ? error.message : '';
  const mapped = productMediaErrorMap[code];

  if (mapped) {
    return res.status(mapped.status).json({ success: false, errorCode: mapped.code });
  }

  return res.status(500).json({ success: false, errorCode: fallbackCode });
};

export const productMediaController = {
  getProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_ID' });
      }

      const images = await productMediaService.getProductImages(productId);
      return res.json({ success: true, data: images });
    } catch (error: unknown) {
      logger.error('[productMediaController] getProductImages failed', { error });
      return sendMappedError(res, error, 'FETCH_PRODUCT_IMAGES_FAILED');
    }
  },

  uploadSingleProductImage: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_ID' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, errorCode: 'NO_IMAGE_FILE' });
      }

      const result = await productMediaService.uploadSingleProductImage(productId, req.file, getBody(req));
      return res.status(201).json({
        success: true,
        code: 'PRODUCT_IMAGE_UPLOADED',
        data: result,
      });
    } catch (error: unknown) {
      logger.error('[productMediaController] uploadSingleProductImage failed', { error });
      return sendMappedError(res, error, 'PRODUCT_IMAGE_UPLOAD_FAILED');
    }
  },

  uploadMultipleProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_ID' });
      }

      const files = getFiles(req);
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, errorCode: 'NO_IMAGE_FILES' });
      }

      const result = await productMediaService.uploadMultipleProductImages(productId, files, getBody(req));
      return res.status(201).json({ success: true, code: 'PRODUCT_IMAGE_UPLOADED', ...result });
    } catch (error: unknown) {
      logger.error('[productMediaController] uploadMultipleProductImages failed', { error });
      return sendMappedError(res, error, 'PRODUCT_IMAGES_UPLOAD_FAILED');
    }
  },

  bulkUploadProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.id as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_ID' });
      }

      const files = getFiles(req);
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, errorCode: 'NO_IMAGE_FILES' });
      }

      const result = await productMediaService.bulkUploadProductImages(productId, files, getBody(req));
      return res.status(201).json({ success: true, code: 'PRODUCT_IMAGE_UPLOADED', ...result });
    } catch (error: unknown) {
      logger.error('[productMediaController] bulkUploadProductImages failed', { error });
      return sendMappedError(res, error, 'PRODUCT_IMAGES_UPLOAD_FAILED');
    }
  },

  setPrimaryImage: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.id as string);
      const imageId = parseId(req.params.imageId as string);
      if (Number.isNaN(productId) || Number.isNaN(imageId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_PRODUCT_OR_IMAGE_ID' });
      }

      const updatedImage = await productMediaService.setPrimaryImage(productId, imageId);
      return res.json({
        success: true,
        code: 'PRIMARY_IMAGE_UPDATED',
        data: updatedImage,
      });
    } catch (error: unknown) {
      logger.error('[productMediaController] setPrimaryImage failed', { error });
      return sendMappedError(res, error, 'PRODUCT_IMAGE_SET_PRIMARY_FAILED');
    }
  },

  deleteProductImage: async (req: Request, res: Response) => {
    try {
      const imageId = parseId(req.params.imageId as string);
      if (Number.isNaN(imageId)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_IMAGE_ID' });
      }

      await productMediaService.deleteProductImage(imageId);
      return res.json({ success: true, code: 'PRODUCT_IMAGE_DELETED' });
    } catch (error: unknown) {
      logger.error('[productMediaController] deleteProductImage failed', { error });
      return sendMappedError(res, error, 'DELETE_IMAGE_FAILED');
    }
  },
};
