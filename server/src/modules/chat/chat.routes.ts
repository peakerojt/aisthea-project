import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { chatController } from './chat.controller';
import { chatRequestSchema } from './chat.validator';

const router = Router();

router.post('/', validate(chatRequestSchema), chatController.send);

export default router;
