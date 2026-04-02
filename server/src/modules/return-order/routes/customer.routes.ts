import { Router } from 'express';
import { createCustomerMutationRateLimiters } from '../../../middlewares/security.middleware';
import { RETURN_REQUEST_CREATOR_ROLES } from '../../../shared/role-access';
import { ReturnRequestController } from '../controllers/controller';
import { requireRoles } from './route-guards';

const controller = new ReturnRequestController();
const router = Router();
const createReturnRateLimiters = createCustomerMutationRateLimiters('return-request.create');

router.post('/', requireRoles(RETURN_REQUEST_CREATOR_ROLES), ...createReturnRateLimiters, controller.create);
router.get('/my', controller.myReturns);
router.get('/:id', controller.detail);

export default router;
