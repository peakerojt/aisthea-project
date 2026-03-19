import { Router } from 'express';
import { userController } from './user.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateProfileSchema, addressSchema, addressIdParamSchema } from '../../utils/schemas/user.validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

// ── Avatar ────────────────────────────────────────────────────────────────────
router.post('/avatar', upload.single('file'), userController.uploadAvatar);
router.delete('/avatar', userController.deleteAvatar);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get('/addresses', userController.getAddresses);
router.post('/addresses', validate(addressSchema), userController.createAddress);
router.put('/addresses/:id', validate(addressIdParamSchema, 'params'), validate(addressSchema), userController.updateAddress);
router.delete('/addresses/:id', validate(addressIdParamSchema, 'params'), userController.deleteAddress);
router.put('/addresses/:id/default', validate(addressIdParamSchema, 'params'), userController.setDefaultAddress);

// ── Recent orders for profile ─────────────────────────────────────────────────
router.get('/recent-orders', userController.getRecentOrders);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/', checkRole(['Admin', 'Super Admin']), userController.getAllUsers);
router.patch('/:id/status', checkRole(['Admin', 'Super Admin']), userController.updateUserStatus);
router.patch('/:id/role', checkRole(['Admin', 'Super Admin']), userController.updateUserRole);

export default router;
