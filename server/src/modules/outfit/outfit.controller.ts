import { Request, Response } from 'express';
import { recommendOutfit } from './outfit.service';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import { getWeatherWithSeason } from '../weather/weather.service';

const profileSchema = z
  .object({
    gender: z.string().trim().max(40).optional(),
    style: z.string().trim().max(80).optional(),
    tolerance: z.enum(['low', 'medium', 'high']).optional(),
    occasion: z.string().trim().max(80).optional(),
  })
  .optional();

const locationSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    hemisphere: z.enum(['north', 'south']).optional(),
  })
  .refine((data) => data.city || (data.lat !== undefined && data.lon !== undefined), {
    message: 'Provide lat/lon or city',
  });

const outfitSchema = z.object({
  location: locationSchema,
  profile: profileSchema,
});

export const recommendOutfitHandler = async (req: Request, res: Response) => {
  try {
    const payload = outfitSchema.parse(req.body);
    const weather = await getWeatherWithSeason({
      lat: payload.location.lat,
      lon: payload.location.lon,
      city: payload.location.city,
      hemisphere: payload.location.hemisphere,
    });
    const recommendation = await recommendOutfit({
      weather,
      profile: payload.profile,
    });
    res.json({ success: true, data: { weather, recommendation } });
  } catch (error) {
    logger.error('Failed to recommend outfit', { error });
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
