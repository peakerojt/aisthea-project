import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../lib/logger';

const issueCodeMap: Record<string, string> = {
    invalid_type: 'VALIDATION_INVALID_TYPE',
    too_small: 'VALIDATION_TOO_SMALL',
    too_big: 'VALIDATION_TOO_BIG',
    invalid_format: 'VALIDATION_INVALID_FORMAT',
    invalid_string: 'VALIDATION_INVALID_FORMAT',
    unrecognized_keys: 'VALIDATION_UNKNOWN_FIELD',
    custom: 'VALIDATION_INVALID',
};

const normalizeIssue = (issue: any) => ({
    field: Array.isArray(issue?.path) && issue.path.length > 0 ? issue.path.join('.') : '',
    code: issueCodeMap[issue?.code] ?? 'VALIDATION_INVALID',
});

const extractIssues = (error: ZodError) =>
    error.issues.flatMap((issue: any) => {
        if (issue?.code === 'unrecognized_keys' && Array.isArray(issue.keys)) {
            return issue.keys.map((key: string) => ({
                field: key,
                code: 'VALIDATION_UNKNOWN_FIELD',
                messageKey: 'common:errors.unknownField',
            }));
        }

        return [normalizeIssue(issue)];
    });

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
                const issues = extractIssues(result.error as ZodError);

                logger.warn(`[Validation Failed] ${req.method} ${req.originalUrl}`, {
                    traceId: req.traceId,
                    payload: req[source],
                    issues,
                });

                return res.status(422).json({
                    success: false,
                    statusCode: 422,
                    type: 'VALIDATION',
                    errorCode: 'VALIDATION_ERROR',
                    code: 'VALIDATION_ERROR',
                    messageKey: 'common:errors.validation',
                    field: issues[0]?.field || undefined,
                    details: issues,
                    traceId: req.traceId,
                });
            }

            // Attach validated & coerced data back to request
            req[source] = result.data;
            next();
        };
