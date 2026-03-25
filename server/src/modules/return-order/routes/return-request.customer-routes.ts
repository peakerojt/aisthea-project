import { Router } from 'express';
import { RETURN_REQUEST_CREATOR_ROLES } from '../../../shared/role-access';
import { ReturnRequestController } from '../controllers/return-request.controller';
import { createReturnRateLimit, requireRoles } from './return-request.route-helpers';

const controller = new ReturnRequestController();
const router = Router();

router.post('/', requireRoles(RETURN_REQUEST_CREATOR_ROLES), createReturnRateLimit, controller.create);
router.get('/my', controller.myReturns);
router.get('/:id', controller.detail);

export default router;
