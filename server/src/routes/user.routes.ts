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
} from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Avatar routes
router.post('/avatar', uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Address routes
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.put('/addresses/:id/default', setDefaultAddress);

// Orders route
router.get('/recent-orders', getRecentOrders);

export default router;
