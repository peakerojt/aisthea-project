import { z } from 'zod';
import { ORDER_TRACKING_STATUSES } from '../../shared/orderTracking.constants';

export const publicTrackingSchema = z.object({
  orderCode: z.string().trim().min(4),
  contact: z.string().trim().min(4),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_TRACKING_STATUSES),
  note: z.string().trim().max(500).optional(),
  eta: z.string().datetime().optional(),
  location: z.string().trim().max(255).optional(),
});
