import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';

export const categoryController = {
    getTree: async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const tree = await categoryService.getTree();
            res.json({ success: true, data: tree, message: 'OK' });
        } catch (err) { next(err); }
    },

    getFlat: async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const cats = await categoryService.getFlat();
            res.json({ success: true, data: cats, message: 'OK' });
        } catch (err) { next(err); }
    },

    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const category = await categoryService.create(req.body);
            res.status(201).json({ success: true, data: category, message: 'Category created successfully.' });
        } catch (err) { next(err); }
    },

    update: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid category ID.' });
            const category = await categoryService.update(id, req.body);
            res.json({ success: true, data: category, message: 'Category updated successfully.' });
        } catch (err) { next(err); }
    },

    delete: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id as string, 10);
            if (isNaN(id)) return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid category ID.' });
            await categoryService.delete(id);
            res.json({ success: true, message: 'Category deleted successfully.' });
        } catch (err) { next(err); }
    },

    uploadImage: async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, errorCode: 'NO_FILE', message: 'No image file provided.' });
            const result = await categoryService.uploadImage(req.file);
            res.status(201).json({ success: true, data: { imageUrl: result.secureUrl, optimizedUrl: result.optimizedUrl }, message: 'Image uploaded.' });
        } catch (err) { next(err); }
    },
};
