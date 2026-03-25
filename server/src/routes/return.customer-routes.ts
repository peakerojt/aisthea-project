import { Router } from 'express';
import {
  getLegacyReturnDetail,
  getMyLegacyReturns,
} from './return.customer-handlers';

const router = Router();

router.get('/my', getMyLegacyReturns);
router.get('/:id', getLegacyReturnDetail);

export default router;
