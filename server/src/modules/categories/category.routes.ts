import { Router } from 'express';
import { categoryController } from './category.controller';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { cacheMiddleware, invalidateCache, CACHE_TTL } from '../../middlewares/cache.middleware';

const router = Router();

// Public — cache for 30 min
router.get('/tree', cacheMiddleware(CACHE_TTL.CATEGORIES), categoryController.getTree);
router.get('/flat', cacheMiddleware(CACHE_TTL.CATEGORIES), categoryController.getFlat);

// Admin — invalidate cache on mutation
const categoryCacheGuard = (req: any, res: any, next: any) => { invalidateCache('/api/categories'); next(); };
router.post('/', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryCacheGuard, categoryController.create);
router.put('/:id', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryCacheGuard, categoryController.update);
router.delete('/:id', authenticateToken, requirePermission('MANAGE_CATEGORIES'), categoryCacheGuard, categoryController.delete);
router.post('/upload-image', authenticateToken, requirePermission('MANAGE_CATEGORIES'), upload.single('image'), categoryController.uploadImage);

export default router;
