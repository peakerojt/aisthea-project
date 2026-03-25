import { Router } from 'express';
import {
  getAdminReturns,
  patchProcessReturn,
} from '../controllers/return.controller';

const router = Router();

router.get('/', getAdminReturns);
router.patch('/:id/process', patchProcessReturn);

export default router;
