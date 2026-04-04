import { hasAnyRole } from '../../../shared/role-access';
import { requirePermission } from '../../../middlewares/auth.middleware';

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

export const requireRolesOrPermission = (
  allowed: readonly string[],
  permissionCode: string,
) => {
  const permissionGuard = requirePermission(permissionCode);

  return (req: any, res: any, next: any) => {
    if (hasAnyRole(req.user, allowed)) {
      return next();
    }

    return permissionGuard(req, res, next);
  };
};
