import { z } from 'zod';

const EMAIL_JOB_STATUS_VALUES = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] as const;
const TERMINAL_EMAIL_JOB_STATUS_VALUES = ['SENT', 'FAILED'] as const;

const toCsvArray = (value: unknown) => {
  if (value == null || value === '') {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];

  return rawValues
    .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const emailJobIdParamSchema = z.object({
  emailJobId: z.coerce.number().int().positive(),
});

export const listEmailJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  statuses: z.preprocess(
    toCsvArray,
    z.array(z.enum(EMAIL_JOB_STATUS_VALUES)).optional(),
  ),
  eventType: z.string().trim().min(1).max(100).optional(),
  recipient: z.string().trim().min(1).max(255).optional(),
  search: z.string().trim().min(1).max(255).optional(),
});

export const cleanupEmailJobsSchema = z.object({
  olderThanDays: z.coerce.number().int().min(1).max(365).default(30),
  statuses: z.preprocess(
    toCsvArray,
    z.array(z.enum(TERMINAL_EMAIL_JOB_STATUS_VALUES)).optional(),
  ),
});

