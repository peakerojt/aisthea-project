/**
 * Backward-compatible re-export.
 * All existing code importing from '../utils/prisma' continues to work.
 * The canonical singleton lives in '../lib/prisma'.
 */
export { prisma } from '../lib/prisma';
