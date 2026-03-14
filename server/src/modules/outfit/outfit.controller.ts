import { Request, Response } from 'express';
import { recommendOutfit } from './outfit.service';
import { z } from 'zod';
import { logger } from '../../lib/logger';

const profileSchema = z
  .object({
    gender: z.string().trim().max(40).optional(),
    style: z.string().trim().max(80).optional(),
    tolerance: z.enum(['low', 'medium', 'high']).optional(),
    occasion: z.string().trim().max(80).optional(),
  })
  .optional();

const weatherSchema = z.object({
  locationName: z.string(),
  temperatureC: z.number(),
  humidity: z.number(),
  windSpeedKph: z.number(),
  description: z.string(),
  icon: z.string(),
  weatherCode: z.number(),
  timezone: z.string(),
  localTime: z.string(),
  lat: z.number(),
  lon: z.number(),
});

const outfitSchema = z.object({
  weather: weatherSchema,
  seasonContext: z.string().min(2),
  profile: profileSchema,
});

export const recommendOutfitHandler = async (req: Request, res: Response) => {
  try {
    const payload = outfitSchema.parse(req.body);
    const recommendation = await recommendOutfit(payload);
    res.json({ success: true, data: recommendation });
  } catch (error) {
    logger.error('Failed to recommend outfit', { error });
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
