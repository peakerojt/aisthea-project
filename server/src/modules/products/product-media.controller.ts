import { Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { productMediaService } from './product-media.service';

const parseId = (rawValue: string) => Number.parseInt(rawValue, 10);

const getFiles = (req: Request) => req.files as Express.Multer.File[] | undefined;

const getBody = (req: Request) => req.body as Record<string, string | undefined>;

export const productMediaController = {
  getProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, error: 'Invalid product ID' });
      }

      const images = await productMediaService.getProductImages(productId);
      return res.json({ success: true, data: images });
    } catch (error: unknown) {
      logger.error('[productMediaController] getProductImages failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to fetch images';
      return res.status(500).json({ success: false, error: message });
    }
  },

  uploadSingleProductImage: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, error: 'Invalid product ID' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const result = await productMediaService.uploadSingleProductImage(productId, req.file, getBody(req));
      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result,
      });
    } catch (error: unknown) {
      logger.error('[productMediaController] uploadSingleProductImage failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      const status = message === 'Product not found' ? 404 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  },

  uploadMultipleProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.productId as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, error: 'Invalid product ID' });
      }

      const files = getFiles(req);
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No image files provided' });
      }

      const result = await productMediaService.uploadMultipleProductImages(productId, files, getBody(req));
      return res.status(201).json({ success: true, ...result });
    } catch (error: unknown) {
      logger.error('[productMediaController] uploadMultipleProductImages failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to upload images';
      const status = message === 'Product not found' ? 404 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  },

  bulkUploadProductImages: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.id as string);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ success: false, error: 'Invalid product ID' });
      }

      const files = getFiles(req);
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No image files provided' });
      }

      const result = await productMediaService.bulkUploadProductImages(productId, files, getBody(req));
      return res.status(201).json({ success: true, ...result });
    } catch (error: unknown) {
      logger.error('[productMediaController] bulkUploadProductImages failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to upload images';
      const status = message === 'Product not found' ? 404 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  },

  setPrimaryImage: async (req: Request, res: Response) => {
    try {
      const productId = parseId(req.params.id as string);
      const imageId = parseId(req.params.imageId as string);
      if (Number.isNaN(productId) || Number.isNaN(imageId)) {
        return res.status(400).json({ success: false, error: 'Invalid product or image ID' });
      }

      const updatedImage = await productMediaService.setPrimaryImage(productId, imageId);
      return res.json({
        success: true,
        message: 'Đã cập nhật ảnh bìa thành công',
        data: updatedImage,
      });
    } catch (error: unknown) {
      logger.error('[productMediaController] setPrimaryImage failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to set primary image';
      const status = message === 'Image not found for this product' ? 404 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  },

  deleteProductImage: async (req: Request, res: Response) => {
    try {
      const imageId = parseId(req.params.imageId as string);
      if (Number.isNaN(imageId)) {
        return res.status(400).json({ success: false, error: 'Invalid image ID' });
      }

      await productMediaService.deleteProductImage(imageId);
      return res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error: unknown) {
      logger.error('[productMediaController] deleteProductImage failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to delete image';
      const status = message === 'Image not found' ? 404 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  },
};
