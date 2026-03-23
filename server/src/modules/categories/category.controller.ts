import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';

export const categoryController = {
  getTree: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tree = await categoryService.getTree();
      res.json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  },

  getFlat: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await categoryService.getFlat();
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, code: 'CATEGORY_CREATED', data: category });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_CATEGORY_ID' });
      }

      const category = await categoryService.update(id, req.body);
      res.json({ success: true, code: 'CATEGORY_UPDATED', data: category });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, errorCode: 'INVALID_CATEGORY_ID' });
      }

      await categoryService.delete(id);
      res.json({ success: true, code: 'CATEGORY_DELETED' });
    } catch (error) {
      next(error);
    }
  },

  uploadImage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, errorCode: 'NO_CATEGORY_FILE' });
      }

      const result = await categoryService.uploadImage(req.file);
      res.status(201).json({
        success: true,
        code: 'CATEGORY_IMAGE_UPLOADED',
        data: { imageUrl: result.secureUrl, optimizedUrl: result.optimizedUrl },
      });
    } catch (error) {
      next(error);
    }
  },
};
