import { z } from 'zod';

/** Schema for PATCH /api/items/reorder body */
export const reorderSchema = z.object({
    itemId: z.union([z.string(), z.number()]),
    fromIndex: z.number().int().min(0),
    toIndex: z.number().int().min(0),
});

export type ReorderDto = z.infer<typeof reorderSchema>;
