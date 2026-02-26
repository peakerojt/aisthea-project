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
} from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Avatar routes - supports both file upload and base64 JSON
router.post('/avatar', upload.single('file'), uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.put('/addresses/:id/default', setDefaultAddress);

// Orders route
router.get('/recent-orders', getRecentOrders);

// ─── Admin Routes ────────────────────────────────────────────────────────────
// GET  /api/users            -> List all users with search/filter (Admin only)
// PATCH /api/users/:id/status -> Ban or unban a user              (Admin only)
// PATCH /api/users/:id/role   -> Assign a new role to a user      (Admin only)
router.get('/', getAllUsers);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/role', updateUserRole);

export default router;
