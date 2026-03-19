import { ZodError } from 'zod';

export type FieldErrorMap = Record<string, string>;

export const mapZodFieldErrors = (error: ZodError): FieldErrorMap => {
  const mapped: FieldErrorMap = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!field || mapped[field]) continue;
    mapped[field] = issue.message;
  }

  return mapped;
};

export const firstFieldError = (errors: FieldErrorMap): string | null => {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
};
