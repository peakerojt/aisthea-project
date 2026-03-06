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

                return res.status(400).json({
                    success: false,
                    errorCode: 'VALIDATION_ERROR',
                    message: 'Request validation failed.',
                    details: issues,
                });
            }

            // Attach validated & coerced data back to request
            req[source] = result.data;
            next();
        };
