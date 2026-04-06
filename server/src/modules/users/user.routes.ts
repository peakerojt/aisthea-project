import { Router } from 'express';
import { userController } from './user.controller';
import { authenticateToken, checkRole, requirePermission } from '../../middlewares/auth.middleware';
import {
  createAdminRateLimiters,
  createCustomerMutationRateLimiters,
} from '../../middlewares/security.middleware';
import { upload } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  updateProfileSchema,
  addressSchema,
  addressIdParamSchema,
  bankAccountSchema,
  bankAccountIdParamSchema,
  uploadImagePayloadSchema,
} from '../../utils/schemas/user.validator';

const router = Router();
const profileMutationRateLimiters = createCustomerMutationRateLimiters('user.profile');
const addressMutationRateLimiters = createCustomerMutationRateLimiters('user.address');
const avatarMutationRateLimiters = createCustomerMutationRateLimiters('user.avatar');
const adminUserMutationRateLimiters = createAdminRateLimiters('admin.users');

// All routes require authentication
router.use(authenticateToken);

// ── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', userController.getProfile);
router.put('/profile', ...profileMutationRateLimiters, validate(updateProfileSchema), userController.updateProfile);

// ── Avatar ────────────────────────────────────────────────────────────────────
router.post('/avatar', ...avatarMutationRateLimiters, upload.single('file'), userController.uploadAvatar);
router.delete('/avatar', ...avatarMutationRateLimiters, userController.deleteAvatar);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get('/addresses', userController.getAddresses);
router.post('/addresses', ...addressMutationRateLimiters, validate(addressSchema), userController.createAddress);
router.put(
  '/addresses/:id',
  ...addressMutationRateLimiters,
  validate(addressIdParamSchema, 'params'),
  validate(addressSchema),
  userController.updateAddress,
);
router.delete('/addresses/:id', ...addressMutationRateLimiters, validate(addressIdParamSchema, 'params'), userController.deleteAddress);
router.put(
  '/addresses/:id/default',
  ...addressMutationRateLimiters,
  validate(addressIdParamSchema, 'params'),
  userController.setDefaultAddress,
);

// ── Bank accounts ─────────────────────────────────────────────────────────────
router.get('/bank-accounts', userController.getBankAccounts);
router.post('/bank-accounts', ...addressMutationRateLimiters, validate(bankAccountSchema), userController.createBankAccount);
router.put(
  '/bank-accounts/:id',
  ...addressMutationRateLimiters,
  validate(bankAccountIdParamSchema, 'params'),
  validate(bankAccountSchema),
  userController.updateBankAccount,
);
router.delete(
  '/bank-accounts/:id',
  ...addressMutationRateLimiters,
  validate(bankAccountIdParamSchema, 'params'),
  userController.deleteBankAccount,
);
router.patch(
  '/bank-accounts/:id/default',
  ...addressMutationRateLimiters,
  validate(bankAccountIdParamSchema, 'params'),
  userController.setDefaultBankAccount,
);
router.post(
  '/bank-accounts/upload-qr-image',
  ...addressMutationRateLimiters,
  validate(uploadImagePayloadSchema),
  userController.uploadBankQrImage,
);

// ── Refund benefits ───────────────────────────────────────────────────────────
router.get('/refund-benefits', userController.getRefundBenefits);

// ── Recent orders for profile ─────────────────────────────────────────────────
router.get('/recent-orders', userController.getRecentOrders);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/', requirePermission('VIEW_CUSTOMER'), userController.getAllUsers);
router.patch('/:id/status', requirePermission('EDIT_CUSTOMER'), ...adminUserMutationRateLimiters, userController.updateUserStatus);
router.patch('/:id/role', checkRole(['Admin', 'Super Admin']), ...adminUserMutationRateLimiters, userController.updateUserRole);

export default router;
