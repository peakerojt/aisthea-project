import { Request, Response } from 'express';
import { getWeatherWithSeason } from './weather.service';
import { logger } from '../../lib/logger';
import { z } from 'zod';

const weatherQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    hemisphere: z.enum(['north', 'south']).optional(),
  })
  .refine((data) => data.city || (data.lat !== undefined && data.lon !== undefined), {
    message: 'Provide lat/lon or city',
  });

export const getWeatherHandler = async (req: Request, res: Response) => {
  try {
    const parsed = weatherQuerySchema.parse(req.query);

    const weather = await getWeatherWithSeason({
      lat: parsed.lat,
      lon: parsed.lon,
      city: parsed.city,
      hemisphere: parsed.hemisphere,
    });

    res.json({ success: true, data: weather });
  } catch (error) {
    logger.error('Failed to get weather', { error });
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
