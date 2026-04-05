import { Router } from 'express';
import { createCustomerMutationRateLimiters } from '../../../middlewares/security.middleware';
import { ReturnRequestController } from '../controllers/controller';
import { requireReturnRequestCreateAccess } from './route-guards';

const controller = new ReturnRequestController();
const router = Router();
const createReturnRateLimiters = createCustomerMutationRateLimiters('return-request.create');

router.post('/', requireReturnRequestCreateAccess, ...createReturnRateLimiters, controller.create);
router.get('/my', controller.myReturns);
router.get('/:id', controller.detail);

export default router;
