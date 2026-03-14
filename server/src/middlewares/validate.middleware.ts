import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../lib/logger';

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

                logger.warn(`[Validation Failed] ${req.method} ${req.originalUrl}`, { payload: req[source], issues });

                return res.status(422).json({
                    success: false,
                    statusCode: 422,
                    errorCode: 'VALIDATION_ERROR',
                    message: 'Request validation failed.',
                    details: issues,
                });
            }

            // Attach validated & coerced data back to request
            req[source] = result.data;
            next();
        };
