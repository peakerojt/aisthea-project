import { Router } from 'express';
import {
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getRecentOrders,
    getAllUsers,
    updateUserStatus,
    updateUserRole,
} from '../../controllers/user.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateProfileSchema, addressSchema } from '../../utils/schemas/user.validator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);

// ── Avatar ────────────────────────────────────────────────────────────────────
router.post('/avatar', upload.single('file'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get('/addresses', getAddresses);
router.post('/addresses', validate(addressSchema), createAddress);
router.put('/addresses/:id', validate(addressSchema), updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.put('/addresses/:id/default', setDefaultAddress);

// ── Recent orders for profile ─────────────────────────────────────────────────
router.get('/recent-orders', getRecentOrders);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/', checkRole(['Admin', 'Super Admin']), getAllUsers);
router.patch('/:id/status', checkRole(['Admin', 'Super Admin']), updateUserStatus);
router.patch('/:id/role', checkRole(['Admin', 'Super Admin']), updateUserRole);

export default router;
