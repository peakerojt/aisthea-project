import { Router } from 'express';
import { categoryController } from './category.controller';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Public
router.get('/tree', categoryController.getTree);
router.get('/flat', categoryController.getFlat);

// Admin
router.post('/', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryController.create);
router.put('/:id', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryController.update);
router.delete('/:id', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryController.delete);
router.post('/upload-image', authenticateToken, requirePermission('MANAGE_CATEGORIES'), upload.single('image'), categoryController.uploadImage);

export default router;
