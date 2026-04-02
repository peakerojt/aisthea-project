import { hasAnyRole } from '../../../shared/role-access';

export const sendForbidden = (res: any) =>
  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Insufficient access rights' },
  });

export const requireRoles = (allowed: readonly string[]) => (req: any, res: any, next: any) => {
  const canAccess = hasAnyRole(req.user, allowed);
  if (!canAccess) {
    return sendForbidden(res);
  }
  return next();
};
