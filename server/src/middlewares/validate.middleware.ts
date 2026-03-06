import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod request-validation middleware.
 *
 * Usage:
 *   router.post('/products', validate(createProductSchema), controller.create);
 *
 * Validates req.body by default.
 * For query-string validation pass 'query', for params pass 'params'.
 */
export const validate =
    (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                const issues = (result.error as ZodError).issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));

                // Import logger properly at the top of the file - we'll do this in a sec or just inline require if simpler.
                // Assuming `import { logger } from '../lib/logger'` will be added.
                const { logger } = require('../lib/logger');
                logger.warn(`[Validation Failed] ${req.method} ${req.originalUrl}`, { payload: req[source], issues });

                return res.status(400).json({
                    success: false,
                    statusCode: 400,
                    errorCode: 'VALIDATION_ERROR',
                    message: 'Request validation failed.',
                    details: issues,
                });
            }

            // Attach validated & coerced data back to request
            req[source] = result.data;
            next();
        };
