import { Router } from 'express';
import {
    getCategoriesTree,
    getCategoriesFlat,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage,
    upload,
} from '../controllers/category.controller';

const router = Router();

// ─── Read ──────────────────────────────────────────────────────────────────
// IMPORTANT: /tree and /flat must come before /:id to avoid conflicts
router.get('/tree', getCategoriesTree);
router.get('/flat', getCategoriesFlat);

// ─── Image Upload ──────────────────────────────────────────────────────────
router.post('/upload-image', upload.single('file'), uploadCategoryImage);

// ─── Category CRUD ─────────────────────────────────────────────────────────
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
