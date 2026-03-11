import { Router } from 'express';
import { getWeatherHandler } from './weather.controller';

const router = Router();

router.get('/', getWeatherHandler);

export default router;
