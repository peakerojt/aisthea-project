import { Router } from 'express';
import { recommendOutfitHandler } from './outfit.controller';

const router = Router();

router.post('/recommend', recommendOutfitHandler);

export default router;
