import {
  hasAnyRole,
  hasRefundWorkflowAccess,
  hasReturnRequestCreateAccess,
  hasReturnWorkflowAccess,
} from '../../../shared/role-access';
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

export const requireReturnRequestCreateAccess = (req: any, res: any, next: any) => {
  if (!hasReturnRequestCreateAccess(req.user)) {
    return sendForbidden(res);
  }

  return next();
};

export const requireReturnWorkflowAccess = (req: any, res: any, next: any) => {
  if (!hasReturnWorkflowAccess(req.user)) {
    return sendForbidden(res);
  }

  return next();
};

export const requireRefundWorkflowAccess = (req: any, res: any, next: any) => {
  if (!hasRefundWorkflowAccess(req.user)) {
    return sendForbidden(res);
  }

  return next();
};
